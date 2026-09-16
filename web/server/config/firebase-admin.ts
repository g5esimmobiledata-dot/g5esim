import admin from 'firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

let isInitialized = false;

function normalizePrivateKey(value: unknown) {
  return String(value || '').replace(/\\n/g, '\n');
}

function serviceAccountFromFile() {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), 'server/config/service-account.json'),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.join(process.cwd(), candidate);
    if (!fs.existsSync(resolved)) continue;

    try {
      const account = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      if (account.project_id && account.client_email && account.private_key) {
        return account;
      }
    } catch (error) {
      console.warn(
        'Firebase Admin service account file could not be loaded:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  return null;
}

export async function initFirebaseAdmin() {
  if (isInitialized) return admin;

  try {
    const [projectId, clientEmail, privateKey] = await Promise.all([
      storage.getSettingByKey('firebase_project_id'),
      storage.getSettingByKey('firebase_client_email'),
      storage.getSettingByKey('firebase_private_key'),
    ]);

    if (projectId?.value && clientEmail?.value && privateKey?.value) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId.value,
            clientEmail: clientEmail.value,
            privateKey: normalizePrivateKey(privateKey.value),
          }),
          databaseURL: `https://${projectId.value}.firebaseio.com`,
        });
      }
      isInitialized = true;
      console.log('Firebase Admin initialized from database settings');
    } else {
      const account = serviceAccountFromFile();
      if (account && !admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: account.project_id,
            clientEmail: account.client_email,
            privateKey: normalizePrivateKey(account.private_key),
          }),
          databaseURL: `https://${account.project_id}.firebaseio.com`,
        });
        isInitialized = true;
        console.log('Firebase Admin initialized from service account file');
      } else if (admin.apps.length) {
        isInitialized = true;
      } else {
        console.warn('Firebase Admin settings missing in database and service account file');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }

  return admin;
}

export const getAdminDb = async () => {
  await initFirebaseAdmin();
  return getDatabase();
};

export const getAdminMessaging = async () => {
  await initFirebaseAdmin();
  if (!admin.apps.length) {
    throw new Error('Firebase Admin is not initialized');
  }
  return getMessaging();
};

export default admin;

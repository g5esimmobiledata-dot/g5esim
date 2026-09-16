import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { queryClient } from "@/lib/queryClient";

let firebaseApp: any = null;

// 🔹 Convert settings array → object
function settingsToObject(settings: any[]) {
  if (!Array.isArray(settings)) return settings;

  return settings.reduce((acc: any, item: any) => {
    acc[item.key] = item.value;
    return acc;
  }, {});
}

// 🔹 Try both admin + public cache
function getSettingsFromCache() {
  return (
    queryClient.getQueryData([
      "/api/admin/settings",
    ]) ||
    queryClient.getQueryData([
      "/api/public/settings",
    ])
  );
}

// 🔹 Build Firebase config
function getFirebaseConfig() {
  const settings: any = getSettingsFromCache();

  if (!settings) return null;

  const obj = settingsToObject(settings);

  if (!obj.firebase_api_key) return null;

  return {
    apiKey: obj.firebase_api_key,
    authDomain: obj.firebase_auth_domain,
    projectId: obj.firebase_project_id,
    storageBucket: obj.firebase_storage_bucket,
    messagingSenderId:
      obj.firebase_messaging_sender_id,
    appId: obj.firebase_app_id,
    measurementId: obj.firebase_measurement_id,
  };
}

// 🔹 Init Firebase safely
export function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  const config = getFirebaseConfig();

  if (!config) {
    console.warn(
      "⚠ Firebase config missing. Ensure settings loaded."
    );
    return null;
  }

  firebaseApp = !getApps().length
    ? initializeApp(config)
    : getApp();

  console.log("🔥 Firebase initialized");

  return firebaseApp;
}

// 🔹 Auth
export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

// 🔹 Google Login
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();

  if (!auth) {
    throw new Error(
      "Firebase not initialized. Settings not loaded."
    );
  }

  const provider = new GoogleAuthProvider();

  return signInWithPopup(auth, provider);
}

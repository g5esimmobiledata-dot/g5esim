import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for macos - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for windows - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux - '
          'you can reconfigure this by running the FlutterFire CLI again.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'CONFIGURE_LOCALLY',
    appId: '1:709705954037:android:9aa6e0b372cc4d53004bbc',
    messagingSenderId: '709705954037',
    projectId: 'g5esim-mobile',
    storageBucket: 'g5esim-mobile.firebasestorage.app',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'CONFIGURE_LOCALLY',
    appId: '1:709705954037:web:9aa6e0b372cc4d53004bbc',
    messagingSenderId: '709705954037',
    projectId: 'g5esim-mobile',
    authDomain: 'g5esim-mobile.firebaseapp.com',
    storageBucket: 'g5esim-mobile.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'CONFIGURE_LOCALLY',
    appId: '1:286465731860:ios:3515ef6bf32fff9e502601',
    messagingSenderId: '709705954037',
    projectId: 'g5esim-mobile',
    storageBucket: 'esimconnect-21d20.firebasestorage.app',
  );
}

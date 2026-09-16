import 'dart:developer';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class LoginController extends GetxController {
  String _status = 'Idle';
  final emailController = TextEditingController();
  final pswdController = TextEditingController();
  final femailfocusnode = FocusNode();
  final pswdfocusnode = FocusNode();
  var isReferralChecked = false;
  var referralCode = '';
  final _firestore = FirebaseFirestore.instance;
  String get status => _status;

  void updateStatus(String newStatus) {
    _status = newStatus;
    update();
  }

  Future<UserCredential?> signInWithApple() async {
    try {
      UserCredential? userCredential;
      final appleProvider = AppleAuthProvider()
        ..addScope('email')
        ..addScope('fullName');

      if (kIsWeb) {
        userCredential = await FirebaseAuth.instance.signInWithPopup(
          appleProvider,
        );
      } else {
        userCredential = await FirebaseAuth.instance.signInWithProvider(
          appleProvider,
        );
      }

      final user = userCredential.user;
      log('Apple Sign-In successful: UID=${user?.uid}, Email=${user?.email}');
      if (user == null) return null;

      // Load existing user doc (if any)
      final docRef = FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid);
      final docSnap = await docRef.get();
      String newEmail = user.email ?? '';
      final newName = user.displayName;
      if (!docSnap.exists) {
        await docRef.set({
          'uid': user.uid,
          'email': newEmail,
          'displayName': newName,
          'createdAt': FieldValue.serverTimestamp(),
        });
      } else {
        final updates = <String, dynamic>{};
        if (newEmail != null && newEmail.isNotEmpty) {
          updates['email'] = newEmail;
        }
        if (newName != null && newName.isNotEmpty) {
          updates['displayName'] = newName;
        }
        if (updates.isNotEmpty) {
          updates['updatedAt'] = FieldValue.serverTimestamp();
          await docRef.update(updates);
          log('User Firestore record updated with new info');
        } else {
          log('No new data to update');
        }
      }

      return userCredential;
    } catch (e) {
      log('Apple Sign-In error: $e');
      return null;
    }
  }

  Future<void> saveUserData(
    String uid,
    String? email,
    String? displayName,
  ) async {
    await _firestore.collection('users').doc(uid).set({
      'email': email,
      'displayName': displayName,
      'authProvider': 'apple',
      'lastLogin': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<Map<String, dynamic>?> getUserData(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    return doc.data();
  }

  bool isValidEmail(String email) {
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    return emailRegex.hasMatch(email);
  }

  Future<UserCredential?> signInWithGoogle() async {
    try {
      final googleSignIn = GoogleSignIn.instance;
      // Force account selection by signing out first
      await googleSignIn.signOut();
      final googleUser = await googleSignIn.authenticate();
      if (googleUser == null) return null;
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      final String? idToken = googleAuth.idToken;
      final authorization = await googleUser.authorizationClient
          .authorizationForScopes(['email', 'profile', 'openid']);
      final String? accessToken = authorization?.accessToken;
      final credential = GoogleAuthProvider.credential(
        accessToken: accessToken,
        idToken: idToken,
      );
      return await FirebaseAuth.instance.signInWithCredential(credential);
    } catch (e) {
      log('Google Sign-In error: $e');
      return null;
    }
  }
}

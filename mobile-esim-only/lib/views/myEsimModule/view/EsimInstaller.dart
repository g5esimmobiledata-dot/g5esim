// import 'dart:developer';
// import 'package:flutter/material.dart';
// import 'package:android_esim_installer/android_esim_installer.dart';
// import 'package:qr_flutter/qr_flutter.dart';

// class EsimInstaller {
//   /// 🚀 Try installing eSIM profile or show QR fallback
//   static Future<void> activateEsim(BuildContext context, String lpaCode) async {
//     if (lpaCode.isEmpty || !lpaCode.startsWith("LPA:")) {
//       _showErrorDialog(context, "❌ Invalid LPA code: $lpaCode");
//       return;
//     }

//     try {
//       await AndroidEsimInstaller.install(
//         activationCode: lpaCode,
//         appPackageName: "com.g5esim.app", // ⚠️ Your actual package name
//         onInstalling: (callback) {
//           _showSnackbar(context, "Installing eSIM... $callback");
//         },
//         onResolving: (callback) {
//           log("🟡 Resolving: $callback");
//           _showSnackbar(
//             context,
//             "User action required to confirm eSIM installation",
//           );
//         },
//         onSuccess: (callback) {
//           log("✅ eSIM installed successfully!");
//           _showSnackbar(context, "eSIM installed successfully!");
//         },
//         onError: (callback) {
//           log("❌ Installation failed: $callback");
//           _showErrorDialog(
//             context,
//             "eSIM installation failed: $callback",
//           );
//           // _showQrDialog(context, lpaCode); // fallback
//         },
//       );
//     } catch (e) {
//       log("❌ Exception during eSIM installation: $e");
//      // _showQrDialog(context, lpaCode);
//     }
//   }

//   /// 📸 QR fallback dialog
//   static void _showQrDialog(BuildContext context, String lpaCode) {
//     showDialog(
//       context: context,
//       builder: (context) {
//         return AlertDialog(
//           title: const Text("Scan this QR to install eSIM"),
//           content: Column(
//             mainAxisSize: MainAxisSize.min,
//             children: [
//               QrImageView(data: lpaCode, version: QrVersions.auto, size: 200),
//               const SizedBox(height: 12),
//               const Text(
//                 "If automatic installation doesn’t start, open eSIM settings and scan this QR.",
//                 textAlign: TextAlign.center,
//                 style: TextStyle(fontSize: 13, color: Colors.grey),
//               ),
//             ],
//           ),
//           actions: [
//             TextButton(
//               onPressed: () => Navigator.pop(context),
//               child: const Text("Close"),
//             ),
//           ],
//         );
//       },
//     );
//   }

//   /// Generic snackbar
//   static void _showSnackbar(BuildContext context, String message) {
//     ScaffoldMessenger.of(
//       context,
//     ).showSnackBar(SnackBar(content: Text(message)));
//   }

//   /// Error dialog
//   static void _showErrorDialog(BuildContext context, String message) {
//     showDialog(
//       context: context,
//       builder: (context) => AlertDialog(
//         title: const Text("Error"),
//         content: Text(message),
//         actions: [
//           TextButton(
//             onPressed: () => Navigator.pop(context),
//             child: const Text("OK"),
//           ),
//         ],
//       ),
//     );
//   }
// }

// import 'dart:convert';
// import 'dart:developer';
// import 'package:flutter/material.dart';
// import 'package:flutter_stripe/flutter_stripe.dart';
// import 'package:esimconnect/views/packageModule/packagesList/model/ordernowModel.dart';

// import '../global.dart' as global;

// typedef PaymentSuccessCallback = void Function();
// typedef PaymentFailureCallback = void Function(Map<String, dynamic> errorData);

// class StripeService {
//   StripeService._();
//   static final StripeService _instance = StripeService._();
//   static StripeService get instance => _instance;

//   Future<void> openPayment({
//     required BuildContext context,
//     Data? data,
//     required PaymentSuccessCallback onSuccess,
//     required PaymentFailureCallback onFailure,
//   }) async {
//     // if (data == null || data.clientSecret == null) {
//     //   global.showToastMessage(message: "Stripe payment data is incomplete.",  toastificationStyle: ToastificationStyle.fillColored);
//     //   onFailure({'message': 'Payment data incomplete'});
//     //   return;
//     // }

//     try {
//       Stripe.publishableKey =
//           "pk_test_51Ry5KK74FnUP6weT399cLIDdcCBWhpjWmXLocmgLUiKLZfr65EUffqu6uUdgriGHExfFroFvLTzLkAlV6gCL1TXk0096kTqcJr";
//       print("open payment gateway");
//       // 1. Initialize the Payment Sheet
//       await Stripe.instance.initPaymentSheet(
//         paymentSheetParameters: SetupPaymentSheetParameters(
//           merchantDisplayName: 'esimconnect',
//           paymentIntentClientSecret:
//               "CONFIGURE_LOCALLY",
//           style: Theme.of(context).brightness == Brightness.dark
//               ? ThemeMode.dark
//               : ThemeMode.light,
//         ),
//       );

//       await Stripe.instance.presentPaymentSheet();

//       onSuccess();
//     } on StripeException catch (e) {
//       final errorData = {
//         "code": e.error.code.toString(),
//         "message": e.error.message ?? '',
//         "type": e.error.type?.toString(),
//         "localizedMessage": e.error.localizedMessage ?? '',
//       };
//       log('Stripe error: ${jsonEncode(errorData)}');
//       onFailure(errorData); // Trigger the failure callback with error details
//       global.showToastMessage(
//         message: 'Payment failed: ${e.error.localizedMessage}',
//       );
//     } catch (e) {
//       log('Stripe general error: ${e.toString()}');
//       if (e is StripeConfigException) {
//         log('🔴 Stripe Error Code: ${e.message}');
//         log('🔴 Stripe Error Type: ${e.runtimeType}');
//       }

//       onFailure({'message': 'An unexpected error occurred during payment.'});
//       global.showToastMessage(message: "An error occurred during payment.");
//     }
//   }
// }

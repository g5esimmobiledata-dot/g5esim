// import 'dart:convert';
// import 'dart:developer';
// import 'package:razorpay_flutter/razorpay_flutter.dart';
// import 'package:esimconnect/views/packageModule/packagesList/model/ordernowModel.dart';
// import '../global.dart' as global;

// typedef PaymentSuccessCallback = void Function(PaymentSuccessResponse response);
// typedef PaymentFailureCallback = void Function(PaymentFailureResponse response);

// class RazorpayService {
//   late Razorpay _razorpay;
//   RazorpayService._();
//   static final RazorpayService _instance = RazorpayService._();
//   static RazorpayService get instance => _instance;
//   void init({
//     required PaymentSuccessCallback onSuccess,
//     required PaymentFailureCallback onFailure,
//   }) {
//     _razorpay = Razorpay();
//     _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, onSuccess);
//     _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, onFailure);
//   }

//   void dispose() {
//     _razorpay.clear();
//   }

//   void openPayment({required Data? data, required dynamic packageInfo}) {
//     if (data == null) {
//       global.showToastMessage(message: "Payment data is not available.");
//       return;
//     }
//     final amount = (double.tryParse(packageInfo.netPrice.toString()) ?? 0);
//     final options = {
//       'key': data.gatewayKey,
//       'amount': (amount * 100).toInt(),
//       'name': data.name ?? 'esimconnect',
//       'description': data.description,
//       'order_id': data.gatewayOrderId,
//       'currency': data.currency?.toUpperCase() ?? 'INR',
//       'prefill': {
//         'contact': data.phone ?? '1234567890',
//         'email': data.email ?? '0r2tP@esimconnect.com',
//       },
//       'method': {'upi': true, 'flow': 'intent'},
//       'external': {
//         'wallets': ['paytm', 'phonepe', 'gpay'],
//       },
//     };
//     log(
//       '🧾 Razorpay Options:\n${const JsonEncoder.withIndent('  ').convert(options)}',
//     );
//     try {
//       _razorpay.open(options);
//     } catch (e) {
//       global.showToastMessage(message: "Error initiating payment.");
//     }
//   }
// }

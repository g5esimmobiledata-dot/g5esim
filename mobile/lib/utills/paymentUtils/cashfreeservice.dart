// import 'dart:developer';
// import 'package:flutter_cashfree_pg_sdk/api/cferrorresponse/cferrorresponse.dart';
// import 'package:flutter_cashfree_pg_sdk/api/cfpayment/cfdropcheckoutpayment.dart';
// import 'package:flutter_cashfree_pg_sdk/api/cfpaymentgateway/cfpaymentgatewayservice.dart';
// import 'package:flutter_cashfree_pg_sdk/api/cfsession/cfsession.dart';
// import 'package:flutter_cashfree_pg_sdk/utils/cfenums.dart';
// import 'package:flutter_cashfree_pg_sdk/utils/cfexceptions.dart';
// import 'package:esimconnect/views/packageModule/packagesList/model/ordernowModel.dart';
// import '../global.dart' as global;

// // ✅ Typedefs for callbacks
// typedef PaymentSuccessCallback = void Function(String orderId);
// typedef PaymentFailureCallback =
//     void Function(CFErrorResponse error, String orderId);

// class CashfreeService {
//   late final CFPaymentGatewayService _cfPaymentGateway;

//   // Private constructor
//   CashfreeService._internal() {
//     _cfPaymentGateway = CFPaymentGatewayService();
//   }

//   // Singleton instance
//   static final CashfreeService _instance = CashfreeService._internal();
//   static CashfreeService get instance => _instance;

//   /// Open Cashfree Drop Checkout Payment
//   void openPayment({
//     required Data? data,
//     required PaymentSuccessCallback onSuccess,
//     required PaymentFailureCallback onFailure,
//     bool isSandbox = true, // <-- configurable environment
//   }) {
//     if (data == null ||
//         data.gatewayOrderId == null ||
//         data.payment_session_id == null) {
//       return;
//     }
//     final String orderId = data.gatewayOrderId.toString();
//     final String paymentSessionId = data.payment_session_id.toString();
//     CFSession? session;
//     try {
//       session = CFSessionBuilder()
//           .setOrderId(orderId)
//           .setPaymentSessionId(paymentSessionId)
//           .setEnvironment(
//             isSandbox ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION,
//           )
//           .build();
//     } on CFException catch (e) {
//       log("❌ Error creating CFSession: ${e.message}");
//       global.showToastMessage(message: "Error creating payment session.");
//       return;
//     }

//     // ✅ Attach callbacks once
//     _cfPaymentGateway.setCallback(
//       (successOrderId) {
//         log("✅ Payment success for orderId: $successOrderId");
//         onSuccess(successOrderId);
//       },
//       (error, failedOrderId) {
//         log(
//           "❌ Payment failed for orderId: $failedOrderId "
//           "Code: ${error.getCode()} "
//           "Status: ${error.getStatus()} "
//           "Message: ${error.getMessage()}",
//         );
//         onFailure(error, failedOrderId);
//       },
//     );

//     // Start Payment
//     final cfDropCheckoutPayment = CFDropCheckoutPaymentBuilder()
//         .setSession(session)
//         .build();

//     _cfPaymentGateway.doPayment(cfDropCheckoutPayment);
//   }
// }

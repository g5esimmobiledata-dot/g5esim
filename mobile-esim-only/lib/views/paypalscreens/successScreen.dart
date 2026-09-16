import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get_core/src/get_main.dart';
import 'package:get/get_navigation/src/extension_navigation.dart';

import '../../../../../core/bloc/api_state.dart';
import '../../../../../utills/global.dart' as global;
import '../authModule/model/usermodel.dart';
import '../navbarModule/views/bottomNavBarScreen.dart';
import 'confrimPaymentEvent.dart';
import 'confrimPaymentbloc.dart';

class PaymentSuccessScreen extends StatefulWidget {
  final String paymentId;
  final String packageId;
  final String userId;
  bool isGuest;
  String guestEmail;
  String guestAccessToken;
  bool fromGiftCard;
  String amount;
  String currency;
  String recipientEmail;
  String recipientName;
  String message;

  PaymentSuccessScreen({
    super.key,
    required this.paymentId,
    required this.packageId,
    required this.userId,
    required this.isGuest,
    required this.guestEmail,
    this.guestAccessToken = '',
    this.fromGiftCard = false,
    this.amount = "",
    this.currency = "",
    this.recipientEmail = "",
    this.recipientName = "",
    this.message = "",
  });

  @override
  State<PaymentSuccessScreen> createState() => _PaymentSuccessScreenState();
}

class _PaymentSuccessScreenState extends State<PaymentSuccessScreen> {
  @override
  void initState() {
    super.initState();

    /// 🔥 CALL API WHEN SCREEN LOADS
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<Confrimpaymentbloc>().add(
        Confrimpaymentevent(
          orderId: widget.paymentId,
          packageId: widget.packageId,
          userId: widget.userId,
          isGuest: widget.isGuest,
          guestEmail: widget.guestEmail,
          guestAccessToken: widget.guestAccessToken,
          fromGiftCard: widget.fromGiftCard,
          amount: widget.amount,
          currency: widget.currency,
          recipientEmail: widget.recipientEmail,
          recipientName: widget.recipientName,
          message: widget.message,
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocListener<Confrimpaymentbloc, ApiState<LoginModel>>(
        listener: (context, state) {
          if (state is ApiLoading) {
            print("⏳ Confirming Payment...");
          }

          if (state is ApiSuccess) {
            print("✅ Payment Confirmed API Hit");
            widget.fromGiftCard
                ? global.showToastMessage(
                    message: tr("Gift Created successfully."),
                  )
                : global.showToastMessage(
                    message: tr("Order successfully completed."),
                  );
            widget.isGuest || widget.fromGiftCard
                ? Get.off(() => BottomNavigationBarScreen(index: 0))
                : Get.off(() => BottomNavigationBarScreen(index: 3));
          }

          if (state is ApiFailure) {
            print("❌ Error: ${state.error}");
            global.showToastMessage(message: tr("Payment Failed"));
            Get.off(() => BottomNavigationBarScreen(index: 0));
          }
        },
        child: Center(child: Text("Payment Confirming..")),
      ),
    );
  }
}

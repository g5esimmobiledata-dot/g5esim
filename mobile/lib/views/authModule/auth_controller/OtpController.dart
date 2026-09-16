import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/state_manager.dart';

class OtpController extends GetxController {
  String _status = 'Idle';
  final emailController = TextEditingController();
  final pinEditingControllerlogin = TextEditingController();
  final focusnode = FocusNode();
  final femailfocusnode = FocusNode();
  Timer? countdownTimer;
  int secondsRemaining = 600;

  String get status => _status;

  void updateStatus(String newStatus) {
    _status = newStatus;
    update();
  }

  void startCountdown() {
    countdownTimer?.cancel();
    secondsRemaining = 600;
    countdownTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      if (secondsRemaining > 0) {
        secondsRemaining--;
        update();
      } else {
        timer.cancel();
      }
    });
    update();
  }

  String get timerText {
    final minutes = (secondsRemaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (secondsRemaining % 60).toString().padLeft(2, '0');
    return "$minutes:$seconds";
  }

  void resetTimerAndResendOtp() {
    secondsRemaining = 300;
    countdownTimer?.cancel();
    pinEditingControllerlogin.clear();
    startCountdown();
  }

  @override
  void dispose() {
    countdownTimer?.cancel();
    emailController.dispose();
    femailfocusnode.dispose();
    super.dispose();
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';

class MyESimController extends GetxController {
  bool? isEsimSupported;
  bool isLoading = false;
  String installationMessage = '';
  String instructions = '';
  final eSIMCodeController = TextEditingController();

  @override
  void dispose() {
    eSIMCodeController.dispose();
    super.dispose();
  }
}

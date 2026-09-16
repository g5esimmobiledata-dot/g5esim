// Controller for OTP dialog (optional, for managing state)
import 'package:get/get.dart';

class OtpDialogController extends GetxController {
  var currentIndex = 0.obs;

  void setCurrentIndex(int index) {
    currentIndex.value = index;
  }
}

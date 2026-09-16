import 'package:get/get.dart';

class HomeController extends GetxController {
  int bannerActiveIndex = 0;
  List<bool> isSelected = [true, false];
  int switchIndex = 0;

  void refreshDataPack() {
    update(); // This will trigger GetBuilder rebuild
  }
}

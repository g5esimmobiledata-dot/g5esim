// ignore_for_file: file_names
//packages
import 'package:esimconnect/views/authModule/auth_controller/LoginController.dart';
import 'package:esimconnect/views/authModule/auth_controller/OtpController.dart';
import 'package:esimconnect/views/homeModule/controller/homeController.dart';
import 'package:esimconnect/views/onBoardModule/controller/onboardController.dart';
import 'package:get/get.dart';
import '../../views/authModule/auth_controller/OtpDialogController.dart';
import '../../views/homeModule/getUsageModule/controller/currencyController.dart';
import '../../views/packageModule/packagesList/controller/packagelistcontorller.dart';
import '../../views/packageModule/regionsList/controller/regionalcontroller.dart';
import '../../views/profileMoulde/historyOrdermodule/controller/orderhistoryController.dart';

class NetworkBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<OrderHistoryController>(
      () => OrderHistoryController(),
      fenix: true,
    );

    Get.lazyPut<PackageListController>(
      () => PackageListController(),
      fenix: true,
    );
    Get.lazyPut<LoginController>(() => LoginController(), fenix: true);
    Get.lazyPut<OtpController>(() => OtpController(), fenix: true);
    Get.lazyPut<HomeController>(() => HomeController(), fenix: true);
    Get.lazyPut<OnBoardController>(() => OnBoardController(), fenix: true);
    Get.lazyPut<RegionalListController>(
      () => RegionalListController(),
      fenix: true,
    );
    Get.lazyPut<CurrencyController>(() => CurrencyController(), fenix: true);
    Get.lazyPut<OtpDialogController>(() => OtpDialogController(), fenix: true);
  }
}

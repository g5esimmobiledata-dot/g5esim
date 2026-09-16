// controllers/currency_controller.dart
import 'package:get/get.dart';
import '../../../../utills/global.dart' as global;

class CurrencyController extends GetxController {
  static CurrencyController get to => Get.find();
  RxString activeCurrency = 'USD'.obs;
  RxString activeCurrencySymbol = '\$'.obs;
  Future<void> updateCurrency(
    String currencyCode,
    String currencySymbol,
  ) async {
    activeCurrency.value = currencyCode;
    activeCurrencySymbol.value = currencySymbol;
    global.activeCurrencysymbol = currencyCode;
    global.activeCurrencysymbol = currencySymbol;
    update();
  }
}

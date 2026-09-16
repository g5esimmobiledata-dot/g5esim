import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_storekit/store_kit_wrappers.dart';

class GPaymentUtils {
  final InAppPurchase _inAppPurchase = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;

  final void Function(String message) onMessage;
  final void Function(PurchaseDetails purchaseDetails) onPurchaseVerified;
  final void Function() onPurchasePending;
  final void Function(PurchaseDetails purchaseDetails) onPurchasedError;

  GPaymentUtils({
    required this.onMessage,
    required this.onPurchaseVerified,
    required this.onPurchasePending,
    required this.onPurchasedError,
  });

  /// Initializes the purchase stream listener.
  void initialize() {
    final Stream<List<PurchaseDetails>> purchaseUpdated =
        _inAppPurchase.purchaseStream;
    _subscription = purchaseUpdated.listen(
      _onPurchaseUpdate,
      onDone: () => _subscription?.cancel(),
      onError: (error) => onMessage('In-app purchase error: $error'),
    );
  }

  /// Restores previous purchases.
  Future<void> restorePurchases() async {
    try {
      await _inAppPurchase.restorePurchases();
    } catch (e) {
      if (kDebugMode) print('Error restoring purchases: $e');
    }
  }

  /// Disposes the subscription.
  void dispose() {
    _subscription?.cancel();
  }

  void _onPurchaseUpdate(List<PurchaseDetails> purchaseDetailsList) {
    for (final purchaseDetails in purchaseDetailsList) {
      switch (purchaseDetails.status) {
        case PurchaseStatus.pending:
          onPurchasePending();
          break;
        case PurchaseStatus.canceled:
          onMessage('Purchase was canceled.');
          onPurchasedError(purchaseDetails);
          break;
        case PurchaseStatus.error:
          final errorMessage =
              purchaseDetails.error?.message ?? 'Unknown error';
          onMessage('Payment failed: $errorMessage');
          onPurchasedError(purchaseDetails);

          if (errorMessage.contains("You already own this item")) {
            restorePurchases();
          }
          break;
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          onPurchaseVerified(purchaseDetails);
          if (purchaseDetails.pendingCompletePurchase) {
            _inAppPurchase.completePurchase(purchaseDetails);
          }
          break;
      }
    }
  }

  /// Initiates the purchase flow for a consumable product.
  Future<void> buyConsumableProduct(String productId) async {
    productId = productId.toLowerCase();
    if (kDebugMode) print('🔹 Starting purchase for ID: $productId');

    final bool available = await _inAppPurchase.isAvailable();
    if (!available) {
      onMessage(
        'Store is currently unavailable. Please check your internet or store account.',
      );
      return;
    }
    final String targetId = productId.trim();
    try {
      if (!kIsWeb && Platform.isIOS) {
        final iosAddition = _inAppPurchase
            .getPlatformAddition<InAppPurchaseStoreKitPlatformAddition>();
        await iosAddition.setDelegate(_PaymentQueueDelegate());
      }

      final ProductDetailsResponse response = await _inAppPurchase
          .queryProductDetails({targetId});

      if (response.error != null) {
        if (kDebugMode) print('❌ Product query error: ${response.error}');
        onMessage('Failed to fetch product details.');
        return;
      }

      if (response.notFoundIDs.contains(targetId) ||
          response.productDetails.isEmpty) {
        if (kDebugMode) print('❌ Product not found: $targetId');
        onMessage('Item not currently available in store.');
        return;
      }

      final ProductDetails productDetails = response.productDetails.first;

      if (kDebugMode) {
        print(
          '✅ Found product: ${productDetails.title} (ID: ${productDetails.id})',
        );
      }

      final PurchaseParam purchaseParam = PurchaseParam(
        productDetails: productDetails,
      );

      final bool launched = await _inAppPurchase.buyConsumable(
        purchaseParam: purchaseParam,
      );

      if (!launched) {
        onMessage('Could not initiate purchase flow.');
      }
    } catch (e, stackTrace) {
      if (kDebugMode) {
        print('❌ Fatal Error during IAP: $e');
        print(stackTrace);
      }
      onMessage('Internal error during purchase: $e');
    }
  }
}

/// iOS-specific payment queue delegate.
class _PaymentQueueDelegate implements SKPaymentQueueDelegateWrapper {
  @override
  bool shouldContinueTransaction(
    SKPaymentTransactionWrapper transaction,
    SKStorefrontWrapper storefront,
  ) => true;

  @override
  bool shouldShowPriceConsent() => false;
}

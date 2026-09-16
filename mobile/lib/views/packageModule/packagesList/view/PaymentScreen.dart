// ignore_for_file: must_be_immutable, deprecated_member_use

import 'dart:async';
import 'dart:developer';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/views/navbarModule/bloc/navbar_bloc.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/bloc/api_state.dart';
import '../../../myEsimModule/model/EsimListModel.dart';
import '../../../myEsimModule/myesimbloc/fetch_esim_event.dart';
import '../../../myEsimModule/myesimbloc/fetch_esim_list_bloc.dart';
import '../../../navbarModule/views/bottomNavBarScreen.dart';
import '../../../profileMoulde/giftCardModule/bloc/GiftCardHistoryevent.dart';
import '../../../profileMoulde/giftCardModule/bloc/GiftHistoryBloc.dart';
import '../../../profileMoulde/giftCardModule/views/viewGiftCardHistory.dart';

class PaymentScreen extends StatefulWidget {
  String url;
  String paymentMethod;
  bool fromGiftPurchase;
  final bool returnResult;
  PaymentScreen({
    super.key,
    required this.url,
    required this.paymentMethod,
    this.fromGiftPurchase = false,
    this.returnResult = false,
  });
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  late InAppWebViewController inappController;
  final navController = Get.find<BottomNavController>();
  bool _paymentHandled = false;
  final userService = UserService.to;

  @override
  void initState() {
    super.initState();
    log('payment url ${widget.url} and payment mode ${widget.paymentMethod}');
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (!_paymentHandled) {
          _handlePaymentCancelled();
        }
        return false;
      },
      child: BlocListener<FetchEsimListbloc, ApiState<EsimListModel>>(
        listener: (context, state) {
          if (state is ApiSuccess<EsimListModel>) {
            if (widget.fromGiftPurchase) {
              context.read<GiftHistoryBloc>().add(GiftHistoryevent());
            }
            log('Esim List fetched after payment ${state.data.message}');
            (userService.currentUserData == null ||
                    userService.currentUserData!.data!.token == null)
                ? Get.off(() => BottomNavigationBarScreen(index: 0))
                : (widget.fromGiftPurchase
                      ? Get.off(
                          () => Viewgiftcardhistory(),
                          preventDuplicates: true,
                        )
                      : Get.off(() => BottomNavigationBarScreen(index: 3)));
          }
          if (state is ApiFailure) {
            log('payment List Error: ${state.error}');
            (userService.currentUserData == null ||
                    userService.currentUserData!.data!.token == null)
                ? Get.off(() => BottomNavigationBarScreen(index: 0))
                : Get.off(() => BottomNavigationBarScreen(index: 3));
          }
        },

        child: Scaffold(
          backgroundColor: AppColors.scaffoldbackgroudColor,
          appBar: PreferredSize(
            preferredSize: const Size.fromHeight(56),
            child: AppBar(
              leading: SizedBox(),
              title: Text("Payment").tr(),
              actions: [
                InkWell(
                  onTap: () async {
                    bool? confirm = await showDialog<bool>(
                      context: context,
                      barrierDismissible: false,
                      builder: (BuildContext context) => Dialog(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16.0),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.warning_rounded,
                                color: Colors.amber,
                                size: 48,
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                "Cancel",
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.normal,
                                ),
                              ).tr(),
                              const SizedBox(height: 12),
                              const Text(
                                "Do you want to cancel the payment? This action cannot be undone.",
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey),
                              ).tr(),
                              const SizedBox(height: 24),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: () =>
                                          Navigator.pop(context, false),
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 14,
                                        ),
                                      ),
                                      child: const Text("Continue").tr(),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: () {
                                        Navigator.pop(context, true);
                                        Navigator.pop(context, true);
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.red.shade600,
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 14,
                                        ),
                                      ),
                                      child: const Text("Cancel").tr(),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );

                    if (confirm == true && mounted) {
                      _handlePaymentCancelled();
                    }
                  },
                  child: Container(
                    padding: EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      "Cancel Payment",
                      style: TextStyle(fontSize: 10, color: Colors.white),
                    ).tr(),
                  ),
                ),
                SizedBox(width: 10),
              ],
            ),
          ),
          body: InAppWebView(
            initialUrlRequest: URLRequest(url: WebUri(widget.url)),
            initialSettings: InAppWebViewSettings(
              cacheEnabled: true,
              javaScriptEnabled: true,
              javaScriptCanOpenWindowsAutomatically: true,
              useShouldOverrideUrlLoading: true,

              userAgent:
                  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
            ),

            onReceivedError: (controller, request, error) {
              log('WebView error: ${error.toString()}');
            },
            onLoadResource: (controller, resource) {
              log('onLoadResource : $resource');
            },
            onLoadStart: (controller, url) {
              log('start url: ${url.toString()}');
            },
            onReceivedHttpError: (controller, request, error) {
              log('http error: ${error.toString()}');
            },
            shouldOverrideUrlLoading: (controller, navigationAction) async {
              final url = navigationAction.request.url.toString();
              log('shouldOverrideUrlLoading: $url');

              // Handle external payment apps (UPI, etc.)
              if (url.startsWith('upi://') ||
                  url.startsWith('intent://') ||
                  url.startsWith('tez://') ||
                  url.startsWith('paytmmp://') ||
                  url.startsWith('phonepe://') ||
                  url.startsWith('gpay://')) {
                try {
                  await launchUrl(
                    Uri.parse(url),
                    mode: LaunchMode.externalApplication,
                  );
                } catch (e) {
                  log('Failed to launch external app: $e');
                }
                return NavigationActionPolicy.CANCEL;
              }

              // ✅  Razorpay
              if (widget.paymentMethod == 'razorpay') {
                if (url.contains('redirect_status=succeeded')) {
                  log('✅ redirect status $url ');
                  if (!_paymentHandled && mounted) {
                    _paymentHandled = true;
                    await _handlePaymentSuccess(controller);
                  }
                  return NavigationActionPolicy.CANCEL;
                }
                // Check if payment failed
                else if (url.contains('redirect_status=failed') ||
                    url.contains('redirect_status=cancelled')) {
                  log(
                    '❌ Razorpay payment FAILED - redirect_status=failed/cancelled found',
                  );
                  if (!_paymentHandled && mounted) {
                    _paymentHandled = true;
                    _handlePaymentCancelled();
                  }
                  return NavigationActionPolicy.CANCEL;
                }
                // Keep checkout navigation alive until redirect status appears.
                if (url.startsWith('http')) {
                  return NavigationActionPolicy.ALLOW;
                }
                return NavigationActionPolicy.CANCEL;
              }

              //  Stripe success/cancel
              if (widget.paymentMethod == 'stripe') {
                if (url.contains('redirect_status=succeeded') ||
                    url.contains('payment_intent=pi_')) {
                  return NavigationActionPolicy.ALLOW;
                }

                if (url.contains('redirect_status=failed') ||
                    url.contains('redirect_status=canceled')) {
                  if (!_paymentHandled && mounted) {
                    _paymentHandled = true;
                    _handlePaymentCancelled();
                  }
                  return NavigationActionPolicy.CANCEL;
                }
              }

              // Block admin panel
              if (url.contains('/admin')) {
                return NavigationActionPolicy.CANCEL;
              }

              // Allow all HTTP/HTTPS URLs
              if (url.startsWith('http')) {
                return NavigationActionPolicy.ALLOW;
              }

              return NavigationActionPolicy.CANCEL;
            },

            onLoadStop: (controller, url) async {
              final currentUrl = url.toString();
              log('onLoadStop: $currentUrl');

              if (_paymentHandled) return;

              // Check for Stripe success redirect specifically
              if (currentUrl.contains('redirect_status=succeeded') ||
                  currentUrl.contains('status=success') ||
                  currentUrl.contains('success=true') ||
                  (currentUrl.contains('payment_intent=pi_') &&
                      currentUrl.contains('/order/processing'))) {
                if (!_paymentHandled && mounted) {
                  _paymentHandled = true;
                  await _handlePaymentSuccess(controller);
                }
                return;
              }

              // Check for failure redirects
              if (currentUrl.contains('redirect_status=failed') ||
                  currentUrl.contains('redirect_status=canceled') ||
                  currentUrl.contains('redirect_status=cancelled') ||
                  currentUrl.contains('status=failed') ||
                  currentUrl.contains('status=cancel')) {
                if (!_paymentHandled && mounted) {
                  _paymentHandled = true;
                  _handlePaymentCancelled();
                }
                return;
              }

              // Check page content for payment status
              final pageSource = await controller.getHtml();

              // Look for success indicators
              if (pageSource != null) {
                if (pageSource.contains('Payment Successful') ||
                    pageSource.contains('payment-success') ||
                    pageSource.contains('Thank you for your purchase') ||
                    pageSource.contains('Your payment was successful')) {
                  if (!_paymentHandled && mounted) {
                    _paymentHandled = true;
                    await _handlePaymentSuccess(controller);
                  }
                }
                // Look for failure indicators
                else if (pageSource.contains('Payment Failed') ||
                    pageSource.contains('payment-failed') ||
                    pageSource.contains('Your payment was not successful')) {
                  if (!_paymentHandled && mounted) {
                    _paymentHandled = true;
                    _handlePaymentCancelled();
                  }
                }
              }

              // Check URL for payment status
              if (currentUrl.contains('/payment-status') ||
                  currentUrl.contains('/checkout/success') ||
                  currentUrl.contains('/order/confirmed')) {
                if (!_paymentHandled && mounted) {
                  _paymentHandled = true;
                  await _handlePaymentSuccess(controller);
                }
              } else if (currentUrl.contains('/checkout/failed') ||
                  currentUrl.contains('/payment/failed')) {
                if (!_paymentHandled && mounted) {
                  _paymentHandled = true;
                  _handlePaymentCancelled();
                }
              }
            },
            onProgressChanged: (controller, progress) {
              if (progress == 100) {
                log('Page fully loaded');
              }
            },
            onWebViewCreated: (webviewcontroller) {
              inappController = webviewcontroller;
              log('onWebViewCreated');
            },
          ),
        ),
      ),
    );
  }

  Future<void> _handlePaymentSuccess(InAppWebViewController controller) async {
    if (widget.returnResult) {
      if (mounted) {
        Get.back(
          result: {
            'success': true,
            'paymentMethod': widget.paymentMethod,
            'url': widget.url,
          },
        );
      }
      return;
    }
    _cleanupAndNavigate(message: 'Payment completed successfully');
  }

  void _handlePaymentCancelled() {
    if (_paymentHandled) return;
    _paymentHandled = true;

    if (widget.returnResult) {
      if (mounted) {
        Get.back(
          result: {
            'success': false,
            'paymentMethod': widget.paymentMethod,
            'url': widget.url,
          },
        );
      }
      return;
    }

    _cleanupAndNavigate(message: 'Payment cancelled');
  }

  void _cleanupAndNavigate({String message = ''}) {
    if (mounted) {
      context.read<FetchEsimListbloc>().add(fetchEsimEvent());
    }
    // if (message.isNotEmpty) {
    //   global.showToastMessage(message: message);
    // }
  }
}

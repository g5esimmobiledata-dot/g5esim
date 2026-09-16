import 'dart:convert';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/services/UserModuleAccessService.dart';
import 'package:esimconnect/views/homeModule/bannersModule/bloc/banner_bloc.dart';
import 'package:esimconnect/views/homeModule/bannersModule/bloc/banner_event.dart';
import 'package:esimconnect/views/homeModule/bannersModule/view/bannersList.dart';
import 'package:esimconnect/views/homeModule/datapackModule/bloc/datapack_bloc.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/bottomContainer.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/regionalPlans.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/SwichDataTab.dart';
import 'package:esimconnect/views/homeModule/popularModule/popularbloc/mostpopularbloc.dart';
import 'package:esimconnect/views/homeModule/popularModule/views/popularEsims.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/populardestination.dart';
import 'package:esimconnect/views/profileMoulde/historyOrdermodule/order_history_bloc/fetchOrderhistory_bloc.dart';
import 'package:esimconnect/views/profileMoulde/historyOrdermodule/view/ordersScreen.dart';
import 'package:esimconnect/widgets/CanvasStyle/topWaveCliper.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/quickActions.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/walletTopUpSheet.dart';
import '../../../../utills/global.dart' as global;
import '../../../authModule/view/loginScreen.dart';
import '../../../navbarModule/bloc/navbar_bloc.dart';
import '../../../notificationModule/noti_bloc/noti_bloc.dart';
import '../../../notificationModule/noti_bloc/noti_event.dart';
import '../../../packageModule/packagesList/bloc/country_bloc/countriesListbloc.dart';
import '../../../packageModule/packagesList/bloc/country_bloc/country_event.dart';
import '../../../packageModule/packagesList/model/GatewayListModel.dart';
import '../../../packageModule/regionsList/regionList_bloc/region_bloc.dart';
import '../../../packageModule/regionsList/regionList_bloc/region_event.dart';
import '../../../profileMoulde/userProfileModule/Model/userProfileModel.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import '../../../profileMoulde/userProfileModule/iptvModule/views/IPTVServicesScreen.dart';
import '../../../profileMoulde/userProfileModule/supportmodule/views/ConciergeScreen.dart';
import '../../../premiumModule/views/premium_services_screen.dart';
import '../../../packageModule/packagesList/view/PaymentScreen.dart';
import '../../controller/homeController.dart';
import 'package:esimconnect/views/homeModule/datapackModule/bloc/datapack_event.dart';
import '../../deviceinfo/view/device_info_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final navController = Get.find<BottomNavController>();
  final currentUser = UserService.to;
  List<GatewayItem> availableGateways = [];
  bool gatewaysLoaded = false;
  bool isLoadingGateways = false;
  bool isInAppBillingAvailable = false;
  bool _conciergeEnabled = true;
  bool _conciergePaid = true;
  bool _conciergeWhatsAppEnabled = false;
  bool _conciergeTrialAvailable = false;
  bool _conciergeHasAccess = false;
  bool _isLoadingConciergeStatus = false;
  bool _isProcessingConcierge = false;
  String _conciergeLabel = 'Paid Service';
  String _conciergeCurrency = 'USD';
  String _conciergeFee = '0.00';
  String _conciergeTrialEndpoint = 'concierge/trial';
  String _conciergeSubscribeEndpoint = 'concierge/activate';
  String _conciergeAction = 'Subscribe';
  final userService = UserService.to;
  final moduleAccess = Get.put(UserModuleAccessService(), permanent: true);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<UserProfileBloc>().add(UserProfileEvent());
      context.read<MostPopularbloc>().add(popularEvent(is_popular: '1'));
      context.read<FetchNotificationbloc>().add(fetchNotiEvent());
      context.read<BannerBloc>().add(BannerEvent());
      context.read<DataPackBloc>().add(DatapackEvent(isdatapack: true));
      moduleAccess.load(force: true).then((_) {
        if (mounted) setState(() {});
      });
      _loadConciergeSettings();
      _loadConciergeStatus();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          context.read<UserProfileBloc>().add(UserProfileEvent());
          context.read<MostPopularbloc>().add(popularEvent(is_popular: '1'));
          context.read<FetchNotificationbloc>().add(fetchNotiEvent());
          context.read<BannerBloc>().add(BannerEvent());
          context.read<DataPackBloc>().add(DatapackEvent(isdatapack: true));
          await moduleAccess.load(force: true);
          await _loadConciergeSettings();
          await _loadConciergeStatus();
          if (mounted) setState(() {});
        },
        child: GetBuilder<HomeController>(
          builder: (homeController) => Scaffold(
            backgroundColor: AppColors.scaffoldbackgroudColor,
            body: SingleChildScrollView(
              child: MultiBlocListener(
                listeners: [
                  BlocListener<UserProfileBloc, ApiState<UserProfileModel>>(
                    listener: (context, state) {
                      if (state is ApiSuccess) {
                        global.UserkycStatus =
                            state.data?.data?.kycStatus ?? '';
                        global.activeCurrencyname =
                            state.data?.data?.currencyRate?.code;
                        global.activeCurrencysymbol =
                            state.data?.data?.currencyRate?.symbol ?? '\$';
                        context.read<CountryBloc>().add(CountryEvent());
                        context.read<RegionsListBloc>().add(RegionsListEvent());
                      }
                      if (state is ApiFailure) {
                        global.activeCurrencyname = "USD";
                        global.activeCurrencysymbol = "\$";
                      }
                    },
                  ),
                ],
                child: Column(
                  children: [
                    SizedBox(height: 2.w),

                    BlocBuilder<UserProfileBloc, ApiState<UserProfileModel>>(
                      builder: (context, state) => Column(
                        children: [
                          _buildWalletBalanceCard(context, state),
                          SizedBox(height: 3.w),
                          if (_premiumServicesVisible) ...[
                            _buildPremiumServicesSection(context),
                            SizedBox(height: 3.w),
                          ],
                          _buildConciergeSection(context, state),
                          SizedBox(height: 5.w),
                          _buildRewardsWalletSection(context, state),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      margin: EdgeInsets.symmetric(horizontal: 5.w),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Quick Actions",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 16.sp,
                                  fontWeight: FontWeight.normal,
                                ),
                          ).tr(),
                          SizedBox(height: 4.w),
                          SizedBox(
                            height: 12.h,
                            child: ListView(
                              scrollDirection: Axis.horizontal,
                              children: [
                                if (_moduleEnabled('module_esim_services'))
                                  QuickAction(
                                    onpressed: () {
                                      print('clicked data pack NO');
                                      navController.jumpToTab(
                                        _bottomTabIndexForOriginal(2),
                                      );
                                    },
                                    icon: Icons.data_usage,
                                    label: tr("Data Pack"),
                                  ),
                                if (_moduleEnabled('module_esim_services'))
                                  QuickAction(
                                    onpressed: () {
                                      print('clicked Myesim');
                                      navController.jumpToTab(
                                        _bottomTabIndexForOriginal(3),
                                      );
                                    },
                                    icon: Icons.sim_card,
                                    label: tr("My eSims"),
                                  ),
                                QuickAction(
                                  onpressed: () {
                                    print('Device Compatibility');
                                    Get.to(() => DeviceInfoScreen());
                                  },
                                  icon: Icons.devices,
                                  label: tr("Device"),
                                ),
                                if (_premiumServicesVisible)
                                  QuickAction(
                                    onpressed: () {
                                      Get.to(
                                        () => const PremiumServicesScreen(),
                                      );
                                    },
                                    icon: Icons.workspace_premium_rounded,
                                    label: tr("Premium"),
                                  ),
                                if (_moduleEnabled('module_iptv_services'))
                                  QuickAction(
                                    onpressed: () {
                                      if (currentUser.currentUserData == null ||
                                          currentUser
                                                  .currentUserData!
                                                  .data!
                                                  .token ==
                                              null) {
                                        Get.offAll(() => LoginScreen());
                                      } else {
                                        Get.to(() => IPTVServicesScreen());
                                      }
                                    },
                                    icon: Icons.live_tv,
                                    label: tr("IPTV"),
                                  ),
                                QuickAction(
                                  onpressed: () {
                                    debugPrint('Going to Installation Guide');
                                    if (currentUser.currentUserData == null ||
                                        currentUser
                                                .currentUserData!
                                                .data!
                                                .token ==
                                            null) {
                                      Get.offAll(() => LoginScreen());
                                    } else {
                                      Get.to(
                                        () => BlocProvider(
                                          create: (context) =>
                                              FetchOrderHistorybloc(
                                                ApiService(),
                                              ),
                                          child: OrdersScreen(),
                                        ),
                                      );
                                    }
                                  },
                                  icon: Icons.history,
                                  label: tr("My Orders"),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 5.w),
                    BuildBannerWidget(),
                    PopularEsims(),
                    SizedBox(height: 5.w),
                    SwichDataTab(),
                    SizedBox(height: 5.w),
                    Regionalplans(),
                    SizedBox(height: 10.w),
                    PopularDistinctios(),
                    SizedBox(height: 12.w),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: ClipPath(
                        clipper: WaveClipper(top: true),
                        child: Container(
                          alignment: Alignment.bottomCenter,
                          padding: EdgeInsets.symmetric(
                            horizontal: 5.w,
                            vertical: 10.w,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(2.w),
                            gradient: const LinearGradient(
                              colors: [Color(0xFFE3F2FD), Color(0xFFFFF3E0)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              BottomContainer(
                                imagepath: Images.secureTransactions,
                                label: tr("Secure\nTransactions"),
                              ),
                              BottomContainer(
                                imagepath: Images.guaranteedRewards,
                                label: tr("Instant\nActivation"),
                              ),
                              BottomContainer(
                                imagepath: Images.intantTopUp,
                                label: tr("Top-Up\nAnytime"),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  bool get _isLoggedIn =>
      currentUser.currentUserData?.data?.token?.isNotEmpty == true;

  bool _moduleEnabled(String key) =>
      moduleAccess.enabled(key, fallback: key != 'module_dial_pad');

  bool get _premiumServicesVisible => moduleAccess.premiumServicesButtonVisible;

  int _bottomTabIndexForOriginal(int originalIndex) {
    var visibleIndex = 0;
    if (originalIndex == 0) return visibleIndex;

    if (_moduleEnabled('module_dial_pad')) {
      visibleIndex += 1;
      if (originalIndex == 1) return visibleIndex;
    }

    if (_moduleEnabled('module_esim_services')) {
      visibleIndex += 1;
      if (originalIndex == 2) return visibleIndex;
      visibleIndex += 1;
      if (originalIndex == 3) return visibleIndex;
    }

    return 0;
  }

  void _openWalletTopUp(BuildContext context, String symbol) {
    if (!_isLoggedIn) {
      Get.offAll(() => LoginScreen());
      return;
    }

    Get.to(
      () => WalletTopUpPage(
        symbol: symbol,
        onWalletChanged: () {
          context.read<UserProfileBloc>().add(UserProfileEvent());
        },
      ),
    );
  }

  Future<void> _handleConciergeAction(
    BuildContext context,
    ApiState<UserProfileModel> state,
  ) async {
    if (!_isLoggedIn) {
      Get.offAll(() => LoginScreen());
      return;
    }

    final userData = state is ApiSuccess<UserProfileModel>
        ? state.data.data
        : null;

    if (_conciergeHasAccess) {
      Get.to(() => const ConciergeScreen());
      return;
    }

    if (_conciergeTrialAvailable && !_hasUsedConciergeTrial(userData)) {
      await _startConciergeTrial(context);
      return;
    }

    await _startConciergeSubscription(context);
  }

  Future<void> _loadConciergeSettings() async {
    try {
      final response = await http.get(Uri.parse('${baseUrl}public/settings'));
      if (response.statusCode < 200 || response.statusCode >= 300) return;

      final payload = jsonDecode(response.body);
      final data = payload is Map<String, dynamic>
          ? (payload['data'] as Map<String, dynamic>? ?? <String, dynamic>{})
          : <String, dynamic>{};

      if (!mounted) return;

      final label = _readSetting(data, const [
        'concierge_label',
        'conciergeLabel',
        'concierge_plan_label',
        'conciergePlanLabel',
        'concierge_status_label',
        'conciergeStatusLabel',
      ]);
      final price = _readSetting(data, const [
        'concierge_price',
        'conciergePrice',
        'concierge_fee',
        'conciergeFee',
        'concierge_monthly_price',
        'conciergeMonthlyPrice',
      ]);
      final pricingMode = _readSetting(data, const [
        'concierge_pricing_mode',
        'conciergePricingMode',
      ]).toLowerCase();
      final status = _readSetting(data, const [
        'concierge_status',
        'conciergeStatus',
        'concierge_plan',
        'conciergePlan',
      ]);
      final paid = _parseBool(
        _readSetting(data, const [
          'concierge_paid',
          'conciergePaid',
          'concierge_is_paid',
          'conciergeIsPaid',
        ]),
      );
      final whatsAppEnabled = _parseBool(
        _readSetting(data, const [
          'concierge_whatsapp_enabled',
          'conciergeWhatsAppEnabled',
          'support_whatsapp_enabled',
          'supportWhatsAppEnabled',
          'whatsapp_enabled',
          'whatsappEnabled',
        ]),
      );
      final trialAvailable = _parseBool(
        _readSetting(data, const [
          'concierge_trial_enabled',
          'conciergeTrialEnabled',
          'concierge_free_trial_enabled',
          'conciergeFreeTrialEnabled',
          'concierge_trial_available',
          'conciergeTrialAvailable',
        ]),
      );
      final trialEndpoint = _readSetting(data, const [
        'concierge_trial_endpoint',
        'conciergeTrialEndpoint',
        'concierge_free_trial_endpoint',
        'conciergeFreeTrialEndpoint',
        'concierge_trial_url',
        'conciergeTrialUrl',
      ], fallback: 'concierge/trial');
      final subscribeEndpoint = _readSetting(data, const [
        'concierge_subscribe_endpoint',
        'conciergeSubscribeEndpoint',
        'concierge_payment_endpoint',
        'conciergePaymentEndpoint',
        'concierge_checkout_endpoint',
        'conciergeCheckoutEndpoint',
        'concierge_payment_url',
        'conciergePaymentUrl',
        'concierge_checkout_url',
        'conciergeCheckoutUrl',
        'concierge_subscription_url',
        'conciergeSubscriptionUrl',
      ], fallback: 'concierge/activate');

      setState(() {
        _conciergeEnabled = _parseBool(
          _readSetting(data, const [
            'concierge_enabled',
            'conciergeEnabled',
          ], fallback: 'true'),
        );
        final isPaidMode =
            pricingMode == 'paid' ||
            pricingMode == 'subscription' ||
            pricingMode == 'one_time';
        _conciergePaid =
            paid || isPaidMode || price.isNotEmpty || _conciergeEnabled;
        _conciergeWhatsAppEnabled = whatsAppEnabled;
        _conciergeTrialAvailable = trialAvailable;
        _conciergeTrialEndpoint = trialEndpoint;
        _conciergeSubscribeEndpoint = subscribeEndpoint;
        _conciergeCurrency = 'USD';
        _conciergeFee = price.isNotEmpty ? price : '0.00';
        _conciergeAction = trialAvailable ? 'Try Now' : 'Subscribe';
        _conciergeLabel = label.isNotEmpty
            ? label
            : price.isNotEmpty
            ? price
            : status.isNotEmpty
            ? status
            : (_conciergePaid
                  ? (trialAvailable
                        ? 'Subscription after trial'
                        : 'Paid Subscription')
                  : 'Paid Subscription');
      });
    } catch (_) {}
  }

  Future<void> _loadConciergeStatus() async {
    if (!_isLoggedIn || _isLoadingConciergeStatus) return;
    _isLoadingConciergeStatus = true;
    try {
      final response = await ApiService().get('concierge/status');
      final data = response is Map ? response['data'] ?? response : null;
      if (data is Map && mounted) {
        setState(() {
          _conciergeEnabled = _parseBool(data['enabled'] ?? _conciergeEnabled);
          _conciergePaid =
              (data['pricingMode']?.toString().toLowerCase() ?? '') == 'paid';
          _conciergeTrialAvailable = _parseBool(
            data['trialAvailable'] ?? data['trialEnabled'],
          );
          _conciergeHasAccess = _parseBool(data['hasAccess']);
          _conciergeAction = _conciergeHasAccess
              ? 'Open Concierge'
              : _conciergeTrialAvailable
              ? 'Try Now'
              : 'Subscribe';
          final fee = data['fee']?.toString().trim() ?? '';
          final currency = data['currency']?.toString().trim() ?? '';
          _conciergeCurrency = currency.isNotEmpty ? currency : 'USD';
          _conciergeFee = fee.isNotEmpty ? fee : '0.00';
          _conciergeLabel = _conciergePaid
              ? (fee.isNotEmpty ? '$currency $fee' : 'Paid Subscription')
              : 'Included';
        });
      }
    } catch (_) {
      // Public settings still provides the visible fallback.
    } finally {
      _isLoadingConciergeStatus = false;
    }
  }

  bool _hasUsedConciergeTrial(Data? userData) {
    final available = userData?.conciergeTrialAvailable;
    if (available != null) {
      return !_parseBool(available);
    }
    return _parseBool(userData?.conciergeTrialUsed);
  }

  Future<void> _startConciergeTrial(BuildContext context) async {
    if (_isProcessingConcierge) return;
    if (_conciergeTrialEndpoint.trim().isEmpty) {
      global.showToastMessage(
        message: tr('Concierge free trial is not configured yet.'),
      );
      return;
    }
    setState(() => _isProcessingConcierge = true);
    try {
      final response = await ApiService().post(_conciergeTrialEndpoint);
      global.showToastMessage(
        message: (response is Map && response['message'] != null)
            ? response['message'].toString()
            : tr('Concierge trial started'),
      );
      if (context.mounted) {
        context.read<UserProfileBloc>().add(UserProfileEvent());
      }
      await _loadConciergeStatus();
      Get.to(() => const ConciergeScreen());
    } catch (error) {
      global.showToastMessage(message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isProcessingConcierge = false);
      }
    }
  }

  Future<void> _startConciergeSubscription(BuildContext context) async {
    if (_isProcessingConcierge) return;
    if (_conciergeSubscribeEndpoint.trim().isEmpty) {
      global.showToastMessage(
        message: tr('Concierge payment is not configured yet.'),
      );
      return;
    }
    setState(() => _isProcessingConcierge = true);
    try {
      if (_conciergeSubscribeEndpoint.trim().startsWith('http')) {
        Get.to(
          () => PaymentScreen(
            url: _conciergeSubscribeEndpoint.trim(),
            paymentMethod: 'concierge',
            returnResult: true,
          ),
        );
        return;
      }

      final confirmed = await _showConciergeCheckoutConfirmation(context);
      if (confirmed != true) return;

      final response = await ApiService().post(
        _conciergeSubscribeEndpoint,
        data: {'paymentMethod': 'wallet'},
      );
      final checkoutUrl = _readPaymentUrl(response);
      if (checkoutUrl.isNotEmpty) {
        Get.to(
          () => PaymentScreen(
            url: checkoutUrl,
            paymentMethod: 'concierge',
            returnResult: true,
          ),
        );
      } else {
        global.showToastMessage(
          message: (response is Map && response['message'] != null)
              ? response['message'].toString()
              : tr('Concierge subscription request submitted'),
        );
        if (context.mounted) {
          context.read<UserProfileBloc>().add(UserProfileEvent());
        }
        await _loadConciergeStatus();
        if (_conciergeHasAccess) {
          Get.to(() => const ConciergeScreen());
        }
      }
    } catch (error) {
      global.showToastMessage(message: error.toString());
    } finally {
      if (mounted) {
        setState(() => _isProcessingConcierge = false);
      }
    }
  }

  Future<bool?> _showConciergeCheckoutConfirmation(BuildContext context) {
    final amount = double.tryParse(_conciergeFee.replaceAll(',', '')) ?? 0;
    if (_conciergePaid && amount <= 0) {
      global.showToastMessage(
        message: tr('Concierge payment is not configured yet.'),
      );
      return Future.value(false);
    }

    final walletBalance =
        currentUser.currentUserData?.data?.walletBalance?.toString() ?? '0.00';
    return showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return Container(
          padding: EdgeInsets.all(5.w),
          decoration: BoxDecoration(
            color: AppColors.appSurface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr('Confirm Concierge Checkout'),
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 18.sp,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 2.h),
                _checkoutRow('Service', 'VIP Concierge'),
                _checkoutRow('Amount', '$_conciergeCurrency $_conciergeFee'),
                _checkoutRow('Payment Method', 'Wallet'),
                _checkoutRow('Wallet Balance', '\$ $walletBalance'),
                SizedBox(height: 2.5.h),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(sheetContext, false),
                        child: Text(tr('Cancel')),
                      ),
                    ),
                    SizedBox(width: 3.w),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.pop(sheetContext, true),
                        icon: const Icon(Icons.lock_outline_rounded),
                        label: Text(tr('Pay & Activate')),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _checkoutRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            child: Text(
              tr(label),
              style: TextStyle(
                color: AppColors.appTextSecondary,
                fontSize: 14.sp,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontSize: 14.sp,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _readPaymentUrl(dynamic response) {
    if (response is! Map) return '';
    final data = response['data'];
    final candidates = [
      response['checkoutUrl'],
      response['paymentUrl'],
      response['url'],
      if (data is Map) data['checkoutUrl'],
      if (data is Map) data['paymentUrl'],
      if (data is Map) data['url'],
    ];
    for (final candidate in candidates) {
      final value = candidate?.toString().trim() ?? '';
      if (value.startsWith('http')) return value;
    }
    return '';
  }

  String _readSetting(
    Map<String, dynamic> data,
    List<String> keys, {
    String fallback = '',
  }) {
    for (final key in keys) {
      final value = data[key];
      if (value != null && value.toString().trim().isNotEmpty) {
        return value.toString().trim();
      }
    }
    return fallback;
  }

  bool _parseBool(dynamic value) {
    if (value is bool) return value;
    if (value is num) return value != 0;

    final normalized = value.toString().trim().toLowerCase();
    return normalized == 'true' ||
        normalized == '1' ||
        normalized == 'yes' ||
        normalized == 'on' ||
        normalized == 'enabled' ||
        normalized == 'paid';
  }

  String _formatWalletBalance(String? value) {
    final parsed = double.tryParse(value ?? "");
    if (parsed == null) {
      return value?.isNotEmpty == true ? value! : "0.00";
    }

    final fixed = parsed.toStringAsFixed(2);
    final parts = fixed.split(".");
    final whole = parts.first;
    final cents = parts.length > 1 ? parts.last : "00";
    final isNegative = whole.startsWith("-");
    final digits = isNegative ? whole.substring(1) : whole;
    final buffer = StringBuffer();

    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) {
        buffer.write(",");
      }
      buffer.write(digits[i]);
    }

    return "${isNegative ? "-" : ""}${buffer.toString()}.$cents";
  }

  Widget _buildWalletBalanceCard(
    BuildContext context,
    ApiState<UserProfileModel> state,
  ) {
    if (!_moduleEnabled('module_wallet_topup')) {
      return const SizedBox.shrink();
    }

    final userData = state is ApiSuccess<UserProfileModel>
        ? state.data.data
        : null;
    final symbol =
        userData?.currencyRate?.symbol ?? global.activeCurrencysymbol ?? "\$";
    final balance = _formatWalletBalance(
      userData?.walletBalance ??
          currentUser.currentUserData?.data?.walletBalance,
    );
    final isLoading = _isLoggedIn && state is ApiLoading<UserProfileModel>;
    final actionLabel = _isLoggedIn ? tr("Top-Up") : tr("Sign In");
    final helperText = _isLoggedIn
        ? (isLoading ? tr("Syncing balance") : tr("Ready for Checkout"))
        : tr("Sign in to unlock your wallet");

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (_isLoggedIn) {
            _openWalletTopUp(context, symbol);
          } else {
            Get.offAll(() => LoginScreen());
          }
        },
        borderRadius: BorderRadius.circular(22),
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 112),
          margin: EdgeInsets.symmetric(horizontal: 5.w),
          padding: EdgeInsets.all(4.5.w),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: LinearGradient(
              colors: [
                AppColors.appSurface,
                AppColors.primaryColor.withOpacity(0.82),
                AppColors.appSurfaceAlt.withOpacity(0.88),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border.all(color: Colors.white.withOpacity(0.12)),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryColor.withOpacity(0.22),
                blurRadius: 28,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 12.w,
                    width: 12.w,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.white.withOpacity(0.18)),
                    ),
                    child: Icon(
                      Icons.account_balance_wallet_outlined,
                      color: Colors.white,
                      size: 22.sp,
                    ),
                  ),
                  SizedBox(width: 3.w),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Wallet Balance",
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                color: Colors.white.withOpacity(0.78),
                                fontSize: 16.sp,
                                fontWeight: FontWeight.w400,
                              ),
                        ).tr(),
                        SizedBox(height: 1.w),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Text(
                            "$symbol $balance",
                            maxLines: 1,
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: Colors.white,
                                  fontSize: 28.sp,
                                  fontWeight: FontWeight.normal,
                                  height: 1.05,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isLoading)
                    SizedBox(
                      height: 5.w,
                      width: 5.w,
                      child: const CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                ],
              ),
              SizedBox(height: 3.w),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      helperText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        color: Colors.white.withOpacity(0.76),
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ),
                  SizedBox(width: 3.w),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: 3.w,
                      vertical: 1.5.w,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.16),
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: Colors.white.withOpacity(0.16)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          actionLabel,
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                color: Colors.white,
                                fontSize: 16.sp,
                                fontWeight: FontWeight.normal,
                              ),
                        ),
                        SizedBox(width: 1.w),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: Colors.white,
                          size: 13.sp,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConciergeSection(
    BuildContext context,
    ApiState<UserProfileModel> state,
  ) {
    if (!_moduleEnabled('concierge')) {
      return const SizedBox.shrink();
    }

    final hasAccess = _conciergeAction == 'Open Concierge';
    final canTryFree = _conciergeAction == 'Try Now';
    final actionText = _isProcessingConcierge
        ? tr('Processing')
        : !_isLoggedIn
        ? tr('Sign In to Start')
        : tr(_conciergeAction);
    final subtitle = hasAccess
        ? tr('Active Subscription')
        : canTryFree
        ? tr('Try free, then subscribe')
        : tr(_conciergeLabel);

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 5.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.only(left: 1.w, bottom: 3.w),
            child: Text(
              "Concierge",
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextSecondary,
                fontSize: 18.sp,
                fontWeight: FontWeight.normal,
              ),
            ).tr(),
          ),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _handleConciergeAction(context, state),
              borderRadius: BorderRadius.circular(30),
              child: Container(
                padding: EdgeInsets.all(5.w),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(30),
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFF9EE), Color(0xFFFFF4E2)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 30,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "VIP Concierge",
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: Colors.black,
                                  fontSize: 19.sp,
                                  fontWeight: FontWeight.normal,
                                ),
                          ).tr(),
                          SizedBox(height: 1.w),
                          Text(
                            subtitle,
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: const Color(0xFF9C9CA6),
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.w400,
                                ),
                          ).tr(),
                          SizedBox(height: 5.w),
                          if (_conciergePaid && _conciergeWhatsAppEnabled) ...[
                            _buildConciergeFeature(
                              context,
                              icon: FontAwesomeIcons.whatsapp,
                              label: tr("WhatsApp Support"),
                            ),
                            SizedBox(height: 2.4.w),
                          ],
                          _buildConciergeBullet(
                            context,
                            label: tr("Unlimited Requests & Advice"),
                          ),
                          SizedBox(height: 2.4.w),
                          _buildConciergeFeature(
                            context,
                            icon: Icons.verified_user_rounded,
                            label: tr("Priority Assistance"),
                          ),
                          SizedBox(height: 2.4.w),
                          _buildConciergeFeature(
                            context,
                            icon: Icons.travel_explore_rounded,
                            label: tr("Travel & eSIM Guidance"),
                          ),
                          SizedBox(height: 2.4.w),
                          _buildConciergeBullet(
                            context,
                            label: tr("Cancel Anytime"),
                          ),
                          SizedBox(height: 4.w),
                          Container(
                            constraints: BoxConstraints(minWidth: 30.w),
                            padding: EdgeInsets.symmetric(
                              horizontal: 4.w,
                              vertical: 2.2.w,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.76),
                              borderRadius: BorderRadius.circular(100),
                              border: Border.all(
                                color: Colors.black.withOpacity(0.05),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  actionText,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(
                                        color: Colors.black87,
                                        fontSize: 16.sp,
                                        fontWeight: FontWeight.normal,
                                      ),
                                ),
                                if (_isProcessingConcierge) ...[
                                  SizedBox(
                                    width: 4.w,
                                    height: 4.w,
                                    child: const CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                ] else ...[
                                  SizedBox(width: 1.2.w),
                                  Icon(
                                    canTryFree
                                        ? Icons.card_giftcard_rounded
                                        : hasAccess
                                        ? Icons.arrow_forward_rounded
                                        : Icons.lock_open_rounded,
                                    size: 14.sp,
                                    color: Colors.black87,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 1.w),
                    Container(
                      width: 18.w,
                      height: 34.w,
                      margin: EdgeInsets.only(top: 12.w),
                      alignment: Alignment.bottomCenter,
                      child: Stack(
                        alignment: Alignment.bottomCenter,
                        children: [
                          Container(
                            width: 16.w,
                            height: 16.w,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [
                                  Colors.white.withOpacity(0.95),
                                  const Color(0xFFF4E8D5),
                                  const Color(0xFFE7D4BC),
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(
                                    0xFFE4D1B7,
                                  ).withOpacity(0.9),
                                  blurRadius: 24,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                          ),
                          Transform.translate(
                            offset: Offset(0, -2.w),
                            child: Icon(
                              Icons.support_agent_rounded,
                              size: 12.w,
                              color: const Color(0xFFC7AD8F),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPremiumServicesSection(BuildContext context) {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 5.w),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => Get.to(() => const PremiumServicesScreen()),
          borderRadius: BorderRadius.circular(26),
          child: Container(
            padding: EdgeInsets.all(4.5.w),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF0B1026),
                  Color(0xFF173B67),
                  Color(0xFF2C244F),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: Colors.white24),
            ),
            child: Row(
              children: [
                Container(
                  width: 13.w,
                  height: 13.w,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(
                    Icons.workspace_premium_rounded,
                    color: Colors.white,
                  ),
                ),
                SizedBox(width: 3.5.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PREMIUM',
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          color: Colors.white,
                          fontSize: 18.sp,
                          fontWeight: FontWeight.w700,
                        ),
                      ).tr(),
                      SizedBox(height: 0.8.h),
                      Text(
                        'Chat, voice features, DID, and international calls.',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          color: Colors.white.withOpacity(0.74),
                          fontSize: 12.5.sp,
                          height: 1.25,
                        ),
                      ).tr(),
                    ],
                  ),
                ),
                SizedBox(width: 2.w),
                Container(
                  padding: EdgeInsets.all(2.3.w),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildConciergeBullet(BuildContext context, {required String label}) {
    return _buildConciergeFeature(
      context,
      icon: Icons.check_rounded,
      label: label,
    );
  }

  Widget _buildConciergeFeature(
    BuildContext context, {
    required IconData icon,
    required String label,
  }) {
    return Row(
      children: [
        Container(
          height: 5.w,
          width: 5.w,
          decoration: const BoxDecoration(
            color: Color(0xFF9FA0A8),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.white, size: 10.sp),
        ),
        SizedBox(width: 2.w),
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.visible,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              color: const Color(0xFF8E8E97),
              fontSize: 16.sp,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRewardsWalletSection(
    BuildContext context,
    ApiState<UserProfileModel> state,
  ) {
    if (!_moduleEnabled('module_rewards')) {
      return const SizedBox.shrink();
    }

    final userData = state is ApiSuccess<UserProfileModel>
        ? state.data.data
        : null;
    final symbol =
        userData?.currencyRate?.symbol ?? global.activeCurrencysymbol ?? "\$";
    final rewardsBalance = _formatWalletBalance(
      userData?.memberRewardsWallet ??
          userData?.referralBalance ??
          currentUser.currentUserData?.data?.memberRewardsWallet ??
          currentUser.currentUserData?.data?.referralBalance,
    );
    final memberTypeRaw =
        userData?.memberType ??
        currentUser.currentUserData?.data?.memberType ??
        "Standard";
    final badgeLabel = memberTypeRaw.toString().trim().isEmpty
        ? tr("Standard Member")
        : "$memberTypeRaw ${tr("Member")}";

    return Container(
      margin: EdgeInsets.symmetric(horizontal: 5.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.only(left: 1.w, bottom: 3.w),
            child: Text(
              "Rewards Wallet",
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextSecondary,
                fontSize: 18.sp,
                fontWeight: FontWeight.normal,
              ),
            ).tr(),
          ),
          Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(horizontal: 6.w, vertical: 5.5.w),
            decoration: BoxDecoration(
              color: AppColors.appSurface,
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 28,
                  offset: const Offset(0, 14),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Your Balance",
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    color: AppColors.appTextSecondary,
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w400,
                  ),
                ).tr(),
                SizedBox(height: 6.w),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: RichText(
                          text: TextSpan(
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(color: AppColors.appTextPrimary),
                            children: [
                              TextSpan(
                                text: rewardsBalance,
                                style: TextStyle(
                                  fontSize: 30.sp,
                                  fontWeight: FontWeight.normal,
                                  height: 1,
                                ),
                              ),
                              TextSpan(
                                text: " $symbol",
                                style: TextStyle(
                                  color: AppColors.appTextSecondary,
                                  fontSize: 18.sp,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: 4.w),
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 3.3.w,
                        vertical: 2.2.w,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF7EA),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            height: 8.5.w,
                            width: 8.5.w,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFFFFE5B5),
                            ),
                            child: Icon(
                              Icons.workspace_premium_rounded,
                              color: const Color(0xFFF2B544),
                              size: 16.sp,
                            ),
                          ),
                          SizedBox(width: 2.4.w),
                          Text(
                            badgeLabel,
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: Colors.black,
                                  fontSize: 13.sp,
                                  fontWeight: FontWeight.normal,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

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
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
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
      moduleAccess.enabled(key, fallback: true);

  int _bottomTabIndexForOriginal(int originalIndex) {
    var visibleIndex = 0;
    if (originalIndex == 0) return visibleIndex;

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

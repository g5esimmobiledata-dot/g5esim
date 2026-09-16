import 'dart:convert';

import 'package:esimconnect/utills/LanguageSelectionHandler.dart';
import 'package:esimconnect/theme/bloc/theme_event.dart';
import 'package:esimconnect/theme/bloc/theme_state.dart';
import 'package:esimconnect/theme/bloc/them_block.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/view/kycwidget.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/referralsevents/referalevent.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/deleteAccount_model.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/languagebloc/language_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/views/profileCardWidget.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/utills/services/UserModuleAccessService.dart';
import 'package:esimconnect/views/authModule/logout_bloc/LogoutUser.dart';
import 'package:esimconnect/views/authModule/logout_bloc/logoutbloc.dart';
import 'package:esimconnect/views/authModule/model/logoutModel.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/views/editProfileScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/userProfileModel.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/views/privacyPolicyScreen.dart';
import 'package:esimconnect/views/profileMoulde/historyOrdermodule/view/ordersScreen.dart';
import 'package:esimconnect/widgets/customDialogWidget.dart';
import 'package:esimconnect/utills/ApiAssetLoader.dart';
import 'package:esimconnect/views/homeModule/kycFormModule/view/KycFormScreen.dart';
import 'package:esimconnect/views/profileMoulde/giftCardModule/bloc/GiftCardHistoryevent.dart';
import 'package:esimconnect/views/profileMoulde/giftCardModule/bloc/GiftHistoryBloc.dart';
import 'package:esimconnect/views/profileMoulde/giftCardModule/views/createGiftCardSceeen.dart';
import 'package:esimconnect/views/profileMoulde/historyOrdermodule/order_history_bloc/fetchOrderhistory_bloc.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/Model/privacyPolicyModel.dart'
    hide Datum;
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/privacyPolicy_bloc/privacyPolicy_bloc.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/privacyPolicy_bloc/privacyPolicy_event.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/bloc/referral_history_bloc.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/bloc/referrals_bloc.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/referralModels/referrals_model.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/referralsevents/referral_history_event.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/views/ReferralScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/LanguageModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/deleteAccount_bloc/deleteAccount_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/deleteAccount_bloc/deleteAccount_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/languagebloc/language_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/SupportCustomerScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/views/ApiHostSettingsScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/views/DataStatusScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/views/EntertainmentScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/views/virtualNumberScreen.dart';
import 'package:esimconnect/views/premiumModule/views/premium_services_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final currentUser = UserService.to;
  final moduleAccess = Get.put(UserModuleAccessService(), permanent: true);
  static final List<Datum> _localLanguageOptions = [
    Datum(
      id: 'local-en',
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flagCode: 'US',
      isRtl: false,
      isEnabled: true,
      isDefault: true,
      sortOrder: 0,
    ),
    Datum(
      id: 'local-ar',
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      flagCode: 'SA',
      isRtl: true,
      isEnabled: true,
      sortOrder: 1,
    ),
    Datum(
      id: 'local-fr',
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flagCode: 'FR',
      isRtl: false,
      isEnabled: true,
      sortOrder: 2,
    ),
    Datum(
      id: 'local-es',
      code: 'es',
      name: 'Spanish (Spain)',
      nativeName: 'Español',
      flagCode: 'ES',
      isRtl: false,
      isEnabled: true,
      sortOrder: 3,
    ),
    Datum(
      id: 'local-it',
      code: 'it',
      name: 'Italian',
      nativeName: 'Italiano',
      flagCode: 'IT',
      isRtl: false,
      isEnabled: true,
      sortOrder: 4,
    ),
    Datum(
      id: 'local-ru',
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      flagCode: 'RU',
      isRtl: false,
      isEnabled: true,
      sortOrder: 5,
    ),
  ];

  bool isNotLogin = true;
  Data? _lastProfileData;

  @override
  void initState() {
    super.initState();
    final cachedProfileData = _profileDataFromCurrentUser();
    if (cachedProfileData != null) {
      _lastProfileData = cachedProfileData;
      isNotLogin = false;
    }

    WidgetsBinding.instance.addPostFrameCallback((timeStamp) async {
      await _loadCachedProfileFallback();
      if (!mounted) return;

      context.read<UserProfileBloc>().add(UserProfileEvent());
      context.read<PrivacypolicyBloc>().add(PrivacyPolicyEvent());
      context.read<LanguageBloc>().add(LanguageEvent());
      await moduleAccess.load(force: true);

      try {
        final currentLangCode = context.locale.languageCode;
        if (currentLangCode != null && currentLangCode.isNotEmpty) {
          await TranslationService().getTranslations(currentLangCode);
        }
      } catch (e) {
        print('Error preloading translations: $e');
      }
      setState(() {});
    });
  }

  bool _moduleEnabled(String key) =>
      moduleAccess.enabled(key, fallback: key != 'module_dial_pad');

  bool get _premiumServicesVisible => moduleAccess.premiumServicesButtonVisible;

  Future<void> _loadCachedProfileFallback() async {
    await currentUser.loadUserData();
    final cachedProfileData = await _profileDataFromPreferences();
    final fallbackProfileData =
        cachedProfileData ?? _profileDataFromCurrentUser();
    final hasLoggedInUser =
        fallbackProfileData != null || _hasCurrentUserToken();

    if (!mounted) return;
    setState(() {
      _lastProfileData ??= fallbackProfileData;
      isNotLogin = !hasLoggedInUser;
    });
  }

  bool _hasCurrentUserToken() {
    return currentUser.currentUserData?.data?.token?.trim().isNotEmpty == true;
  }

  Data? _profileDataFromCurrentUser() {
    final cachedUser = currentUser.currentUserData?.data;
    if (cachedUser == null || cachedUser.token?.trim().isNotEmpty != true) {
      return null;
    }

    return Data(
      id: cachedUser.id,
      email: cachedUser.email,
      name: cachedUser.name?.trim().isNotEmpty == true
          ? cachedUser.name
          : "User",
      walletBalance: cachedUser.walletBalance ?? "0.00",
      memberType: cachedUser.memberType ?? "Standard",
      referralBalance: cachedUser.referralBalance,
      memberRewardsWallet: cachedUser.memberRewardsWallet ?? "0.00",
      currencyRate: CurrencyRate(
        symbol: global.activeCurrencysymbol ?? "\$",
        code: global.activeCurrencyname ?? "USD",
        name: global.activeCurrencyname ?? "USD",
      ),
      destination: Destination(name: global.defaultCounty),
    );
  }

  Data _placeholderProfileData() {
    final cachedUser = currentUser.currentUserData?.data;

    return Data(
      id: cachedUser?.id,
      email: cachedUser?.email,
      name: cachedUser?.name?.trim().isNotEmpty == true
          ? cachedUser!.name
          : "User",
      walletBalance: cachedUser?.walletBalance ?? "0.00",
      memberType: cachedUser?.memberType ?? "Standard",
      referralBalance: cachedUser?.referralBalance,
      memberRewardsWallet: cachedUser?.memberRewardsWallet ?? "0.00",
      currencyRate: CurrencyRate(
        symbol: global.activeCurrencysymbol ?? "\$",
        code: global.activeCurrencyname ?? "USD",
        name: global.activeCurrencyname ?? "USD",
      ),
      destination: Destination(name: global.defaultCounty),
    );
  }

  Future<Data?> _profileDataFromPreferences() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('UserProfileData');
    if (userJson == null || userJson.trim().isEmpty) return null;

    try {
      final decoded = jsonDecode(userJson);
      if (decoded is! Map<String, dynamic>) return null;

      final rawData = decoded['data'];
      if (rawData is! Map) return null;

      final data = Map<String, dynamic>.from(rawData);
      final token = data['token']?.toString().trim();
      if (token?.isNotEmpty != true) return null;

      final savedImagePath = await currentUser.getSavedProfileImagePath();
      final imagePath =
          data['imagePath'] ??
          data['image_path'] ??
          data['profileImage'] ??
          data['profile_image'] ??
          data['avatar'] ??
          data['photo'] ??
          savedImagePath;

      return Data(
        id: (data['id'] ?? data['userId'])?.toString(),
        email: data['email']?.toString(),
        name: data['name']?.toString().trim().isNotEmpty == true
            ? data['name'].toString()
            : "User",
        phone: data['phone']?.toString(),
        address: data['address']?.toString(),
        imagePath: imagePath,
        kycStatus: data['kycStatus']?.toString(),
        walletBalance: data['walletBalance']?.toString() ?? "0.00",
        memberType: data['memberType']?.toString() ?? "Standard",
        referralBalance: data['referralBalance']?.toString(),
        memberRewardsWallet: data['memberRewardsWallet']?.toString() ?? "0.00",
        currencyRate: _currencyRateFromCachedData(data),
        destination: _destinationFromCachedData(data),
      );
    } catch (e) {
      print('Error loading cached profile fallback: $e');
      return null;
    }
  }

  CurrencyRate _currencyRateFromCachedData(Map<String, dynamic> data) {
    final rawCurrencyRate = data['currencyRate'];
    if (rawCurrencyRate is Map) {
      try {
        return CurrencyRate.fromJson(
          Map<String, dynamic>.from(rawCurrencyRate),
        );
      } catch (_) {}
    }

    return CurrencyRate(
      id: data['currency']?.toString(),
      symbol: global.activeCurrencysymbol ?? "\$",
      code: global.activeCurrencyname ?? "USD",
      name: global.activeCurrencyname ?? "USD",
    );
  }

  Destination _destinationFromCachedData(Map<String, dynamic> data) {
    final rawDestination = data['destination'];
    if (rawDestination is Map) {
      try {
        return Destination.fromJson(Map<String, dynamic>.from(rawDestination));
      } catch (_) {}
    }

    return Destination(
      id: rawDestination?.toString(),
      name: global.defaultCounty,
    );
  }

  Future<void> _openEditProfile(Data? userProfileData) async {
    if (userProfileData == null) return;

    await Get.to(
      () => EditUserProfile(
        countryName: userProfileData.destination?.name ?? "",
        selectedContryId: userProfileData.destination?.id,
        name: userProfileData.name,
        email: userProfileData.email,
        imagePath: userProfileData.imagePath?.toString(),
        currencyId: userProfileData.currencyRate?.id ?? "",
        currencyName: userProfileData.currencyRate?.symbol ?? "",
        address: userProfileData.address ?? "",
        phoneno: userProfileData.phone ?? "",
      ),
    );

    if (!mounted) return;
    context.read<UserProfileBloc>().add(UserProfileEvent());
  }

  Widget _buildAuthenticatedProfileSection(Data userProfileData) {
    final kycStatus = userProfileData.kycStatus ?? 'Not applied';
    final showKycNotification = kycStatus.toLowerCase() != 'approved';
    final showKycOption =
        userProfileData.kycStatus != "submitted" &&
        userProfileData.kycStatus != "approved";

    return Column(
      children: [
        InkWell(
          onTap: () => _openEditProfile(userProfileData),
          child: ProfileCardWidget(userProfileData: userProfileData),
        ),
        const SizedBox(height: 12),
        _buildOption(
          onpressed: () => _openEditProfile(userProfileData),
          context: context,
          icon: Icons.edit_rounded,
          label: "Edit Profile",
        ),
        if (showKycNotification)
          KycNotificationWidget(kycStatus: kycStatus, isLoading: false),
        const SizedBox(height: 10),
        if (showKycOption)
          _buildOption(
            onpressed: () {
              Get.to(() => KycFormScreen());
            },
            context: context,
            icon: Images.orderHistory,
            label: "KYC",
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ThemeBloc, ThemeState>(
      builder: (context, themeState) {
        AppColors.applyTheme(themeState.isDarkTheme);
        return SafeArea(
          child: Scaffold(
            backgroundColor: AppColors.scaffoldbackgroudColor,
            body: MultiBlocListener(
              listeners: [
                BlocListener<LogOutBloc, ApiState<LogoutModel>>(
                  listener: (context, state) async {
                    if (state is ApiLoading) {
                      Get.dialog(
                        const Center(child: CircularProgressIndicator()),
                        barrierDismissible: false,
                      );
                    } else if (state is ApiSuccess) {
                      currentUser.clearUserData();
                      Get.offAll(() => LoginScreen());
                    } else if (state is ApiFailure) {
                      Get.back();
                      global.showToastMessage(message: tr('Logout failed'));
                    }
                  },
                ),
                BlocListener<DeleteAccountBloc, ApiState<DeleteModel>>(
                  listener: (context, state) async {
                    if (state is ApiLoading) {
                      Get.dialog(
                        const Center(child: CircularProgressIndicator()),
                        barrierDismissible: false,
                      );
                    } else if (state is ApiSuccess) {
                      Get.back();
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.clear();
                      global.showToastMessage(
                        message: tr('Account deleted successfully'),
                      );

                      Get.offAll(() => LoginScreen());
                    } else if (state is ApiFailure) {
                      Get.back();
                      global.showToastMessage(
                        message: tr('Deleting account failed'),
                      );
                    }
                  },
                ),
              ],
              child: SafeArea(
                child: Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // ------------------Profile Data-----------------
                          isNotLogin
                              ? InkWell(
                                  onTap: () {
                                    Get.offAll(() => LoginScreen());
                                  },
                                  child: ProfileCardWidget(
                                    userProfileData: Data(
                                      name: "User",
                                      email: "User@gmail.com",
                                      currencyRate: CurrencyRate(
                                        symbol: global.activeCurrencysymbol,
                                        code: global.activeCurrencysymbol,
                                        name: global.activeCurrencyname,
                                      ),
                                      walletBalance: "0.00",
                                      memberType: "Standard",
                                      memberRewardsWallet: "0.00",
                                      destination: Destination(
                                        name: global.defaultCounty,
                                      ),
                                    ),
                                  ),
                                )
                              : BlocBuilder<
                                  UserProfileBloc,
                                  ApiState<UserProfileModel>
                                >(
                                  builder: (context, state) {
                                    if (state is ApiSuccess<UserProfileModel>) {
                                      final freshProfileData = state.data.data;
                                      if (freshProfileData != null) {
                                        _lastProfileData = freshProfileData;
                                      }
                                    }

                                    final userProfileData =
                                        state is ApiSuccess<UserProfileModel>
                                        ? state.data.data ?? _lastProfileData
                                        : _lastProfileData;

                                    return _buildAuthenticatedProfileSection(
                                      userProfileData ??
                                          _profileDataFromCurrentUser() ??
                                          _placeholderProfileData(),
                                    );
                                  },
                                ),

                          isNotLogin
                              ? SizedBox()
                              : _buildOption(
                                  onpressed: () {
                                    Get.to(
                                      () => BlocProvider(
                                        create: (context) =>
                                            FetchOrderHistorybloc(ApiService()),
                                        child: OrdersScreen(),
                                      ),
                                    );
                                  },
                                  context: context,
                                  icon: Images.orderHistory,
                                  label: "Order history",
                                ),

                          isNotLogin ? SizedBox(height: 2.h) : SizedBox(),
                          _buildOption(
                            onpressed: () {
                              _showLanguageBottomSheet(context);
                            },
                            context: context,
                            icon: Images.language,
                            label: "Language",
                          ),

                          _buildThemeModeOption(context),

                          SizedBox(height: 1.h),

                          _buildOption(
                            onpressed: () {
                              Get.to(() => const ApiHostSettingsScreen());
                            },
                            context: context,
                            icon: Icons.dns_rounded,
                            label: "Connection Settings",
                          ),

                          isNotLogin
                              ? SizedBox()
                              : _moduleEnabled('module_esim_services')
                              ? _buildOption(
                                  onpressed: () {
                                    Get.to(() => const DataStatusScreen());
                                  },
                                  context: context,
                                  icon: Icons.data_usage_rounded,
                                  label: "Data Status",
                                )
                              : SizedBox(),

                          isNotLogin
                              ? SizedBox()
                              : _moduleEnabled('module_virtual_numbers')
                              ? _buildOption(
                                  onpressed: () {
                                    Get.to(() => const VirtualNumberScreen());
                                  },
                                  context: context,
                                  icon: Icons.phone_forwarded_rounded,
                                  label: "eRoaming Number",
                                )
                              : SizedBox(),

                          isNotLogin
                              ? SizedBox()
                              : _moduleEnabled('module_iptv_services')
                              ? _buildOption(
                                  onpressed: () {
                                    Get.to(() => const EntertainmentScreen());
                                  },
                                  context: context,
                                  icon: Icons.live_tv_rounded,
                                  label: "Entertainment",
                                )
                              : SizedBox(),

                          isNotLogin
                              ? SizedBox()
                              : _premiumServicesVisible
                              ? _buildOption(
                                  onpressed: () {
                                    Get.to(() => const PremiumServicesScreen());
                                  },
                                  context: context,
                                  icon: Icons.workspace_premium_rounded,
                                  label: "Premium Services",
                                )
                              : SizedBox(),

                          isNotLogin
                              ? SizedBox()
                              : _buildOption(
                                  onpressed: () {
                                    Get.to(() => SupportCustomerScreen());
                                  },
                                  context: context,
                                  icon: Images.customerSupport,
                                  label: "Customer Support",
                                ),
                          isNotLogin
                              ? SizedBox()
                              : _moduleEnabled('module_rewards')
                              ? BlocConsumer<
                                  ReferralBloc,
                                  ApiState<ReferralModel>
                                >(
                                  listener: (context, state) {
                                    if (state is ApiSuccess) {
                                      Get.to(() => ReferralScreen());
                                      print("api sucess");
                                    }
                                  },
                                  builder: (context, state) {
                                    return _buildOption(
                                      onpressed: () {
                                        context.read<ReferralBloc>().add(
                                          Referalevent(),
                                        );
                                        context.read<ReferralHistoryBloc>().add(
                                          ReferralHistoryEvent(),
                                        );
                                        context.read<GiftHistoryBloc>().add(
                                          GiftHistoryevent(),
                                        );
                                      },
                                      context: context,
                                      icon: Images.referAndEarn,
                                      label: "Refer and Earn",
                                    );
                                  },
                                )
                              : SizedBox(),

                          _buildOption(
                            onpressed: () {
                              global.launchPlayStore();
                            },
                            context: context,
                            icon: Images.rateUs,
                            label: "Rate App",
                          ),
                          isNotLogin
                              ? SizedBox()
                              : _moduleEnabled('module_gift_cards')
                              ? _buildOption(
                                  onpressed: () {
                                    Get.to(() => CreateGiftCardScreen());
                                  },
                                  context: context,
                                  icon: Images.rateUs,
                                  label: "Create Gift Card",
                                )
                              : SizedBox(),
                          isNotLogin
                              ? _buildOption(
                                  onpressed: () async {
                                    Get.offAll(() => LoginScreen());
                                  },
                                  context: context,
                                  icon: Images.login,
                                  label: "Login",
                                )
                              : _buildOption(
                                  onpressed: () async {
                                    showCustomDialog(
                                      title: tr("Logout...?"),
                                      subtitle: tr(
                                        "Are you sure you want to logout?",
                                      ),
                                      primaryButtonText: tr("Logout"),
                                      secondaryButtonText: tr("Cancel"),
                                      onSecondaryPressed: () {
                                        Get.back();
                                      },
                                      onPrimaryPressed: () async {
                                        context.read<LogOutBloc>().add(
                                          LogoutUser(),
                                        );
                                      },
                                    );
                                  },
                                  context: context,
                                  icon: Images.logOut,
                                  label: "Logout",
                                ),
                          SizedBox(height: 1.h),
                          BlocBuilder<
                            PrivacypolicyBloc,
                            ApiState<PrivacyPolicyModel>
                          >(
                            builder: (context, state) {
                              final list = state.data?.data ?? [];

                              if (state is ApiLoading) {
                                return const Center(child: SizedBox());
                              }

                              if (list.isEmpty) {
                                return const SizedBox();
                              }

                              return ExpansionTile(
                                initiallyExpanded: false,
                                tilePadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 4,
                                ),
                                childrenPadding: const EdgeInsets.only(top: 8),
                                collapsedShape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: BorderSide(
                                    color: AppColors.secondaryColor.withOpacity(
                                      0.4,
                                    ),
                                    width: 0.5,
                                  ),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: BorderSide(
                                    color: AppColors.secondaryColor.withOpacity(
                                      0.4,
                                    ),
                                    width: 0.2,
                                  ),
                                ),
                                title: Row(
                                  children: [
                                    Image.asset(
                                      Images.pages,
                                      color: AppColors.primaryColor,
                                      height: 7.w,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        "Legal",
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium!
                                            .copyWith(fontSize: 16.sp),
                                      ).tr(),
                                    ),
                                  ],
                                ),
                                trailing: Icon(
                                  Icons.keyboard_arrow_down,
                                  color: AppColors.secondaryColor,
                                ),
                                iconColor: AppColors.secondaryColor,
                                collapsedIconColor: AppColors.secondaryColor,
                                children: [
                                  ListView.builder(
                                    shrinkWrap: true,
                                    physics:
                                        const NeverScrollableScrollPhysics(),
                                    itemCount: list.length,
                                    itemBuilder: (context, index) {
                                      final item = list[index];
                                      return _buildOption(
                                        onpressed: () {
                                          Get.to(
                                            () => PrivacyPolicyScreen(
                                              index: index,
                                            ),
                                          );
                                        },
                                        context: context,
                                        icon: item.slug == "privacy-policy"
                                            ? Images.privacy
                                            : (item.slug ==
                                                      "terms-and-condition"
                                                  ? Images.termAndCondition
                                                  : Images.pages),
                                        label: item.title!
                                            .capitalizeFirstLetter(),
                                      );
                                    },
                                  ),
                                ],
                              );
                            },
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              RichText(
                                text: TextSpan(
                                  text: tr("App Version"),
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(fontSize: 16.sp),
                                  children: [
                                    TextSpan(text: ": "),
                                    TextSpan(
                                      text: global.appVersion,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                            fontSize: 16.sp,
                                            fontWeight: FontWeight.normal,
                                            color: AppColors.primaryColor,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 2.h),
                          isNotLogin
                              ? SizedBox()
                              : Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(2.w),
                                    gradient: const LinearGradient(
                                      colors: [
                                        Color(0xFFE3F2FD),
                                        Color(0xFFFFF3E0),
                                      ],
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: RichText(
                                              text: TextSpan(
                                                text: tr("Want_to"),
                                                style: Theme.of(context)
                                                    .textTheme
                                                    .bodyMedium!
                                                    .copyWith(fontSize: 16.sp),
                                                children: [
                                                  TextSpan(
                                                    text: tr("Delete"),
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodyMedium!
                                                        .copyWith(
                                                          fontSize: 16.sp,
                                                          fontWeight:
                                                              FontWeight.normal,
                                                          color: AppColors
                                                              .redColor,
                                                        ),
                                                  ),
                                                  TextSpan(
                                                    text: tr("your_account"),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Image.asset(
                                            Images.deleteAccount,
                                            height: 40,
                                            fit: BoxFit.contain,
                                            color: AppColors.redColor,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 18),
                                      SizedBox(
                                        width: double.infinity,
                                        child: CustomElevatedButton(
                                          onPressed: () {
                                            showCustomDialog(
                                              title: tr(
                                                "Are you sure you want to Delete your account ?",
                                              ),
                                              subtitle: tr(
                                                "This action will permanently delete your account and remove all associated data to confirm click on Delete.",
                                              ),
                                              primaryButtonText: tr("Delete"),
                                              primaryButtonColor:
                                                  AppColors.redColor,
                                              primaryButtonTextStyle: TextStyle(
                                                color: AppColors.whiteColor,
                                              ),
                                              secondaryButtonText: tr("Cancel"),
                                              secondaryButtonColor:
                                                  AppColors.primaryColor,
                                              onSecondaryPressed: () {
                                                Get.back();
                                              },
                                              onPrimaryPressed: () async {
                                                Get.back();
                                                context
                                                    .read<DeleteAccountBloc>()
                                                    .add(DeleteAccountEvent());
                                              },
                                            );
                                          },
                                          text: tr("Delete Account"),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                          SizedBox(height: 3.h),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _showLanguageBottomSheet(BuildContext context) {
    Get.bottomSheet(
      BlocBuilder<LanguageBloc, ApiState<LanguageModel>>(
        builder: (context, state) {
          return SafeArea(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.scaffoldbackgroudColor,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16.0),
                  topRight: Radius.circular(16.0),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Choose Your App Language',
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 17.sp,
                      fontWeight: FontWeight.normal,
                      color: AppColors.appTextPrimary,
                    ),
                  ).tr(),
                  const SizedBox(height: 16),

                  // Handle different states
                  if (state is ApiLoading)
                    SizedBox(
                      height: MediaQuery.of(context).size.height * 0.3,
                      child: const Center(child: CircularProgressIndicator()),
                    )
                  else if (state is ApiFailure)
                    _buildLanguageFailureFallback(context)
                  else if (state is ApiSuccess)
                    _buildLanguageList(context, state.data ?? LanguageModel())
                  else
                    SizedBox(
                      height: MediaQuery.of(context).size.height * 0.3,
                      child: const Center(
                        child: Text('No languages available'),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
    );
  }

  Widget _buildLanguageList(
    BuildContext context,
    LanguageModel? languageModel,
  ) {
    final currentLangCode = context.locale.languageCode;
    final languages = _availableLanguages(languageModel);

    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.6,
      child: Scrollbar(
        thumbVisibility: true,
        child: ListView.separated(
          shrinkWrap: true,
          physics: const BouncingScrollPhysics(),
          itemCount: languages.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final lang = languages[index];
            final langId = lang.id ?? '';
            final langCode = lang.code ?? '';
            final langName = _localizedLanguageName(
              langCode,
              currentLangCode,
              fallback: lang.name ?? '',
            );
            final langNativeName = _nativeLanguageName(
              langCode,
              fallback: lang.nativeName ?? '',
            );
            final countryCode = lang.flagCode ?? 'US';
            return buildLanguageListItem(
              context: context,
              langId: langId,
              langCode: langCode,
              langName: langName,
              langNativeName: langNativeName,
              countryCode: countryCode,
              currentLangCode: currentLangCode,
              onTap: () async {
                final apiAssetLoader =
                    context
                            .findAncestorWidgetOfExactType<EasyLocalization>()
                            ?.assetLoader
                        as ApiAssetLoader;

                if (apiAssetLoader != null) {
                  await LanguageSelectionHandler.changeLanguage(
                    context: context,
                    languageCode: langCode,
                    flagCode: countryCode,
                    apiAssetLoader: apiAssetLoader,
                  );
                }
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildLanguageFailureFallback(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primaryColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.appBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Failed to load languages',
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: AppColors.appTextSecondary,
                  ),
                ).tr(),
              ),
              TextButton(
                onPressed: () {
                  context.read<LanguageBloc>().add(LanguageEvent());
                },
                child: const Text('Retry').tr(),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _buildLanguageList(context, LanguageModel(data: _localLanguageOptions)),
      ],
    );
  }

  List<Datum> _availableLanguages(LanguageModel? languageModel) {
    final byCode = <String, Datum>{
      for (final language in _localLanguageOptions) language.code!: language,
    };

    for (final language in languageModel?.data ?? const <Datum>[]) {
      final code = language.code?.trim();
      if (code == null || code.isEmpty || language.isEnabled == false) {
        continue;
      }
      byCode[code] = _mergeLanguageOption(byCode[code], language);
    }

    final languages = byCode.values.toList()
      ..sort((a, b) {
        final orderCompare = (a.sortOrder ?? 999).compareTo(b.sortOrder ?? 999);
        if (orderCompare != 0) return orderCompare;
        return (a.name ?? '').compareTo(b.name ?? '');
      });
    return languages;
  }

  Datum _mergeLanguageOption(Datum? local, Datum remote) {
    return Datum(
      id: _nonEmpty(remote.id) ?? local?.id,
      code: _nonEmpty(remote.code) ?? local?.code,
      name: _nonEmpty(remote.name) ?? local?.name,
      nativeName: _nonEmpty(remote.nativeName) ?? local?.nativeName,
      flagCode: _nonEmpty(remote.flagCode) ?? local?.flagCode,
      isRtl: remote.isRtl ?? local?.isRtl,
      isEnabled: remote.isEnabled ?? local?.isEnabled,
      isDefault: remote.isDefault ?? local?.isDefault,
      sortOrder: remote.sortOrder ?? local?.sortOrder,
      createdAt: remote.createdAt ?? local?.createdAt,
      updatedAt: remote.updatedAt ?? local?.updatedAt,
    );
  }

  String? _nonEmpty(String? value) {
    final text = value?.trim();
    return text == null || text.isEmpty ? null : text;
  }

  String _localizedLanguageName(
    String languageCode,
    String currentLanguageCode, {
    required String fallback,
  }) {
    final names =
        _languageNamesByLocale[currentLanguageCode] ??
        _languageNamesByLocale['en']!;
    return names[languageCode] ?? fallback;
  }

  String _nativeLanguageName(String languageCode, {required String fallback}) {
    return _nativeLanguageNames[languageCode] ?? fallback;
  }

  static const Map<String, Map<String, String>> _languageNamesByLocale = {
    'en': {
      'en': 'English',
      'ar': 'Arabic',
      'fr': 'French',
      'es': 'Spanish',
      'it': 'Italian',
      'ru': 'Russian',
    },
    'ar': {
      'en': 'الإنجليزية',
      'ar': 'العربية',
      'fr': 'الفرنسية',
      'es': 'الإسبانية',
      'it': 'الإيطالية',
      'ru': 'الروسية',
    },
    'fr': {
      'en': 'Anglais',
      'ar': 'Arabe',
      'fr': 'Français',
      'es': 'Espagnol',
      'it': 'Italien',
      'ru': 'Russe',
    },
    'es': {
      'en': 'Inglés',
      'ar': 'Árabe',
      'fr': 'Francés',
      'es': 'Español',
      'it': 'Italiano',
      'ru': 'Ruso',
    },
    'it': {
      'en': 'Inglese',
      'ar': 'Arabo',
      'fr': 'Francese',
      'es': 'Spagnolo',
      'it': 'Italiano',
      'ru': 'Russo',
    },
    'ru': {
      'en': 'Английский',
      'ar': 'Арабский',
      'fr': 'Французский',
      'es': 'Испанский',
      'it': 'Итальянский',
      'ru': 'Русский',
    },
  };

  static const Map<String, String> _nativeLanguageNames = {
    'en': 'English',
    'ar': 'العربية',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano',
    'ru': 'Русский',
  };

  Widget _buildRefreshTranslationsButton(BuildContext context) {
    return _buildOption(
      onpressed: () async {
        Get.dialog(
          const Center(child: CircularProgressIndicator()),
          barrierDismissible: false,
        );

        try {
          // Get current language code
          final prefs = await SharedPreferences.getInstance();
          final currentLangCode = prefs.getString('selected_language') ?? 'en';
          final currentCountryCode =
              prefs.getString('selected_country') ?? 'US';

          // Clear cache and reload translations
          final translationService = TranslationService();

          // Preload fresh translations for current language
          if (currentLangCode.isNotEmpty) {
            await translationService.getTranslations(
              currentLangCode,
              forceRefresh: true,
            );
          }
          final currentLocale = Locale(currentLangCode, currentCountryCode);
          await context.deleteSaveLocale();
          await context.setLocale(currentLocale);
          await Get.updateLocale(currentLocale);
          if (context.mounted) {
            EasyLocalization.of(context)?.setLocale(currentLocale);
          }

          Get.back();
          global.showToastMessage(
            message: 'Translations refreshed successfully',
          );

          print('✅ Translations refreshed for $currentLangCode');
        } catch (e) {
          if (Get.isDialogOpen ?? false) {
            Get.back();
          }
          global.showToastMessage(message: 'Failed to refresh translations');
          print('❌ Refresh error: $e');
        }
      },
      context: context,
      icon: Images.language,
      label: "Refresh Translations",
    );
  }

  Future<String?> _getDefaultLanguageId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedId = prefs.getString('selected_language_id');
      if (savedId != null) return savedId;

      final languageBloc = context.read<LanguageBloc>();
      final state = languageBloc.state;

      if (state is ApiSuccess<LanguageModel>) {
        final languages = state.data.data ?? [];
        if (languages.isNotEmpty) {
          // Find English or first language
          final defaultLang = languages.firstWhere(
            (lang) => lang.code == 'en',
            orElse: () => languages.first,
          );

          // Save it for future use
          await prefs.setString('selected_language_id', defaultLang.id ?? '');
          return defaultLang.id;
        }
      }

      return null;
    } catch (e) {
      print('Error getting default language ID: $e');
      return null;
    }
  }

  Widget _buildReferralBanner(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Get.to(() => ReferAndEarnScreen());
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: BorderRadius.circular(2.w),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Row(
          children: [
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        "Click Here To Learn More",
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          color: AppColors.darkYellow,
                          fontWeight: FontWeight.normal,
                          fontSize: 15.sp,
                        ),
                      ).tr(),
                      Spacer(),
                      Icon(
                        Icons.arrow_forward,
                        color: AppColors.darkYellow,
                        size: 18.sp,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThemeModeOption(BuildContext context) {
    return BlocBuilder<ThemeBloc, ThemeState>(
      builder: (context, themeState) {
        return _buildOption(
          onpressed: () {
            context.read<ThemeBloc>().add(
              ChangeThemeMode(!themeState.isDarkTheme),
            );
          },
          context: context,
          icon: themeState.isDarkTheme
              ? Icons.dark_mode_outlined
              : Icons.light_mode_outlined,
          label: "Appearance",
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                themeState.isDarkTheme ? tr("Dark") : tr("Light"),
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                  color: AppColors.appTextSecondary,
                  fontSize: 13.sp,
                  fontWeight: FontWeight.normal,
                ),
              ),
              SizedBox(width: 2.w),
              Switch(
                value: themeState.isDarkTheme,
                onChanged: (value) {
                  context.read<ThemeBloc>().add(ChangeThemeMode(value));
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOption({
    final VoidCallback? onpressed,
    required BuildContext context,
    required dynamic icon,
    Color? iconColor,
    double? iconSize,
    required String label,
    Widget? trailing,
  }) {
    return GestureDetector(
      onTap: onpressed,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: BorderRadius.circular(2.w),
          border: Border.all(width: 0.6, color: AppColors.appBorder),
        ),
        child: Row(
          children: [
            if (icon is IconData)
              Icon(icon, color: iconColor ?? AppColors.primaryColor)
            else
              Image.asset(
                icon,
                height: iconSize ?? 20,
                color: iconColor ?? AppColors.primaryColor,
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium!.copyWith(fontSize: 16.sp),
              ).tr(),
            ),
            trailing ??
                Icon(Icons.chevron_right, color: AppColors.appTextSecondary),
          ],
        ),
      ),
    );
  }
}

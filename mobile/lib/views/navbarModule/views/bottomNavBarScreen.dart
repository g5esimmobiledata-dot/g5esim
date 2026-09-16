import 'dart:developer';
import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/theme/bloc/theme_event.dart';
import 'package:esimconnect/theme/bloc/theme_state.dart';
import 'package:esimconnect/theme/bloc/them_block.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/services/UserModuleAccessService.dart';
import 'package:esimconnect/views/homeModule/controller/homeController.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/userProfileModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:get/get.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/views/homeScreen.dart';
import 'package:esimconnect/views/myEsimModule/view/myEsimScreen.dart';
import 'package:esimconnect/views/navbarModule/bloc/navbar_bloc.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/packageScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/views/profileScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/views/OutboundCallScreen.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:skeletonizer/skeletonizer.dart';
import '../../authModule/view/loginScreen.dart';
import '../../myEsimModule/myesimbloc/fetch_esim_event.dart';
import '../../myEsimModule/myesimbloc/fetch_esim_list_bloc.dart';
import '../../notificationModule/view/notificationScreen.dart';
import '../../packageModule/packagesList/bloc/country_bloc/countriesListbloc.dart';
import '../../packageModule/packagesList/bloc/country_bloc/country_event.dart';
import '../../packageModule/regionsList/regionList_bloc/region_bloc.dart';
import '../../packageModule/regionsList/regionList_bloc/region_event.dart';

class BottomNavigationBarScreen extends StatefulWidget {
  final int index;
  const BottomNavigationBarScreen({super.key, this.index = 0});
  @override
  State<BottomNavigationBarScreen> createState() =>
      _BottomNavigationBarScreenState();
}

class _BottomTabEntry {
  final int originalIndex;
  final String title;
  final dynamic icon;
  final dynamic activeIcon;
  final Widget screen;

  const _BottomTabEntry({
    required this.originalIndex,
    required this.title,
    required this.icon,
    required this.activeIcon,
    required this.screen,
  });
}

class _BottomNavigationBarScreenState extends State<BottomNavigationBarScreen>
    with WidgetsBindingObserver {
  List<dynamic> iconList = [
    Images.homeIcon,
    Icons.dialpad_outlined,
    Images.packagesIcon,
    Images.eSIMIcon,
    Images.userProfileIcon,
  ];
  List<dynamic> boldiconList = [
    Images.homeBoldIcon,
    Icons.dialpad_rounded,
    Images.packagesBoldIcon,
    Images.eSIMBoldIcon,
    Images.userProfileBoldIcon,
  ];

  List<String> tabList = ['Home', 'Dial', 'Packages', 'My eSims', 'Profile'];
  final navController = Get.find<BottomNavController>();
  late PersistentTabController persistancecontroller;
  final userService = UserService.to;
  final moduleAccess = Get.put(UserModuleAccessService(), permanent: true);
  final Set<int> _loadedTabs = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _syncVisibleTabMapping();
    final initialVisibleIndex = _visibleIndexForOriginal(widget.index);
    persistancecontroller = PersistentTabController(
      initialIndex: initialVisibleIndex,
    );
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      navController.globalController = persistancecontroller;
      navController.selectedIndex.value = initialVisibleIndex;
      navController.update();
      context.read<UserProfileBloc>().add(UserProfileEvent());
      global.getAppVersion();
      _refreshModuleAccess(force: true, preferredOriginalIndex: widget.index);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshModuleAccess(force: true);
    }
  }

  Future<void> _refreshModuleAccess({
    bool force = false,
    int? preferredOriginalIndex,
  }) async {
    final currentEntries = _tabEntries();
    final currentOriginalIndex =
        preferredOriginalIndex ??
        _selectedEntry(
          currentEntries,
          navController.selectedIndex.value,
        ).originalIndex;

    await moduleAccess.load(force: force);
    if (!mounted) return;

    _syncVisibleTabMapping();
    final visibleIndex = _visibleIndexForOriginal(currentOriginalIndex);
    navController.jumpToVisibleTab(visibleIndex);
    setState(() {});
  }

  List<Widget> screens() {
    return [
      HomeScreen(),
      OutboundCallScreen(backendHint: 'vonage', showAppBar: false),
      PackagesScreen(),
      MyEsimsScreen(),
      ProfileScreen(),
    ];
  }

  List<_BottomTabEntry> _tabEntries() {
    final entries = <_BottomTabEntry>[
      _BottomTabEntry(
        originalIndex: 0,
        title: 'Home',
        icon: Images.homeIcon,
        activeIcon: Images.homeBoldIcon,
        screen: HomeScreen(),
      ),
    ];

    if (moduleAccess.enabled('module_dial_pad', fallback: false)) {
      entries.add(
        _BottomTabEntry(
          originalIndex: 1,
          title: 'Dial',
          icon: Icons.dialpad_outlined,
          activeIcon: Icons.dialpad_rounded,
          screen: OutboundCallScreen(backendHint: 'vonage', showAppBar: false),
        ),
      );
    }

    if (moduleAccess.enabled('module_esim_services')) {
      entries.addAll([
        _BottomTabEntry(
          originalIndex: 2,
          title: 'Packages',
          icon: Images.packagesIcon,
          activeIcon: Images.packagesBoldIcon,
          screen: PackagesScreen(),
        ),
        _BottomTabEntry(
          originalIndex: 3,
          title: 'My eSims',
          icon: Images.eSIMIcon,
          activeIcon: Images.eSIMBoldIcon,
          screen: MyEsimsScreen(),
        ),
      ]);
    }

    entries.add(
      _BottomTabEntry(
        originalIndex: 4,
        title: 'Profile',
        icon: Images.userProfileIcon,
        activeIcon: Images.userProfileIcon,
        screen: ProfileScreen(),
      ),
    );

    return entries;
  }

  void _syncVisibleTabMapping() {
    navController.setVisibleTabOriginalIndices(
      _tabEntries().map((entry) => entry.originalIndex).toList(),
    );
  }

  int _visibleIndexForOriginal(int originalIndex) {
    final entries = _tabEntries();
    final index = entries.indexWhere(
      (entry) => entry.originalIndex == originalIndex,
    );
    return index >= 0 ? index : 0;
  }

  _BottomTabEntry _selectedEntry(
    List<_BottomTabEntry> entries,
    int selectedIndex,
  ) {
    if (entries.isEmpty) return _tabEntries().first;
    if (selectedIndex >= 0 && selectedIndex < entries.length) {
      return entries[selectedIndex];
    }
    return entries.first;
  }

  bool _tabIndexOutOfRange(List<_BottomTabEntry> entries) {
    if (entries.isEmpty) return true;
    final lastIndex = entries.length - 1;
    return navController.selectedIndex.value < 0 ||
        navController.selectedIndex.value > lastIndex ||
        persistancecontroller.index < 0 ||
        persistancecontroller.index > lastIndex;
  }

  int _safeVisibleIndex(List<_BottomTabEntry> entries) {
    if (entries.isEmpty) return 0;
    final currentIndex = persistancecontroller.index;
    if (currentIndex >= 0 && currentIndex < entries.length) {
      return currentIndex;
    }
    return entries.length - 1;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ThemeBloc, ThemeState>(
      builder: (context, themeState) {
        AppColors.applyTheme(themeState.isDarkTheme);
        return WillPopScope(
          onWillPop: () async {
            bool isExit = await navController.onBackPressed();
            if (isExit) {
              SystemNavigator.pop();
            }
            return isExit;
          },
          child: GetBuilder<BottomNavController>(
            builder: (navController) {
              final tabEntries = _tabEntries();
              _syncVisibleTabMapping();

              if (_tabIndexOutOfRange(tabEntries)) {
                final safeIndex = _safeVisibleIndex(tabEntries);
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!mounted) return;
                  navController.jumpToVisibleTab(safeIndex);
                });

                return Scaffold(
                  resizeToAvoidBottomInset: true,
                  backgroundColor: AppColors.appBackground,
                  body: const SizedBox.shrink(),
                );
              }

              final selectedEntry = _selectedEntry(
                tabEntries,
                navController.selectedIndex.value,
              );

              return Scaffold(
                resizeToAvoidBottomInset: true,
                backgroundColor: AppColors.appBackground,
                appBar: AppBar(
                  surfaceTintColor: AppColors.appBackground,
                  backgroundColor: AppColors.appBackground,
                  elevation: 0,
                  systemOverlayStyle: AppColors.systemOverlayStyle(),
                  automaticallyImplyLeading: false,
                  flexibleSpace: Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          image: DecorationImage(
                            image: AssetImage(Images.worldMapImage),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.appBackground.withOpacity(0.35),
                              AppColors.appBackground,
                            ],
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                          ),
                        ),
                      ),
                    ],
                  ),
                  title: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.w),
                    child: selectedEntry.originalIndex == 0
                        ? BlocConsumer<
                            UserProfileBloc,
                            ApiState<UserProfileModel>
                          >(
                            listener: (context, state) async {
                              if (state is ApiSuccess) {
                                global.sp =
                                    await SharedPreferences.getInstance();
                                await global.sp!.setString(
                                  "Currency",
                                  (state.data?.data?.currencyRate?.symbol ??
                                      '\$'),
                                );
                                global.activeCurrencysymbol = global.sp
                                    ?.getString("Currency");
                              }
                              if (state is ApiFailure) {
                                log(
                                  '❌ Login failed with error: ${state.error}',
                                );
                              }
                            },
                            builder: (context, state) {
                              Widget profileImageWidget;
                              if (state is ApiLoading) {
                                return Skeletonizer(
                                  enabled: true,
                                  child: profileDataWidget(
                                    profileImageWidget: Container(
                                      height: 10.w,
                                      width: 10.w,
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryColor
                                            .withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    userData: null,
                                  ),
                                );
                              }
                              if (state is ApiFailure) {
                                return _defaultProfileWidget();
                              }

                              if (state is ApiSuccess) {
                                final userData = state.data?.data;

                                final profileImageUrl = global.buildImageUrl(
                                  userData?.imagePath?.toString(),
                                );
                                final hasValidImage =
                                    profileImageUrl.isNotEmpty;
                                final isLocalProfileImage = global
                                    .isLocalImagePath(profileImageUrl);
                                if (hasValidImage) {
                                  profileImageWidget = isLocalProfileImage
                                      ? Container(
                                          height: 10.w,
                                          width: 10.w,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: AppColors.primaryColor,
                                            ),
                                            image: DecorationImage(
                                              image: FileImage(
                                                File(
                                                  profileImageUrl.replaceFirst(
                                                    'file://',
                                                    '',
                                                  ),
                                                ),
                                              ),
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                        )
                                      : CachedNetworkImage(
                                          imageUrl: profileImageUrl,
                                          placeholder: (context, url) =>
                                              const SizedBox(
                                                width: 10,
                                                height: 10,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                    ),
                                              ),
                                          errorWidget: (context, url, error) =>
                                              Container(
                                                height: 10.w,
                                                width: 10.w,
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  border: Border.all(
                                                    color:
                                                        AppColors.primaryColor,
                                                  ),
                                                  image: DecorationImage(
                                                    image: AssetImage(
                                                      Images.defaultProfile,
                                                    ),
                                                    fit: BoxFit.cover,
                                                  ),
                                                ),
                                              ),
                                          imageBuilder:
                                              (context, imageProvider) =>
                                                  Container(
                                                    height: 10.w,
                                                    width: 10.w,
                                                    decoration: BoxDecoration(
                                                      shape: BoxShape.circle,
                                                      image: DecorationImage(
                                                        image: imageProvider,
                                                        fit: BoxFit.cover,
                                                      ),
                                                    ),
                                                  ),
                                        );
                                } else {
                                  profileImageWidget = Container(
                                    height: 10.w,
                                    width: 10.w,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: AppColors.primaryColor,
                                      ),
                                      image: DecorationImage(
                                        image: AssetImage(
                                          Images.defaultProfile,
                                        ),
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  );
                                }
                                return profileDataWidget(
                                  profileImageWidget: profileImageWidget,
                                  userData: userData,
                                );
                              }
                              return _defaultProfileWidget();
                            },
                          )
                        : Text(
                            tr(_tabTitle(selectedEntry.originalIndex)),
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontWeight: FontWeight.normal,
                                  fontSize: 17.sp,
                                  color: AppColors.appTextPrimary,
                                ),
                          ),
                  ),
                ),
                body: SizedBox(
                  height: double.infinity,
                  child: PersistentTabView(
                    controller: persistancecontroller,
                    onTabChanged: (index) async {
                      final entries = _tabEntries();
                      final entry = _selectedEntry(entries, index);
                      final originalIndex = entry.originalIndex;
                      final isProtectedTab =
                          originalIndex == 1 || originalIndex == 3;

                      final isLoggedIn =
                          userService.currentUserData != null &&
                          userService
                                  .currentUserData
                                  ?.data
                                  ?.token
                                  ?.isNotEmpty ==
                              true;

                      if (isProtectedTab && !isLoggedIn) {
                        Get.offAll(() => LoginScreen());
                        return;
                      }

                      navController.jumpToVisibleTab(index);
                      debugPrint("Tab changed to $index");
                      _loadTabData(originalIndex);

                      if (originalIndex == 0) {
                        final homeController = Get.find<HomeController>();
                        homeController.isSelected[0] = true;
                        homeController.isSelected[1] = false;
                        homeController.update();
                      }
                    },
                    handleAndroidBackButtonPress: true,
                    stateManagement: false,
                    tabs: List.generate(tabEntries.length, (index) {
                      final entry = tabEntries[index];
                      if (entry.originalIndex == 4) {
                        // Profile Tab - show actual profile picture
                        return PersistentTabConfig(
                          screen: entry.screen,
                          item: ItemConfig(
                            activeForegroundColor: AppColors.primaryColor,
                            inactiveForegroundColor: AppColors.appTextSecondary,
                            title: tr(entry.title),
                            icon:
                                BlocBuilder<
                                  UserProfileBloc,
                                  ApiState<UserProfileModel>
                                >(
                                  builder: (context, state) {
                                    return _buildBottomNavProfileIcon(
                                      state,
                                      true,
                                    );
                                  },
                                ),
                            inactiveIcon:
                                BlocBuilder<
                                  UserProfileBloc,
                                  ApiState<UserProfileModel>
                                >(
                                  builder: (context, state) {
                                    return _buildBottomNavProfileIcon(
                                      state,
                                      false,
                                    );
                                  },
                                ),
                          ),
                        );
                      }

                      return PersistentTabConfig(
                        screen: entry.screen,
                        item: ItemConfig(
                          activeForegroundColor: AppColors.primaryColor,
                          inactiveForegroundColor: AppColors.appTextSecondary,
                          icon: _buildNavIcon(entry.activeIcon, true),
                          inactiveIcon: _buildNavIcon(entry.icon, false),
                          title: tr(entry.title),
                        ),
                      );
                    }),
                    navBarBuilder: (navBarConfig) => Style6BottomNavBar(
                      navBarDecoration: NavBarDecoration(
                        color: AppColors.appSurface,
                        border: Border(
                          top: BorderSide(color: AppColors.appBorder),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color:
                                (AppColors.isDarkMode
                                        ? Colors.black
                                        : const Color(0xff76968F))
                                    .withOpacity(
                                      AppColors.isDarkMode ? 0.24 : 0.12,
                                    ),
                            blurRadius: 18,
                            offset: const Offset(0, -8),
                          ),
                        ],
                      ),
                      navBarConfig: navBarConfig,
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  String _tabTitle(int index) {
    switch (index) {
      case 1:
        return 'Dial';
      case 2:
        return 'Data Packages';
      case 3:
        return 'My eSims';
      default:
        return 'My Profile';
    }
  }

  Widget _buildNavIcon(dynamic icon, bool isActive) {
    final color = isActive
        ? AppColors.primaryColor
        : AppColors.appTextSecondary;
    if (icon is IconData) {
      return Icon(icon, color: color, size: 6.w);
    }

    return Image.asset(icon as String, height: 6.w, color: color);
  }

  Widget _defaultProfileWidget() {
    return profileDataWidget(
      profileImageWidget: Container(
        height: 10.w,
        width: 10.w,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.primaryColor),
          image: DecorationImage(
            image: AssetImage(Images.defaultProfile),
            fit: BoxFit.cover,
          ),
        ),
      ),
      userData: null, // 👈 key point
    );
  }

  Widget _buildBottomNavProfileIcon(
    ApiState<UserProfileModel> state,
    bool isActive,
  ) {
    String? imagePath;
    if (state is ApiSuccess) {
      imagePath = state.data?.data?.imagePath;
    }

    final profileImageUrl = global.buildImageUrl(imagePath?.toString());
    final hasValidImage = profileImageUrl.isNotEmpty;
    final isLocalProfileImage = global.isLocalImagePath(profileImageUrl);

    return Container(
      height: 6.w,
      width: 6.w,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isActive ? AppColors.primaryColor : AppColors.appBorder,
          width: 1.5,
        ),
      ),
      child: ClipOval(
        child: hasValidImage
            ? isLocalProfileImage
                  ? Image.file(
                      File(profileImageUrl.replaceFirst('file://', '')),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          Image.asset(Images.defaultProfile, fit: BoxFit.cover),
                    )
                  : CachedNetworkImage(
                      imageUrl: profileImageUrl,
                      fit: BoxFit.cover,
                      errorWidget: (context, url, error) =>
                          Image.asset(Images.defaultProfile, fit: BoxFit.cover),
                    )
            : Image.asset(Images.defaultProfile, fit: BoxFit.cover),
      ),
    );
  }

  void _loadTabData(int index) {
    if (_loadedTabs.contains(index)) return;
    _loadedTabs.add(index);

    if (index == 2) {
      context.read<CountryBloc>().add(CountryEvent());
      context.read<RegionsListBloc>().add(RegionsListEvent());
    } else if (index == 3) {
      context.read<FetchEsimListbloc>().add(fetchEsimEvent());
    }
  }
}

class profileDataWidget extends StatelessWidget {
  profileDataWidget({
    super.key,
    required this.profileImageWidget,
    required this.userData,
  });
  final Widget profileImageWidget;
  final Data? userData;
  final userService = UserService.to;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        InkWell(
          onTap: () {
            Get.find<BottomNavController>().jumpToOriginalTab(4);
          },
          child: profileImageWidget,
        ),
        const SizedBox(width: 10),
        Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 36.w,
              height: 13.w,
              child: BlocBuilder<ThemeBloc, ThemeState>(
                builder: (context, themeState) {
                  final logoAsset = themeState.isDarkTheme
                      ? Images.ESimTel_TextLogo
                      : Images.ESimTel_TextLogoLight;
                  return Image.asset(
                    logoAsset,
                    key: ValueKey('g5-header-logo-$logoAsset'),
                    fit: BoxFit.contain,
                    alignment: Alignment.centerLeft,
                  );
                },
              ),
            ),
            Text(
              userData?.name ?? "User",
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                color: AppColors.appTextPrimary,
                fontSize: 15.sp,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        const Spacer(),
        BlocBuilder<ThemeBloc, ThemeState>(
          builder: (context, themeState) {
            final nextLabel = themeState.isDarkTheme
                ? "Light Mode"
                : "Dark Mode";
            return Tooltip(
              message: tr(nextLabel),
              child: InkWell(
                onTap: () {
                  context.read<ThemeBloc>().add(
                    ChangeThemeMode(!themeState.isDarkTheme),
                  );
                },
                borderRadius: BorderRadius.circular(100),
                child: Container(
                  height: 9.w,
                  width: 9.w,
                  decoration: BoxDecoration(
                    color: AppColors.appSurfaceAlt,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.appBorder),
                  ),
                  child: Icon(
                    themeState.isDarkTheme
                        ? Icons.light_mode_outlined
                        : Icons.dark_mode_outlined,
                    color: AppColors.appTextPrimary,
                    size: 18.sp,
                  ),
                ),
              ),
            );
          },
        ),
        SizedBox(width: 3.w),
        (userService.currentUserData == null ||
                userService.currentUserData!.data!.token == null)
            ? SizedBox()
            : InkWell(
                onTap: () {
                  if (userService.currentUserData == null ||
                      userService.currentUserData?.data?.token?.isEmpty ==
                          true) {
                    Get.to(() => LoginScreen());
                    return;
                  } else {
                    Get.to(() => NotificationScreen());
                  }
                },
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Image.asset(
                      Images.notificationIcon,
                      height: 7.w,
                      color: AppColors.appTextPrimary,
                    ),
                    userData?.unreadNotificationCount != null &&
                            userData?.unreadNotificationCount.toString() != "0"
                        ? Positioned(
                            top: -4,
                            right: -4,
                            child: Container(
                              padding: EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.redColor,
                              ),
                              child: Text(
                                "${userData?.unreadNotificationCount}",
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.white,
                                  fontWeight: FontWeight.normal,
                                ),
                              ),
                            ),
                          )
                        : SizedBox(),
                  ],
                ),
              ),
      ],
    );
  }
}

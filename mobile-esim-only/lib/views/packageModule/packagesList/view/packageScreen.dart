import 'dart:developer';
import 'package:esimconnect/utills/failurewidget.dart';
import 'package:esimconnect/utills/region_flag_avatar.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/packageModule/packagesList/view/packageListScreen.dart';
import 'package:esimconnect/views/packageModule/regionsList/view/regionListScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/packageModule/packagesList/bloc/country_bloc/countriesListbloc.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/country_bloc/country_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/controller/packagelistcontorller.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/countryListModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/model/regionsModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionList_bloc/region_bloc.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionList_bloc/region_event.dart';

class PackagesScreen extends StatefulWidget {
  const PackagesScreen({super.key});
  @override
  State<PackagesScreen> createState() => _PackagesScreenState();
}

class _PackagesScreenState extends State<PackagesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final packagelistcontroller = Get.find<PackageListController>();
  bool showLoadMoreHint = false;
  final scrollController = ScrollController();
  bool _eventsTriggered = false;
  List<Datum> validRegions = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      packagelistcontroller.searchController.addListener(_filterLists);
      _fetchPackageRoots();
    });

    scrollController.addListener(() {
      if (scrollController.position.pixels <
          scrollController.position.maxScrollExtent - 200) {
        if (!showLoadMoreHint) {
          setState(() => showLoadMoreHint = true);
        }
      } else {
        if (showLoadMoreHint) {
          setState(() => showLoadMoreHint = false);
        }
      }
    });
  }

  @override
  void dispose() {
    packagelistcontroller.searchController.removeListener(_filterLists);
    _tabController.dispose();
    super.dispose();
  }

  void _fetchPackageRoots() {
    if (_eventsTriggered) return;
    _eventsTriggered = true;
    context.read<CountryBloc>().add(CountryEvent());
    context.read<RegionsListBloc>().add(RegionsListEvent());
  }

  void _filterLists() {
    final query = packagelistcontroller.searchController.text.toLowerCase();
    if (query.isEmpty) {
      packagelistcontroller.filteredCountries =
          packagelistcontroller.allCountries;
      packagelistcontroller.filteredRegions = packagelistcontroller.allRegions;
    } else {
      packagelistcontroller.filteredCountries = packagelistcontroller
          .allCountries
          .where(
            (country) => country.name?.toLowerCase().contains(query) ?? false,
          )
          .toList();
      packagelistcontroller.filteredRegions = packagelistcontroller.allRegions
          .where(
            (region) => region.name?.toLowerCase().contains(query) ?? false,
          )
          .toList();
    }
    packagelistcontroller.update();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.appBackground,
      body: SafeArea(
        child: GetBuilder<PackageListController>(
          builder: (packagelistcontroller) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSearchBar(),
              _buildTabs(),
              SizedBox(height: 2.w),
              _buildTabView(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: packagelistcontroller.searchController,
        decoration: InputDecoration(
          hintText: tr("Search data packs for 200+ countries...."),
          prefixIcon: Container(
            padding: EdgeInsets.all(2.w),
            margin: EdgeInsets.all(2.w),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primaryColor.withOpacity(0.16),
            ),
            child: Icon(
              Icons.search,
              size: 18.sp,
              color: AppColors.primaryColor,
            ),
          ),
          hintStyle: TextStyle(
            fontSize: 14.sp,
            color: AppColors.appTextSecondary,
          ),
          filled: true,
          fillColor: AppColors.appSurface,
          contentPadding: EdgeInsets.symmetric(vertical: 1.w),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(30.w),
            borderSide: BorderSide(color: AppColors.appBorder, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(30.w),
            borderSide: BorderSide(color: AppColors.primaryColor, width: 1.2),
          ),
          suffixIcon: packagelistcontroller.searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(
                    Icons.close,
                    size: 18.sp,
                    color: AppColors.appTextSecondary,
                  ),
                  onPressed: () {
                    packagelistcontroller.searchController.clear();
                    setState(() {}); // refresh UI
                  },
                )
              : null,
        ),
        style: TextStyle(color: AppColors.appTextPrimary, fontSize: 14.sp),
      ),
    );
  }

  Widget _buildTabs() {
    return Container(
      height: 12.w,
      margin: EdgeInsets.symmetric(horizontal: 4.w),
      padding: EdgeInsets.symmetric(horizontal: 0.5.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: TabBar(
        controller: _tabController,
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorColor: Colors.transparent,
        dividerColor: Colors.transparent,
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(100),
          color: AppColors.primaryColor,
        ),
        indicatorPadding: EdgeInsets.symmetric(horizontal: 0.w, vertical: 2),
        labelPadding: EdgeInsets.zero,
        labelStyle: TextStyle(
          color: AppColors.appBackground,
          fontSize: 15.sp,
          fontWeight: FontWeight.normal,
        ),
        unselectedLabelStyle: TextStyle(
          color: AppColors.appTextSecondary,
          fontSize: 15.sp,
          fontWeight: FontWeight.normal,
        ),
        tabs: [
          Tab(text: tr("Countries")),
          Tab(text: tr('Regions')),
          Tab(text: tr('Global')),
        ],
        onTap: (index) {},
      ),
    );
  }

  Widget _buildTabView() {
    return Expanded(
      child: TabBarView(
        controller: _tabController,
        children: [
          // Countries Tab
          BlocBuilder<CountryBloc, ApiState<CountryListModel>>(
            builder: (context, state) {
              if (state is ApiLoading) {
                return Skeletonizer(
                  enabled: true,
                  child: _buildCountryList(
                    items: List.generate(
                      10,
                      (index) => Countries(
                        id: '0',
                        name: 'Country Name',
                        countryCode: 'US',
                        flagEmoji: '🏳️',
                      ),
                    ),
                    onTap: (country) {},
                  ),
                );
              } else if (state is ApiFailure) {
                return ApiFailureWidget(
                  onRetry: () {
                    context.read<CountryBloc>().add(CountryEvent());
                    context.read<RegionsListBloc>().add(RegionsListEvent());
                  },
                );
              } else if (state is ApiSuccess<CountryListModel>) {
                // Update the controller with the fetched data
                if (packagelistcontroller.allCountries.isEmpty) {
                  packagelistcontroller.allCountries = state.data.data ?? [];
                  packagelistcontroller.filteredCountries =
                      state.data.data ?? [];
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    packagelistcontroller.update();
                  });
                }

                return _buildCountryList(
                  items: packagelistcontroller.filteredCountries,
                  onTap: (country) {
                    Get.to(() => PackageListScreen(slug: country.slug ?? ''));
                  },
                );
              } else {
                return const SizedBox.shrink();
              }
            },
          ),
          // Regions Tab
          BlocListener<RegionsListBloc, ApiState<RegionsModel>>(
            listener: (context, state) {
              if (state is ApiInitial && !_eventsTriggered) {
                _fetchPackageRoots();
              }

              if (state is ApiSuccess<RegionsModel>) {
                packagelistcontroller.allRegions = state.data.data ?? [];
                _filterLists();
                log('Regions fetched: ${state.data.data?.length ?? 0}');
              }
            },
            child: BlocBuilder<RegionsListBloc, ApiState<RegionsModel>>(
              builder: (context, state) {
                if (state is ApiLoading) {
                  return Skeletonizer(
                    enabled: true,
                    child: _buildRegionList(
                      items: List.generate(
                        10,
                        (index) =>
                            Datum(id: '0', name: 'Region Name', image: ''),
                      ),
                      onTap: (_) {},
                    ),
                  );
                }

                if (state is ApiFailure) {
                  return ApiFailureWidget(
                    onRetry: () {
                      context.read<RegionsListBloc>().add(RegionsListEvent());
                    },
                  );
                }

                if (state is ApiSuccess<RegionsModel>) {
                  final regionItems =
                      packagelistcontroller.searchController.text.isEmpty
                      ? state.data.data ?? []
                      : packagelistcontroller.filteredRegions;
                  validRegions = regionItems
                      .where(
                        (element) =>
                            element.slug?.toLowerCase() != 'global' &&
                            element.minPrice != null &&
                            element.minPrice != "null",
                      )
                      .toList();
                  return _buildRegionList(
                    items: validRegions,
                    onTap: (region) {
                      Get.to(() => RegionListScreen(slug: region.slug ?? ''));
                    },
                  );
                }

                return const SizedBox.shrink();
              },
            ),
          ),
          // Global Tab
          BlocBuilder<RegionsListBloc, ApiState<RegionsModel>>(
            builder: (context, state) {
              if (state is ApiInitial && !_eventsTriggered) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _fetchPackageRoots();
                });
              }

              if (state is ApiLoading || state is ApiInitial) {
                return Skeletonizer(
                  enabled: true,
                  child: _buildGlobalList(
                    Datum(
                      slug: 'global',
                      name: 'Global',
                      minPrice: '0.00',
                      packageCount: 12,
                      countries: ['US', 'GB', 'FR'],
                    ),
                  ),
                );
              }

              if (state is ApiFailure) {
                return ApiFailureWidget(
                  onRetry: () {
                    context.read<RegionsListBloc>().add(RegionsListEvent());
                  },
                );
              }

              if (state is ApiSuccess<RegionsModel>) {
                return _buildGlobalList(
                  _findGlobalRegion(state.data.data ?? []) ??
                      Datum(slug: 'global', name: 'Global'),
                );
              }

              return _buildGlobalList(Datum(slug: 'global', name: 'Global'));
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCountryList({
    required List<Countries>? items,
    required Function(Countries) onTap,
  }) {
    if (items!.isEmpty &&
        packagelistcontroller.searchController.text.isNotEmpty) {
      return Center(
        child: Text(
          "No results found for",
          style: TextStyle(fontSize: 16.sp, color: AppColors.appTextPrimary),
        ).tr(args: [packagelistcontroller.searchController.text]),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<CountryBloc>().add(CountryEvent());
        context.read<RegionsListBloc>().add(RegionsListEvent());
      },
      child: Stack(
        children: [
          ListView.builder(
            itemCount: items.length,
            controller: scrollController,
            shrinkWrap: true,
            physics: const BouncingScrollPhysics(),
            padding: EdgeInsets.only(top: 5.w, left: 16, right: 16, bottom: 16),
            itemBuilder: (context, index) {
              final country = items[index];

              return GestureDetector(
                onTap: () => onTap(country),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.appSurface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(width: 1, color: AppColors.appBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.14),
                        blurRadius: 18,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 40,
                        height: 40,
                        child: Center(
                          child: Text(
                            country.flagEmoji ?? '🏳️',
                            style: TextStyle(fontSize: 24),
                          ),
                        ),
                      ),

                      const SizedBox(width: 12),

                      // Country Name and Price
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              country.name ?? '',
                              style: TextStyle(
                                fontSize: 16.sp,
                                fontWeight: FontWeight.normal,
                                color: AppColors.appTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            if (country.minPrice != null)
                              Text(
                                "${tr("From")} ${_formatPrice(country.minPrice)}",
                                style: TextStyle(
                                  fontSize: 15.sp,
                                  color: AppColors.appTextSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),

                      const SizedBox(width: 12),
                      Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: AppColors.appTextSecondary,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          if (showLoadMoreHint && items.length > 10)
            Positioned(
              right: 16,
              bottom: 16,
              child: GestureDetector(
                onTap: () {
                  scrollController.animateTo(
                    scrollController.offset + 200,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRegionList({
    required List<Datum> items,
    required Function(Datum) onTap,
  }) {
    if (items.isEmpty &&
        packagelistcontroller.searchController.text.isNotEmpty) {
      return Center(
        child: Text(
          "No results found for",
          style: TextStyle(fontSize: 16.sp, color: AppColors.appTextPrimary),
        ).tr(args: [packagelistcontroller.searchController.text]),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<CountryBloc>().add(CountryEvent());
        context.read<RegionsListBloc>().add(RegionsListEvent());
      },
      child: Stack(
        children: [
          ListView.builder(
            itemCount: items.length,
            controller: scrollController,
            shrinkWrap: true,
            physics: const BouncingScrollPhysics(),
            padding: EdgeInsets.only(top: 5.w, left: 16, right: 16, bottom: 16),
            itemBuilder: (context, index) {
              final region = items[index];
              log('Region images: ${global.buildImageUrl(region.image)}');
              return GestureDetector(
                onTap: () => onTap(region),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.appSurface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(width: 1, color: AppColors.appBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.14),
                        blurRadius: 18,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      RegionFlagAvatar(
                        imagePath: null,
                        countryCodes: region.countries,
                        size: 40,
                        backgroundColor: AppColors.appSurfaceAlt,
                        borderColor: AppColors.appBorder,
                        fallbackColor: AppColors.primaryColor,
                      ),

                      const SizedBox(width: 12),

                      // Region Name and Price
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              region.name ?? '',
                              style: TextStyle(
                                fontSize: 16.sp,
                                fontWeight: FontWeight.normal,
                                color: AppColors.appTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            if (region.minPrice != null &&
                                region.minPrice != "null")
                              Text(
                                _formatPrice(region.minPrice),
                                style: TextStyle(
                                  fontSize: 13.sp,
                                  color: AppColors.appTextSecondary,
                                ),
                              ),
                          ],
                        ),
                      ),

                      const SizedBox(width: 12),
                      Icon(
                        Icons.arrow_forward_ios,
                        size: 16,
                        color: AppColors.appTextSecondary,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          if (showLoadMoreHint && items.length > 10)
            Positioned(
              right: 16,
              bottom: 16,
              child: GestureDetector(
                onTap: () {
                  scrollController.animateTo(
                    scrollController.offset + 200,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGlobalList(Datum globalRegion) {
    if (!_matchesGlobalSearch()) {
      return Center(
        child: Text(
          "No results found for",
          style: TextStyle(fontSize: 16.sp, color: AppColors.appTextPrimary),
        ).tr(args: [packagelistcontroller.searchController.text]),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        context.read<RegionsListBloc>().add(RegionsListEvent());
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: EdgeInsets.only(top: 5.w, left: 16, right: 16, bottom: 16),
        children: [_buildGlobalCard(globalRegion)],
      ),
    );
  }

  Widget _buildGlobalCard(Datum globalRegion) {
    final countriesCount = globalRegion.countries?.length ?? 0;
    final packageCount = globalRegion.packageCount ?? 0;
    final hasPrice =
        globalRegion.minPrice != null && globalRegion.minPrice != "null";

    return GestureDetector(
      onTap: () => Get.to(() => RegionListScreen(slug: 'global')),
      child: Container(
        padding: EdgeInsets.all(5.w),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            colors: [
              AppColors.appSurface,
              AppColors.appAccentPurple.withOpacity(0.9),
              AppColors.appAccentBlue.withOpacity(0.72),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryColor.withOpacity(0.18),
              blurRadius: 28,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(
                  width: 13.w,
                  height: 13.w,
                  child: Icon(
                    Icons.public,
                    color: AppColors.whiteColor,
                    size: 27.sp,
                  ),
                ),
                SizedBox(width: 4.w),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        globalRegion.name ?? tr('Global'),
                        style: TextStyle(
                          color: AppColors.whiteColor,
                          fontSize: 20.sp,
                          fontWeight: FontWeight.normal,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 1.w),
                      Text(
                        hasPrice
                            ? '${tr("From")} ${_formatPrice(globalRegion.minPrice)}'
                            : tr('Worldwide coverage'),
                        style: TextStyle(
                          color: AppColors.whiteColor.withOpacity(0.86),
                          fontSize: 15.sp,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 18,
                  color: AppColors.whiteColor.withOpacity(0.9),
                ),
              ],
            ),
            SizedBox(height: 5.w),
            Wrap(
              spacing: 2.w,
              runSpacing: 2.w,
              children: [
                if (packageCount > 0)
                  _buildGlobalInfoPill(
                    icon: Icons.inventory_2_outlined,
                    label: '$packageCount ${tr("Packages")}',
                  ),
                if (countriesCount > 0)
                  _buildGlobalInfoPill(
                    icon: Icons.language,
                    label: '$countriesCount ${tr("Countries")}',
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGlobalInfoPill({required IconData icon, required String label}) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 1.6.w),
      decoration: BoxDecoration(
        color: AppColors.whiteColor.withOpacity(0.14),
        borderRadius: BorderRadius.circular(10.w),
        border: Border.all(color: AppColors.whiteColor.withOpacity(0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.whiteColor, size: 15.sp),
          SizedBox(width: 1.5.w),
          Text(
            label,
            style: TextStyle(
              color: AppColors.whiteColor,
              fontSize: 13.sp,
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Datum? _findGlobalRegion(List<Datum> regions) {
    for (final region in regions) {
      if (region.slug?.toLowerCase() == 'global') {
        return region;
      }
    }
    return null;
  }

  bool _matchesGlobalSearch() {
    final query = packagelistcontroller.searchController.text
        .trim()
        .toLowerCase();
    if (query.isEmpty) return true;
    return 'global'.contains(query) ||
        'worldwide'.contains(query) ||
        'world'.contains(query) ||
        'international'.contains(query);
  }

  String _formatPrice(dynamic price) {
    if (price == null) return "N/A";

    if (price is String) {
      final numValue = double.tryParse(price);
      if (numValue != null) {
        return "${global.activeCurrencysymbol} ${numValue.toStringAsFixed(2)}";
      }
      return "${global.activeCurrencysymbol} $price";
    } else if (price is num) {
      return "${global.activeCurrencysymbol} ${price.toStringAsFixed(2)}";
    }
    return "N/A";
  }
}

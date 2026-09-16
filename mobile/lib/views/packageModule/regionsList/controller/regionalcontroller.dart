import 'package:get/get.dart';
import 'package:esimconnect/views/packageModule/regionsList/model/regionDetailsModel.dart';

enum FilterType {
  none,
  priceLowToHigh,
  priceHighToLow,
  unlimitedPlans,
  dataPack,
}

class RegionalListController extends GetxController {
  int selectedindex = 0;
  bool isLoadingMore = false;
  List<Package> regionalList = [];
  Region? regionData;

  // Filter state
  FilterType selectedFilter = FilterType.none;

  // Pagination state
  int currentPage = 1;
  bool hasMorePages = true;
  int limit = 5;
  bool showLoadMoreHint = false;
  bool isInitialLoading = false;

  // Method to update pagination state
  void updatePaginationState({
    int? newCurrentPage,
    bool? newHasMorePages,
    bool? newIsLoadingMore,
    bool? newIsInitialLoading,
    bool? newShowLoadMoreHint,
    FilterType? newSelectedFilter,
  }) {
    if (newCurrentPage != null) currentPage = newCurrentPage;
    if (newHasMorePages != null) hasMorePages = newHasMorePages;
    if (newIsLoadingMore != null) isLoadingMore = newIsLoadingMore;
    if (newIsInitialLoading != null) isInitialLoading = newIsInitialLoading;
    if (newShowLoadMoreHint != null) showLoadMoreHint = newShowLoadMoreHint;
    if (newSelectedFilter != null) selectedFilter = newSelectedFilter;
    update();
  }

  // Method to reset all state
  void resetAllState() {
    regionalList.clear();
    regionData = null;
    currentPage = 1;
    hasMorePages = true;
    isLoadingMore = false;
    isInitialLoading = false;
    showLoadMoreHint = false;
    selectedindex = 0;
    selectedFilter = FilterType.none;
    update();
  }

  // Method to add packages with pagination
  void addPackagesWithPagination({
    required List<Package> newPackages,
    required Region? region,
    required int page,
    required bool hasNextPage,
  }) {
    if (page == 1) {
      regionalList = newPackages;
    } else {
      regionalList.addAll(newPackages);
    }

    // Update region data if available
    if (region != null) {
      regionData = region;
    }

    // Update pagination state
    currentPage = page;
    hasMorePages = hasNextPage;
    isLoadingMore = false;
    isInitialLoading = false;

    update();
  }

  // Method to update selected index
  void updateSelectedIndex(int index) {
    selectedindex = index;
    update();
  }

  // Method to update filter
  void updateSelectedFilter(FilterType filter) {
    selectedFilter = filter;
    update();
  }
}
// enum FilterType {
//   none,
//   priceLowToHigh,
//   priceHighToLow,
//   unlimitedPlans,
//   dataPack,
// }

// class RegionalListController extends GetxController {
//   bool showLoadMoreHint = false;
//   String? nextPageUrl;
//   int selectedindex = 0;
//   bool isLoadingMore = false;
//   RegionData regionDatailsList = RegionData();
//   Region? currentRegion = Region();
//   FilterType selectedFilter = FilterType.none;
// }

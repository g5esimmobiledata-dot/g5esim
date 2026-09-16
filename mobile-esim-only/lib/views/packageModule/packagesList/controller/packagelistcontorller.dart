import 'package:esimconnect/views/packageModule/packagesList/model/packageListModel.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/countryListModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/model/regionsModel.dart';

enum FilterType {
  none,
  priceLowToHigh,
  priceHighToLow,
  unlimitedPlans,
  dataPack,
}

class PackageListController extends GetxController {
  int selectedindex = 0;
  bool isLoadingMore = false;
  List<Package> packageListdata = [];
  final searchController = TextEditingController();
  List<Countries> allCountries = [];
  List<Datum> allRegions = [];
  List<Countries> filteredCountries = [];
  List<Datum> filteredRegions = [];
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
  }) {
    if (newCurrentPage != null) currentPage = newCurrentPage;
    if (newHasMorePages != null) hasMorePages = newHasMorePages;
    if (newIsLoadingMore != null) isLoadingMore = newIsLoadingMore;
    if (newIsInitialLoading != null) isInitialLoading = newIsInitialLoading;
    if (newShowLoadMoreHint != null) showLoadMoreHint = newShowLoadMoreHint;
    update();
  }

  void resetAllState() {
    packageListdata.clear();
    currentPage = 1;
    hasMorePages = true;
    isLoadingMore = false;
    isInitialLoading = false;
    showLoadMoreHint = false;
    selectedindex = 0;
    update();
  }

  void addPackagesWithPagination({
    required List<Package> newPackages,
    required int page,
    required bool hasNextPage,
  }) {
    if (page == 1) {
      packageListdata = newPackages;
    } else {
      packageListdata.addAll(newPackages);
    }

    // Update pagination state
    currentPage = page;
    hasMorePages = hasNextPage;
    isLoadingMore = false;
    isInitialLoading = false;

    update();
  }

  void updateSelectedIndex(int index) {
    selectedindex = index;
    update();
  }
}

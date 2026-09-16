import 'package:esimconnect/utills/global.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';
import '../views/bottomNavBarScreen.dart';

class BottomNavController extends GetxController {
  RxInt selectedIndex = 0.obs;
  DateTime? currentBackPressTime;
  PersistentTabController? globalController;
  final Map<int, int> _originalToVisibleTabIndex = {0: 0};
  int _visibleTabCount = 1;

  void setVisibleTabOriginalIndices(List<int> originalIndices) {
    final safeOriginalIndices = originalIndices.isEmpty
        ? <int>[0]
        : originalIndices;
    _visibleTabCount = safeOriginalIndices.length;
    _originalToVisibleTabIndex
      ..clear()
      ..addEntries(
        safeOriginalIndices.asMap().entries.map(
          (entry) => MapEntry(entry.value, entry.key),
        ),
      );

    final safeIndex = _clampVisibleIndex(selectedIndex.value);
    if (safeIndex != selectedIndex.value) {
      selectedIndex.value = safeIndex;
    }
  }

  int visibleIndexForOriginal(int originalIndex) {
    return _originalToVisibleTabIndex[originalIndex] ?? 0;
  }

  void jumpToVisibleTab(int index) {
    final safeIndex = _clampVisibleIndex(index);
    selectedIndex.value = safeIndex;
    if (globalController != null && globalController!.index != safeIndex) {
      globalController!.jumpToTab(safeIndex);
    }
    update();
  }

  void jumpToOriginalTab(int originalIndex) {
    jumpToVisibleTab(visibleIndexForOriginal(originalIndex));
  }

  void jumpToTab(int index) {
    jumpToVisibleTab(index);
  }

  int _clampVisibleIndex(int index) {
    if (_visibleTabCount <= 0) return 0;
    if (index < 0) return 0;
    if (index >= _visibleTabCount) return _visibleTabCount - 1;
    return index;
  }

  void navigateToTab(int originalIndex) {
    jumpToOriginalTab(originalIndex);
    Get.off(
      () => BottomNavigationBarScreen(key: UniqueKey(), index: originalIndex),
    );
  }

  Future<bool> onBackPressed() {
    DateTime now = DateTime.now();
    if (currentBackPressTime == null ||
        now.difference(currentBackPressTime!) > const Duration(seconds: 2)) {
      currentBackPressTime = now;
      showToastMessage(message: tr("Press again to exit"));
      return Future.value(false);
    }
    return Future.value(true);
  }

  @override
  void onClose() {
    globalController?.dispose();
    super.onClose();
  }
}

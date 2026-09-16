import 'package:esimconnect/views/homeModule/deviceinfo/model/deviceInfoModel.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import '../../../../core/bloc/api_state.dart';
import '../../../../utills/failurewidget.dart';
import '../device_info_bloc/device_info_bloc.dart';
import '../device_info_bloc/device_info_event.dart';

class DeviceInfoScreen extends StatefulWidget {
  const DeviceInfoScreen({super.key});

  @override
  State<DeviceInfoScreen> createState() => _DeviceInfoScreenState();
}

class _DeviceInfoScreenState extends State<DeviceInfoScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  List<DeviceData> _allDevices = [];
  List<DeviceData> _filteredDevices = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_filterDevices);
    // Trigger the event to fetch data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<Devicebloc>().add(DeviceEvent());
    });
  }

  void _filterDevices() {
    final query = _searchController.text.toLowerCase();

    setState(() {
      _isSearching = query.isNotEmpty;
      if (query.isEmpty) {
        _filteredDevices = _allDevices;
      } else {
        _filteredDevices = _allDevices.where((device) {
          return (device.name ?? '').toLowerCase().contains(query) ||
              (device.brand ?? '').toLowerCase().contains(query) ||
              (device.os?.name ?? '').toLowerCase().contains(query);
        }).toList();
      }
    });
  }

  void _clearSearch() {
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() => _isSearching = false);
  }

  Widget getOSIcon(String? os) {
    switch (os?.toLowerCase()) {
      case 'android':
        return Icon(Icons.android, color: Colors.green, size: 18);
      case 'ios':
        return Icon(Icons.apple, color: Colors.black, size: 18);
      case 'windows':
        return Icon(Icons.window, color: Colors.blue, size: 18);
      default:
        return Icon(Icons.smartphone, color: Colors.grey, size: 18);
    }
  }

  Color _getOSColor(String? os) {
    switch (os?.toLowerCase()) {
      case 'android':
        return Color(0xFF3DDC84); // Android Green
      case 'ios':
        return Color(0xFF000000); // iOS Black
      case 'windows':
        return Color(0xFF0078D4); // Windows Blue
      default:
        return AppColors.primaryColor;
    }
  }

  @override
  void dispose() {
    _searchController.removeListener(_filterDevices);
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: BlocConsumer<Devicebloc, ApiState<DeviceInfoModel>>(
          listener: (context, state) {
            if (state is ApiSuccess<DeviceInfoModel>) {
              setState(() {
                _allDevices = state.data.data ?? [];
                _filteredDevices = _allDevices;
              });
            }
          },
          builder: (context, state) {
            return Column(
              children: [
                // Header with Search
                _buildHeader(state),

                // Content
                Expanded(child: _buildContent(state)),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader(ApiState<DeviceInfoModel> state) {
    final deviceCount = state is ApiSuccess<DeviceInfoModel>
        ? _allDevices.length
        : 0;

    return Container(
      padding: EdgeInsets.fromLTRB(2.w, 1.h, 2.w, 1.h),
      margin: EdgeInsets.symmetric(horizontal: 3.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(12),
          bottomRight: Radius.circular(12),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 15,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Title Row
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: EdgeInsets.all(3.w),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.arrow_back_ios_new_rounded,
                    size: 18.sp,
                    color: AppColors.primaryColor,
                  ),
                ),
              ),
              SizedBox(width: 4.w),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Device Compatibility'.tr(),
                      style: TextStyle(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.textColor,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: 0.5.h),
                    Text(
                      state is ApiSuccess<DeviceInfoModel>
                          ? '$deviceCount ${tr("devices supported")}'
                          : tr("Loading devices..."),
                      style: TextStyle(
                        fontSize: 14.sp,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: EdgeInsets.all(3.w),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primaryColor.withOpacity(0.1),
                      AppColors.primaryColor.withOpacity(0.2),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  Icons.phonelink_rounded,
                  size: 22.sp,
                  color: AppColors.primaryColor,
                ),
              ),
            ],
          ),

          SizedBox(height: 3.h),

          // Search Bar (only show when data is loaded)
          if (state is! ApiLoading || _allDevices.isNotEmpty)
            Container(
              margin: EdgeInsets.symmetric(horizontal: 2.w),
              child: TextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
                decoration: InputDecoration(
                  hintText: 'Search devices...'.tr(),
                  hintStyle: TextStyle(
                    fontSize: 13.sp,
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w400,
                  ),
                  prefixIcon: Padding(
                    padding: EdgeInsets.all(3.w),
                    child: Icon(
                      Icons.search_rounded,
                      color: AppColors.primaryColor,
                      size: 20.sp,
                    ),
                  ),
                  suffixIcon: _isSearching
                      ? IconButton(
                          onPressed: _clearSearch,
                          icon: Icon(
                            Icons.close_rounded,
                            color: Colors.grey.shade500,
                            size: 18.sp,
                          ),
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: EdgeInsets.symmetric(vertical: 2.5.h),
                ),
                style: TextStyle(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.normal,
                  color: AppColors.textColor,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent(ApiState<DeviceInfoModel> state) {
    if (state is ApiLoading && _allDevices.isEmpty) {
      return _buildLoadingSkeleton();
    } else if (state is ApiFailure && _allDevices.isEmpty) {
      return ApiFailureWidget(
        error: state.error,
        onRetry: () {
          context.read<Devicebloc>().add(DeviceEvent());
        },
      );
    } else if (state is ApiSuccess<DeviceInfoModel>) {
      return _filteredDevices.isEmpty ? _buildEmptyState() : _buildDeviceList();
    } else if (state is ApiInitial) {
      return Center(
        child: CircularProgressIndicator(color: AppColors.primaryColor),
      );
    }

    return SizedBox.shrink();
  }

  Widget _buildLoadingSkeleton() {
    return ListView.builder(
      padding: EdgeInsets.symmetric(horizontal: 5.w, vertical: 3.h),
      itemCount: 6,
      itemBuilder: (context, index) {
        return Container(
          margin: EdgeInsets.only(bottom: 2.h),
          child: Skeletonizer(
            enabled: true,
            child: Container(
              padding: EdgeInsets.all(4.w),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 12.w,
                    height: 12.w,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  SizedBox(width: 4.w),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          height: 14.sp,
                          width: 50.w,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        SizedBox(height: 1.h),
                        Container(
                          height: 10.sp,
                          width: 30.w,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 20.w,
                    height: 4.h,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 30.w,
            height: 30.w,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.device_unknown_rounded,
              size: 15.w,
              color: Colors.grey.shade400,
            ),
          ),
          SizedBox(height: 4.h),
          Text(
            'No Devices Found',
            style: TextStyle(
              fontSize: 18.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.textColor,
            ),
          ),
          SizedBox(height: 1.h),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 15.w),
            child: Text(
              _isSearching
                  ? 'No results for "${_searchController.text}"\nTry different search terms'
                  : 'Devices list is empty',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.sp,
                color: Colors.grey.shade600,
                height: 1.5,
              ),
            ),
          ),
          if (_isSearching) ...[
            SizedBox(height: 3.h),
            GestureDetector(
              onTap: _clearSearch,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 1.8.h),
                decoration: BoxDecoration(
                  color: AppColors.primaryColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Clear Search',
                  style: TextStyle(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.normal,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDeviceList() {
    return ListView.builder(
      padding: EdgeInsets.fromLTRB(2.w, 2.h, 2.w, 2.h),
      itemCount: _filteredDevices.length,
      itemBuilder: (context, index) {
        final device = _filteredDevices[index];
        return _buildDeviceCard(device);
      },
    );
  }

  Widget _buildDeviceCard(DeviceData device) {
    return Container(
      margin: EdgeInsets.only(bottom: 2.h),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        elevation: 1,
        shadowColor: Colors.black.withOpacity(0.1),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            HapticFeedback.lightImpact();
          },
          child: Padding(
            padding: EdgeInsets.all(4.w),
            child: Row(
              children: [
                // OS Icon
                Container(
                  width: 15.w,
                  height: 15.w,
                  decoration: BoxDecoration(
                    color: _getOSColor(device.os?.name).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(1.w),
                  ),
                  child: Center(child: getOSIcon(device.os?.name)),
                ),

                SizedBox(width: 1.w),
                // Device Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        device.name ?? 'Unknown Device',
                        style: TextStyle(
                          fontSize: 15.sp,
                          fontWeight: FontWeight.normal,
                          color: AppColors.textColor,
                        ),
                        maxLines: 2,
                        softWrap: true,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(height: 0.5.h),
                      Row(
                        children: [
                          _buildInfoChip(
                            icon: Icons.business_rounded,
                            text: device.brand ?? 'Unknown Brand',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // OS Badge
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: 3.w,
                    vertical: 0.8.h,
                  ),
                  decoration: BoxDecoration(
                    color: _getOSColor(device.os?.name).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    device.os?.name.toUpperCase() ?? 'UNKNOWN',
                    style: TextStyle(
                      fontSize: 13.sp,
                      fontWeight: FontWeight.normal,
                      color: _getOSColor(device.os?.name),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip({required IconData icon, required String text}) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 1.w, vertical: 0.5.h),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13.sp, color: Colors.grey.shade600),
          SizedBox(width: 1),
          Text(
            text,
            style: TextStyle(
              fontSize: 14.sp,
              fontWeight: FontWeight.w400,
              color: Colors.grey.shade700,
            ),
            maxLines: 2,
            softWrap: true,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/delete_bloc.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/mark_event.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/markall_bloc.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/noti_bloc.dart';
import 'package:esimconnect/views/notificationModule/noti_bloc/noti_event.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';
import '../../../utills/failurewidget.dart';
import '../../../widgets/customDialogWidget.dart';
import '../../navbarModule/bloc/navbar_bloc.dart';
import '../../profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import '../../profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import '../model/NotificationResponse.dart';
import '../noti_bloc/delete_event.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final scrollController = ScrollController();
  int _currentPage = 1;
  int _totalPages = 1;
  bool _isLoadingMore = false;
  bool _isInitialLoading = true;
  List<NotificationItem> _notificationList = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      _fetchNotifications();
      scrollController.addListener(_onScroll);
    });
  }

  void _fetchNotifications({bool loadMore = false}) {
    if (loadMore) {
      if (_currentPage >= _totalPages) return;
      _isLoadingMore = true;
      _currentPage++;
    } else {
      _isInitialLoading = true;
      _currentPage = 1;
      _notificationList.clear();
    }
    context.read<markAllreadBloc>().add(markEvent());
    context.read<FetchNotificationbloc>().add(
      fetchNotiEvent(isAllread: false, page: _currentPage.toString()),
    );
  }

  void _onScroll() {
    if (scrollController.position.pixels ==
        scrollController.position.maxScrollExtent) {
      if (!_isLoadingMore && _currentPage < _totalPages) {
        _fetchNotifications(loadMore: true);
      }
    }
  }

  void _handleStateUpdate(ApiState<NotificationResponse> state) {
    if (state is ApiSuccess<NotificationResponse>) {
      setState(() {
        if (state.data.data?.pagination != null) {
          _totalPages = state.data.data!.pagination!.totalPages ?? 1;
        }

        if (_currentPage == 1) {
          _notificationList = state.data.data?.notifications ?? [];
        } else {
          final newNotifications = state.data.data?.notifications ?? [];
          _notificationList.addAll(newNotifications);
        }

        _isInitialLoading = false;
        _isLoadingMore = false;
      });
    } else if (state is ApiFailure) {
      setState(() {
        _isInitialLoading = false;
        _isLoadingMore = false;
      });
    } else if (state is ApiLoading) {
      if (_notificationList.isNotEmpty) {
        _isLoadingMore = true;
      }
    }
  }

  @override
  void dispose() {
    scrollController.dispose();
    super.dispose();
  }

  Widget _buildNotificationItem(BuildContext context, NotificationItem item) {
    final isUnread = !(item.read ?? false);

    return Container(
      margin: EdgeInsets.only(bottom: 1.5.w),
      padding: EdgeInsets.symmetric(horizontal: 3.w, vertical: 3.w),
      decoration: BoxDecoration(
        color: isUnread
            ? AppColors.primaryColor.withOpacity(0.14)
            : AppColors.appSurface,
        borderRadius: BorderRadius.circular(2.w),
        border: Border.all(
          color: isUnread
              ? AppColors.primaryColor.withOpacity(0.45)
              : AppColors.appBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.title ?? 'Notification',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 16.sp,
                    color: AppColors.appTextPrimary,
                    fontWeight: FontWeight.normal,
                  ),
                ).tr(),
              ),
              if (!(item.read ?? false))
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppColors.primaryColor,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
          SizedBox(height: 1.w),
          Text(
            item.message ?? '',
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 15.sp,
              color: AppColors.appTextSecondary,
              fontWeight: FontWeight.normal,
            ),
          ),
          SizedBox(height: 1.w),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              item.createdAt != null ? item.createdAt!.toIso8601String() : '',
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                fontSize: 13.sp,
                color: AppColors.appTextSecondary,
                fontWeight: FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonLoading() {
    return ListView.builder(
      padding: EdgeInsets.symmetric(horizontal: 2.w, vertical: 4.w),
      itemCount: 6,
      itemBuilder: (context, index) {
        return Skeletonizer(
          enabled: true,
          child: Container(
            height: 10.h,
            margin: EdgeInsets.only(bottom: 1.w),
            padding: EdgeInsets.all(2.w),
            decoration: BoxDecoration(
              color: AppColors.appSurface,
              borderRadius: BorderRadius.circular(2.w),
              border: Border.all(color: AppColors.appBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 2.w,
                  width: 60.w,
                  color: AppColors.appSurfaceSoft,
                ),
                SizedBox(height: 1.5.w),
                Container(
                  height: 2.w,
                  width: 40.w,
                  color: AppColors.appSurfaceSoft,
                ),
                SizedBox(height: 1.5.w),
                Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    height: 2.w,
                    width: 20.w,
                    color: AppColors.appSurfaceSoft,
                  ),
                ),
              ],
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
          Icon(
            Icons.notifications_none_outlined,
            color: AppColors.appTextSecondary,
            size: 64,
          ),
          const SizedBox(height: 16),
          Text(
            'No notifications Yet',
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              color: AppColors.appTextPrimary,
              fontSize: 18,
            ),
          ).tr(),
          const SizedBox(height: 8),
          Text(
            'When you get notifications',
            style: Theme.of(
              context,
            ).textTheme.bodySmall!.copyWith(color: AppColors.appTextSecondary),
          ).tr(),
        ],
      ),
    );
  }

  Widget _buildNotificationsList() {
    final filteredList = _notificationList
        .where((item) => item.type != "ticket_reply")
        .toList();

    if (filteredList.isEmpty && !_isInitialLoading) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: () async {
        _fetchNotifications();
      },
      child: ListView.builder(
        controller: scrollController,
        padding: EdgeInsets.symmetric(horizontal: 2.w, vertical: 4.w),
        itemCount: filteredList.length + (_isLoadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == filteredList.length) {
            return _buildLoadMoreIndicator();
          }
          return _buildNotificationItem(context, filteredList[index]);
        },
      ),
    );
  }

  Widget _buildLoadMoreIndicator() {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4.w),
      child: Center(
        child: Column(
          children: [
            CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primaryColor,
            ),
            SizedBox(height: 8),
            Text(
              'Loading more...',
              style: TextStyle(
                color: AppColors.appTextSecondary,
                fontSize: 12.sp,
              ),
            ).tr(),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<FetchNotificationbloc, ApiState<NotificationResponse>>(
          listener: (context, state) {
            _handleStateUpdate(state);
          },
        ),
        BlocListener<DeleteBloc, ApiState>(
          listener: (context, state) {
            if (state is ApiSuccess) {
              Get.snackbar(
                tr('Success'),
                tr("All notifications deleted successfully"),
                backgroundColor: Colors.green,
                colorText: Colors.white,
              );
              setState(() {
                _notificationList.clear();
                _currentPage = 1;
              });
              _fetchNotifications();
            } else if (state is ApiFailure) {
              Get.snackbar(
                tr('Error'),
                state.error ?? tr('Failed to delete notifications'),
                backgroundColor: Colors.red,
                colorText: Colors.white,
              );
            }
          },
        ),
      ],
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(
          title: const Text("Notifications").tr(),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_outlined),
            onPressed: () => {
              print("back to home"),
              context.read<UserProfileBloc>().add(UserProfileEvent()),
              Get.back(),
              Get.find<BottomNavController>().jumpToTab(0),
            },
          ),
          actions: [
            BlocBuilder<FetchNotificationbloc, ApiState<NotificationResponse>>(
              builder: (context, state) {
                // final unreadCount = state is ApiSuccess<NotificationResponse>
                //     ? state.data.data?.unreadCount ?? 0
                //     : 0;

                // if (unreadCount > 0) {
                //   return Container(
                //     margin: EdgeInsets.only(right: 16),
                //     padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                //     decoration: BoxDecoration(
                //       color: AppColors.primaryColor,
                //       borderRadius: BorderRadius.circular(12),
                //     ),
                //     child: Text(
                //       '$unreadCount',
                //       style: TextStyle(
                //         color: Colors.white,
                //         fontSize: 12,
                //         fontWeight: FontWeight.normal,
                //       ),
                //     ),
                //   );
                // }
                return SizedBox();
              },
            ),
            Container(
              margin: EdgeInsets.only(right: 4.w),
              height: 40,
              width: 40,
              decoration: BoxDecoration(
                color: AppColors.appSurfaceSoft,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.appBorder),
              ),
              child: IconButton(
                padding: EdgeInsets.zero,
                icon: Icon(
                  Icons.delete_outline_rounded,
                  color: AppColors.appTextPrimary,
                  size: 20.sp,
                ),
                onPressed: () {
                  print("delete clicked");
                  _deleteNotifications();
                },
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body:
            BlocBuilder<FetchNotificationbloc, ApiState<NotificationResponse>>(
              builder: (context, state) {
                if (_isInitialLoading && _notificationList.isEmpty) {
                  return _buildSkeletonLoading();
                }

                if (state is ApiFailure && _notificationList.isEmpty) {
                  return ApiFailureWidget(
                    onRetry: () {
                      _fetchNotifications();
                    },
                  );
                }

                return _buildNotificationsList();
              },
            ),
      ),
    );
  }

  void _deleteNotifications() {
    showCustomDialog(
      title: tr("Delete"),
      subtitle: tr("Are you sure you want to Delete?"),
      primaryButtonText: tr("Delete"),
      secondaryButtonText: tr("Cancel"),
      onSecondaryPressed: () {
        Get.back();
      },
      onPrimaryPressed: () async {
        Get.back();
        context.read<DeleteBloc>().add(deleteEvent());
      },
    );
  }
}

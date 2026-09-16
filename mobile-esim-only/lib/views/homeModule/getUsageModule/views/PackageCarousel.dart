import 'package:esimconnect/views/homeModule/getUsageModule/views/packageCard.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import '../../../../utills/services/ApiService.dart';
import '../../../topUpModule/topup_bloc/topupbloc.dart';
import '../../../topUpModule/topup_bloc/topupfeatchevent.dart';
import '../../../topUpModule/view/topupscreen.dart';
import 'package:esimconnect/views/homeModule/getUsageModule/model/dataUsage_Model.dart';

class PackageCarousel extends StatefulWidget {
  final List<Datum> data;
  final bool isLoading;

  const PackageCarousel({Key? key, required this.data, this.isLoading = false})
    : super(key: key);

  @override
  State<PackageCarousel> createState() => _PackageCarouselState();
}

class _PackageCarouselState extends State<PackageCarousel> {
  final PageController _pageController = PageController(viewportFraction: 0.85);
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      int? next = _pageController.page?.round();
      if (next != null && _currentPage != next) {
        setState(() {
          _currentPage = next;
        });
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.data.isEmpty) {
      return _buildEmptyState();
    }

    return Column(
      children: [
        SizedBox(
          height: 32.h,
          child: PageView.builder(
            controller: _pageController,
            itemCount: widget.data.length,
            itemBuilder: (context, index) {
              final datum = widget.data[index];
              final usage = datum.usage;
              if (usage == null) return _buildNoUsageCard();

              return AnimatedPadding(
                duration: const Duration(milliseconds: 300),
                padding: EdgeInsets.all(_currentPage == index ? 0 : 2.w),
                child: Transform.scale(
                  scale: _currentPage == index ? 1.0 : 0.95,
                  child: PackageDetailCard(
                    datum: datum,
                    usage: usage,
                    isloadingState: widget.isLoading,
                    onCardTap: () {
                      Get.to(
                        () => BlocProvider(
                          create: (context) => TopUpBloc(
                            ApiService(),
                          )..add(TopUpFetchEvent(ccid: datum.iccid.toString())),
                          child: TopUpScreen(iccid: datum.iccid.toString()),
                        ),
                      );
                    },
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        widget.data.length > 1
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  widget.data.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    width: _currentPage == index ? 24.0 : 8.0,
                    height: 8.0,
                    margin: const EdgeInsets.symmetric(horizontal: 4.0),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: _currentPage == index
                          ? Theme.of(context).primaryColor
                          : Colors.grey.withOpacity(0.5),
                    ),
                  ),
                ),
              )
            : const SizedBox.shrink(),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Container(
      height: 30.h,
      margin: EdgeInsets.symmetric(horizontal: 4.w),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(2.w),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.blue.shade50, Colors.purple.shade50],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.sim_card_outlined,
              size: 48.sp,
              color: Colors.grey.shade400,
            ),
            SizedBox(height: 2.h),
            Text(
              'No Packages Available',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(color: Colors.grey.shade600),
            ),
            SizedBox(height: 1.h),
            Text(
              'Add a new eSIM package to get started',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoUsageCard() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 2.w),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(2.w),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 32.sp, color: Colors.orange),
            SizedBox(height: 2.h),
            Text(
              'Usage Data Unavailable',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade700),
            ),
            SizedBox(height: 1.h),
            Text(
              'Please check back later',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }
}


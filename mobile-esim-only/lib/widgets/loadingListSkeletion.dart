import 'package:cached_network_image/cached_network_image.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'package:skeletonizer/skeletonizer.dart';

class LoadingListSkeletion extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final bool isLoading;

  const LoadingListSkeletion({
    super.key,
    this.imageUrl,
    this.name,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: 8,
      itemBuilder: (context, index) {
        return Skeletonizer(
          enabled: isLoading,
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(2.w),
              border: Border.all(width: 0.2, color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                if (!isLoading)
                  CachedNetworkImage(
                    imageUrl: imageUrl ?? '',
                    placeholder: (context, url) => const SizedBox(
                      width: 32,
                      height: 32,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    errorWidget: (context, url, error) =>
                        Image.asset(Images.earthImage, width: 40, height: 40),
                    imageBuilder: (context, imageProvider) => Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        image: DecorationImage(
                          image: imageProvider,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  )
                else
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.grey.shade200,
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(name ?? '', style: TextStyle(fontSize: 16.sp)),
                ),
                const Icon(Icons.arrow_forward_ios, size: 16),
              ],
            ),
          ),
        );
      },
    );
  }
}

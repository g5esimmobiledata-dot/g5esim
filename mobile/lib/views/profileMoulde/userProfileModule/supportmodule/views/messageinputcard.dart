import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class MessageInput extends StatelessWidget {
  final TextEditingController titleController;
  final TextEditingController subTitleController;
  final bool istitleRequired;
  final VoidCallback onSend;
  final bool canSend;

  const MessageInput({
    super.key,
    required this.titleController,
    required this.subTitleController,
    required this.onSend,
    required this.istitleRequired,
    required this.canSend,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: SizedBox(
        height: istitleRequired ? 12.h : 8.h,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            istitleRequired
                ? Expanded(
                    child: SizedBox(
                      width: 80.w,
                      child: TextField(
                        controller: titleController,
                        enabled: canSend,
                        decoration: InputDecoration(
                          contentPadding: EdgeInsets.all(2.w),
                          isDense: true,
                          hintStyle: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.greyColor,
                              ),
                          hintText: 'Title',
                          border: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: AppColors.dividerColor,
                              width: 0.5,
                            ),
                            borderRadius: BorderRadius.circular(30.w),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: AppColors.dividerColor,
                              width: 0.5,
                            ),
                            borderRadius: BorderRadius.circular(30.w),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: AppColors.dividerColor,
                              width: 0.5,
                            ),
                            borderRadius: BorderRadius.circular(30.w),
                          ),
                        ),
                      ),
                    ),
                  )
                : SizedBox.shrink(),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: subTitleController,
                    enabled: canSend,
                    decoration: InputDecoration(
                      isDense: true,
                      hintStyle: Theme.of(context).textTheme.bodyMedium!
                          .copyWith(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w400,
                            color: AppColors.greyColor,
                          ),
                      hintText: canSend
                          ? 'Type your message...'
                          : 'Please wait for response...',
                      border: OutlineInputBorder(
                        borderSide: BorderSide(
                          color: AppColors.dividerColor,
                          width: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(30.w),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderSide: BorderSide(
                          color: AppColors.dividerColor,
                          width: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(30.w),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(
                          color: AppColors.dividerColor,
                          width: 0.5,
                        ),
                        borderRadius: BorderRadius.circular(30.w),
                      ),
                    ),
                  ),
                ),
                Material(
                  color: canSend
                      ? AppColors.primaryColor
                      : AppColors.greyColor.withOpacity(0.35),
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: canSend ? onSend : null,
                    child: SizedBox(
                      width: 13.w,
                      height: 13.w,
                      child: Icon(
                        Icons.send_rounded,
                        color: canSend
                            ? AppColors.whiteColor
                            : AppColors.appTextSecondary,
                        size: 21.sp,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

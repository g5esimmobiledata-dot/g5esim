import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/widgets/CustomElevatedButton.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:sizer/sizer.dart';

class SupportCard extends StatelessWidget {
  final VoidCallback onContactSupport;
  final VoidCallback? onOpenWhatsApp;
  final VoidCallback? onOpenConcierge;
  final bool showWhatsApp;
  final bool showConcierge;

  const SupportCard({
    super.key,
    required this.onContactSupport,
    this.onOpenWhatsApp,
    this.onOpenConcierge,
    this.showWhatsApp = false,
    this.showConcierge = false,
  });

  Widget _channelBlock({
    required BuildContext context,
    required String title,
    required String description,
    required String buttonText,
    required VoidCallback onPressed,
    required IconData icon,
    Color? buttonColor,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 17,
                backgroundColor: (buttonColor ?? AppColors.primaryColor)
                    .withOpacity(0.14),
                child: Icon(
                  icon,
                  color: buttonColor ?? AppColors.primaryColor,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.normal,
                    color: AppColors.appTextPrimary,
                  ),
                ).tr(),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            description,
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 12.5.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextSecondary,
            ),
          ).tr(),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: CustomElevatedButton(
              onPressed: onPressed,
              text: buttonText,
              backgroundColor: buttonColor,
              height: 46,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(3.w),
        color: AppColors.appSurfaceAlt,
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Still having an issue?',
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 18.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextPrimary,
            ),
          ).tr(),
          const SizedBox(height: 8),
          Text(
            'Choose WhatsApp for direct chat, or use the built-in inbox to stay inside the app.',
            style: Theme.of(context).textTheme.bodyMedium!.copyWith(
              fontSize: 14.sp,
              fontWeight: FontWeight.normal,
              color: AppColors.appTextSecondary,
            ),
          ).tr(),
          const SizedBox(height: 18),
          if (showWhatsApp && onOpenWhatsApp != null) ...[
            _channelBlock(
              context: context,
              title: 'WhatsApp',
              description: 'Open direct chat outside the app using WhatsApp.',
              buttonText: 'Chat on WhatsApp',
              onPressed: onOpenWhatsApp!,
              icon: FontAwesomeIcons.whatsapp,
              buttonColor: const Color(0xFF25D366),
            ),
            const SizedBox(height: 12),
          ],
          _channelBlock(
            context: context,
            title: 'Support Inbox',
            description: 'Send and manage support messages inside the app.',
            buttonText: 'Open Support Inbox',
            onPressed: onContactSupport,
            icon: Icons.support_agent_rounded,
          ),
          if (showConcierge && onOpenConcierge != null) ...[
            const SizedBox(height: 12),
            _channelBlock(
              context: context,
              title: 'VIP Concierge',
              description:
                  'Use priority support, WhatsApp, hotline, and SIP calling.',
              buttonText: 'Open VIP Concierge',
              onPressed: onOpenConcierge!,
              icon: Icons.room_service_rounded,
              buttonColor: const Color(0xFF101828),
            ),
          ],
        ],
      ),
    );
  }
}

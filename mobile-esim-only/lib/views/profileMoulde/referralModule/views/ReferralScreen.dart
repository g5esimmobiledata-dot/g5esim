import 'dart:math';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/profileMoulde/giftCardModule/bloc/convertGiftEvent.dart';
import 'package:esimconnect/views/profileMoulde/referralModule/views/referalHistoryScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:share_plus/share_plus.dart';
import 'package:sizer/sizer.dart';
import '../../../../core/bloc/api_state.dart';
import '../../../../utills/appColors.dart';
import '../../../../utills/global.dart' as global;
import '../../giftCardModule/bloc/ConvertGiftBloc.dart';
import '../../giftCardModule/giftModels/convertGiftModel.dart';
import '../bloc/referrals_bloc.dart';
import '../referralModels/referrals_model.dart';
import '../referralsevents/referalevent.dart';

class ReferralScreen extends StatelessWidget {
  const ReferralScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return BlocListener<ConvertGiftBloc, ApiState<GiftconvertModel>>(
      listener: (context, state) {
        if (state is ApiSuccess<GiftconvertModel>) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            showGiftCardCreatedUI(
              context,
              state.data.giftCard?.amount ?? '',
              state.data.giftCard?.code ?? '',
              state.data.giftCard?.theme ?? '',
              '',
            );
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('🎉 Gift card created successfully!').tr(),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );

          context.read<ReferralBloc>().add(Referalevent());
        } else if (state is ApiFailure) {
          // Handle gift card creation failure
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Failed to create gift card: ${state.error}'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      },

      child: Scaffold(
        appBar: AppBar(
          actions: [
            InkWell(
              onTap: () {
                Get.to(() => Referalhistoryscreen());
              },
              child: Container(
                padding: EdgeInsets.symmetric(
                  horizontal: 2.5.w,
                  vertical: 0.5.h,
                ),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white),
                  borderRadius: BorderRadius.circular(10.sp),
                ),
                child: Text('History', style: TextStyle(color: Colors.white)),
              ),
            ),
            SizedBox(width: 2.w),
            // IconButton(
            //   icon: const Icon(Icons.history, color: Colors.white),
            //   onPressed: () {
            //     //history screen
            //   },
            // ),
          ],
          title: const Text("Refer & Earn").tr(),
        ),

        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: BlocBuilder<ReferralBloc, ApiState<ReferralModel>>(
            builder: (context, state) {
              ReferralModel? referralModel = state.data;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(22),
                      gradient: LinearGradient(
                        colors: [
                          AppColors.secondaryColor,
                          AppColors.secondaryColor.withValues(alpha: 0.5),
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.15),
                          blurRadius: 18,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Invite Friends & Earn",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.normal,
                          ),
                        ).tr(),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  referralModel?.referralCode ?? "N/A",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.normal,
                                    letterSpacing: 2,
                                  ),
                                ),
                              ),
                              InkWell(
                                onTap: () {
                                  Clipboard.setData(
                                    ClipboardData(
                                      text: "${referralModel?.referralCode}",
                                    ),
                                  );
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        "Referral code copied",
                                      ).tr(),
                                    ),
                                  );
                                },
                                child: Icon(Icons.copy, color: Colors.white),
                              ),
                              SizedBox(width: 12),
                              InkWell(
                                onTap: () async {
                                  final playStoreLink = await global
                                      .getPlayStoreLink();
                                  Share.share(
                                    "${tr("Use my referral code")} ${referralModel?.referralCode} ${tr("and get a discount on your first eSIM purchase!\n\n")}"
                                    "${tr("Download the app from Google Play:\n")} $playStoreLink",
                                  );
                                },
                                child: Icon(Icons.share, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          "Share this code with your friends and earn rewards when they join.",
                          style: TextStyle(color: Colors.white70),
                        ).tr(),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    children: [
                      statBox(
                        tr("Earning"),
                        referralModel?.totalEarnings ?? "N/A",
                        Icons.money,
                        context,
                      ),
                      statBox(
                        tr("Total Referrals"),
                        "${referralModel?.totalReferrals ?? "N/A"}",
                        Icons.people_outline,
                        context,
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  /// HOW IT WORKS
                  const Text(
                    "How It Works",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.normal),
                  ).tr(),
                  const SizedBox(height: 12),
                  stepRow(
                    "1",
                    tr("Share Code"),
                    tr("Send your referral code"),
                    Icons.share_outlined,
                  ),
                  stepRow(
                    "2",
                    tr("Friend Joins"),
                    tr("They sign up"),
                    Icons.person_add_alt,
                  ),
                  stepRow(
                    "3",
                    tr("You Earn"),
                    tr("You earn a reward"),
                    Icons.emoji_events_outlined,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  /// SIMPLE UI HELPERS (NOT CLASSES)

  Widget statBox(
    String title,
    String value,
    IconData icon,
    BuildContext context,
  ) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: AppColors.secondaryColor.withOpacity(0.9),
            blurRadius: 5,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: AppColors.secondaryColor),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.normal),
          ),
          SizedBox(height: 1.h),
          title.toString() == "Earning"
              ? InkWell(
                  onTap: () {
                    showCreateGiftCardPopup(context);
                  },
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: 2.w,
                      vertical: 1.h,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10.sp),
                      color: AppColors.primaryColor,
                    ),
                    child: Text(
                      "Convert to Gift Card",
                      style: TextStyle(color: Colors.white, fontSize: 12.sp),
                    ).tr(),
                  ),
                )
              : SizedBox(),
        ],
      ),
    );
  }

  //gift card popup
  void showCreateGiftCardPopup(BuildContext context) {
    final TextEditingController amountCtrl = TextEditingController();
    final TextEditingController noteCtrl = TextEditingController();
    String selectedOccasion = 'Default'; // Default value

    final List<String> occasionList = [
      'Default',
      'Birthday',
      'Holiday',
      'Travel',
      'Thank you',
      'Celebration',
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setState) {
            return SingleChildScrollView(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  top: 20,
                  bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Create Gift Card",
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.normal,
                        color: Colors.black87,
                      ),
                    ).tr(),
                    const SizedBox(height: 16),

                    // Amount TextField with Label
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Amount",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.normal,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.grey.shade100,
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: TextField(
                            controller: amountCtrl,
                            keyboardType: TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.normal,
                              color: Colors.black87,
                            ),
                            inputFormatters: [
                              FilteringTextInputFormatter.allow(
                                RegExp(r'^\d+\.?\d{0,2}'),
                              ),
                            ],
                            onChanged: (value) {
                              // Format the input
                              if (value.isNotEmpty) {
                                // Ensure only numbers and decimal point
                                final formatted = value.replaceAll(
                                  RegExp(r'[^0-9\.]'),
                                  '',
                                );
                                // Ensure only one decimal point
                                final parts = formatted.split('.');
                                if (parts.length > 2) {
                                  final corrected = '${parts[0]}.${parts[1]}';
                                  amountCtrl.value = amountCtrl.value.copyWith(
                                    text: corrected,
                                    selection: TextSelection.collapsed(
                                      offset: corrected.length,
                                    ),
                                  );
                                }
                              }
                            },
                            decoration: InputDecoration(
                              hintText: tr("0.00"),
                              hintStyle: TextStyle(
                                color: Colors.grey.shade400,
                                fontSize: 16,
                                fontWeight: FontWeight.normal,
                              ),
                              prefixIcon: Padding(
                                padding: const EdgeInsets.only(
                                  left: 12,
                                  top: 14,
                                  bottom: 14,
                                ),
                                child: Text(
                                  "${global.activeCurrencysymbol} ",
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.normal,
                                    color: Colors.black87,
                                  ),
                                ),
                              ),
                              prefixIconConstraints: const BoxConstraints(
                                minWidth: 0,
                                minHeight: 0,
                              ),
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade300,
                                  width: 1.5,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade300,
                                  width: 1.5,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: AppColors.primaryColor,
                                  width: 2,
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 14,
                              ),
                              suffixIcon: amountCtrl.text.isNotEmpty
                                  ? IconButton(
                                      icon: Icon(
                                        Icons.clear,
                                        color: Colors.grey.shade500,
                                        size: 20,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          amountCtrl.clear();
                                        });
                                      },
                                    )
                                  : null,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Enter the gift card amount",
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Occasion Dropdown with Label
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Occasion",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.normal,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.grey.shade300,
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.grey.shade100,
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: DropdownButton<String>(
                              value: selectedOccasion,
                              isExpanded: true,
                              underline: const SizedBox(),
                              icon: Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: Colors.grey.shade600,
                                size: 24,
                              ),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.normal,
                                color: Colors.black87,
                              ),
                              dropdownColor: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              menuMaxHeight: 300,
                              onChanged: (String? newValue) {
                                setState(() {
                                  selectedOccasion = newValue!;
                                });
                              },
                              items: occasionList.map<DropdownMenuItem<String>>(
                                (String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 8,
                                      ),
                                      child: Row(
                                        children: [
                                          // Icon based on occasion
                                          _getOccasionIcon(value),
                                          const SizedBox(width: 12),
                                          Text(
                                            value,
                                            style: TextStyle(
                                              fontSize: 15,
                                              color: value == 'Default'
                                                  ? Colors.grey.shade600
                                                  : Colors.black87,
                                              fontWeight: value == 'Default'
                                                  ? FontWeight.normal
                                                  : FontWeight.normal,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Personal Note TextField with Label
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Personal Note (Optional)",
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.normal,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.grey.shade100,
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: TextField(
                            controller: noteCtrl,
                            maxLines: 4,
                            minLines: 3,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w400,
                              color: Colors.black87,
                            ),
                            decoration: InputDecoration(
                              hintText: tr("Write your personal note here..."),
                              hintStyle: TextStyle(
                                color: Colors.grey.shade500,
                                fontSize: 14,
                              ),
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade300,
                                  width: 1.5,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: Colors.grey.shade300,
                                  width: 1.5,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(
                                  color: AppColors.primaryColor,
                                  width: 2,
                                ),
                              ),
                              contentPadding: const EdgeInsets.all(16),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Create Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.secondaryColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 3,
                          shadowColor: AppColors.secondaryColor.withOpacity(
                            0.3,
                          ),
                        ),
                        onPressed: () {
                          final amount = amountCtrl.text.trim();
                          if (amount.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text(
                                  "Please enter an amount",
                                ).tr(),
                                backgroundColor: Colors.red,
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );
                            return;
                          }

                          // Validate it's a valid number
                          final numAmount = double.tryParse(amount);
                          if (numAmount == null || numAmount <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text(
                                  "Please enter a valid amount",
                                ).tr(),
                                backgroundColor: Colors.red,
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );
                            return;
                          }

                          Navigator.pop(context);
                          context.read<ConvertGiftBloc>().add(
                            ConvertGiftEvent(
                              amount: amount,
                              currency: global.activeCurrencyname ?? "USD",
                              message: noteCtrl.text.trim(),
                              theme: selectedOccasion,
                              code: generateGiftCardCode(),
                              note: noteCtrl.text.trim(),
                            ),
                          );
                        },
                        child: const Text(
                          "Create Gift Card",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.normal,
                          ),
                        ).tr(),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  String generateGiftCardCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    final random = Random();
    String result = "GC-";

    for (int i = 0; i < 4; i++) {
      for (int j = 0; j < 4; j++) {
        result += chars[random.nextInt(chars.length)];
      }
      if (i < 3) result += "-";
    }

    return result;
  }

  // Helper function to get icon for each occasion
  Widget _getOccasionIcon(String occasion) {
    switch (occasion) {
      case 'Birthday':
        return Icon(Icons.cake, color: Colors.pink.shade400, size: 20);
      case 'Holiday':
        return Icon(Icons.beach_access, color: Colors.blue.shade400, size: 20);
      case 'Travel':
        return Icon(Icons.flight, color: Colors.green.shade400, size: 20);
      case 'Thank you':
        return Icon(Icons.thumb_up, color: Colors.orange.shade400, size: 20);
      case 'Celebration':
        return Icon(Icons.celebration, color: Colors.purple.shade400, size: 20);
      default:
        return Icon(Icons.card_giftcard, color: Colors.grey.shade400, size: 20);
    }
  }

  // Modern gift card ui with occasion and personal note
  void showGiftCardCreatedUI(
    BuildContext context,
    String amount,
    String code,
    String occasion,
    String personalNote,
  ) {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          insetPadding: const EdgeInsets.all(20),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primaryColor,
                  AppColors.primaryColor.withOpacity(0.9),
                  AppColors.primaryColor.withOpacity(0.8),
                ],
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top close button (X)
                Align(
                  alignment: Alignment.topRight,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                      ),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.primaryColor,
                          AppColors.primaryColor.withOpacity(0.9),
                          AppColors.primaryColor.withOpacity(0.8),
                        ],
                      ),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          color: Colors.grey,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),

                // Main content
                Container(
                  padding: const EdgeInsets.all(30),
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(24),
                      topRight: Radius.circular(24),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.primaryColor,
                        AppColors.primaryColor.withOpacity(0.9),
                        AppColors.primaryColor.withOpacity(0.8),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryColor.withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: 0,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: Stack(
                    children: [
                      // Decorative background elements
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Opacity(
                          opacity: 0.2,
                          child: Icon(
                            Icons.card_giftcard,
                            color: Colors.white,
                            size: 60,
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 10,
                        left: 10,
                        child: Opacity(
                          opacity: 0.2,
                          child: Icon(
                            Icons.celebration,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                      ),

                      Column(
                        children: [
                          // Animated icon
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            padding: const EdgeInsets.all(16),
                            child: Icon(
                              Icons.card_giftcard,
                              color: Colors.white,
                              size: 40,
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Amount with beautiful styling
                          Text(
                            "${global.activeCurrencysymbol} $amount",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.normal,
                              letterSpacing: 1.5,
                              shadows: [
                                Shadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(1, 1),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Occasion badge
                          if (occasion != "Default")
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _getOccasionIcon(occasion),
                                  const SizedBox(width: 6),
                                  Text(
                                    occasion,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 13,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                          const SizedBox(height: 20),

                          // Gift Card Code with copy icon
                          GestureDetector(
                            onTap: () {
                              // Copy code logic
                              Clipboard.setData(ClipboardData(text: code));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Text(
                                    "Gift card code copied!",
                                  ).tr(),
                                  backgroundColor: Colors.green,
                                  behavior: SnackBarBehavior.floating,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                vertical: 12,
                                horizontal: 20,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.qr_code,
                                    color: Colors.white,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    code,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.normal,
                                      letterSpacing: 1.2,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Icon(
                                    Icons.content_copy,
                                    color: Colors.white.withOpacity(0.8),
                                    size: 16,
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Personal Note section
                          if (personalNote.isNotEmpty) ...[
                            const SizedBox(height: 20),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.note,
                                        color: Colors.white.withOpacity(0.8),
                                        size: 16,
                                      ),
                                      const SizedBox(width: 8),
                                      const Text(
                                        "Personal Note",
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 13,
                                          fontWeight: FontWeight.normal,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withOpacity(0.05),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      personalNote,
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.9),
                                        fontSize: 14,
                                        height: 1.4,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // Bottom action buttons (only Share button now)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      // Share Button
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          color: Colors.grey.shade50,
                          border: Border.all(
                            color: Colors.grey.shade200,
                            width: 1.5,
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () async {
                              // Share gift card logic
                              // Share gift card logic
                              final String shareText =
                                  '🎁 Redeem Your Gift Card!\n\n'
                                  '💰 Amount: ${global.activeCurrencysymbol}$amount\n'
                                  '🎯 Code: $code\n'
                                  '📱 Download our app to redeem: ${await global.getPlayStoreLink()}\n\n'
                                  'Enjoy your gift! 🎉';
                              // Show share sheet
                              await Share.share(
                                shareText,
                                subject:
                                    '🎁 Redeem Your Gift Card! - ${global.activeCurrencysymbol}$amount',
                              );
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                vertical: 16,
                                horizontal: 24,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.share,
                                    color: AppColors.primaryColor,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    "Share Gift Card",
                                    style: TextStyle(
                                      color: AppColors.primaryColor,
                                      fontSize: 16,
                                      fontWeight: FontWeight.normal,
                                    ),
                                  ).tr(),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget stepRow(String step, String title, String subtitle, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.grey.shade100,
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.secondaryColor,
            child: Text(step, style: const TextStyle(color: Colors.white)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.normal,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Icon(icon, color: AppColors.secondaryColor),
        ],
      ),
    );
  }
}

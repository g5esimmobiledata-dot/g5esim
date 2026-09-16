// ignore_for_file: deprecated_member_use, must_be_immutable

import 'dart:convert';
import 'package:esimconnect/views/authModule/view/signupscreen.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/views/privacyPolicyScreen.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:pin_input_text_field/pin_input_text_field.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/authModule/auth_controller/LoginController.dart';
import 'package:esimconnect/views/authModule/auth_controller/OtpController.dart';
import 'package:esimconnect/views/authModule/login_bloc/LoginUser.dart';
import 'package:esimconnect/widgets/CustomElevatedButton.dart';
import '../../../core/bloc/api_state.dart'
    show ApiFailure, ApiState, ApiSuccess, ApiLoading;
import '../login_bloc/loginbloc.dart';
import '../model/verifymodel.dart';
import '../verify_bloc/VerifyUser.dart';
import '../verify_bloc/Verifybloc.dart';

class OtpScreen extends StatefulWidget {
  String emailid;
  OtpScreen({super.key, required this.emailid});
  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final otpController = Get.find<OtpController>();
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      otpController.startCountdown();
      otpController.focusnode.requestFocus();
    });
  }

  @override
  void dispose() {
    otpController.countdownTimer?.cancel();
    otpController.update();
    otpController.focusnode.unfocus();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        title: Text('Verify Email').tr(),
        leading: IconButton(
          onPressed: () {
            otpController.countdownTimer?.cancel();
            Get.back();
          },
          icon: Icon(Icons.arrow_back_ios_new_outlined),
        ),
      ),
      body: BlocConsumer<Verifybloc, ApiState<VerifyModel>>(
        listener: (context, state) async {
          if (state is ApiSuccess) {
            // Save to SharedPreferences
            print("userprofile data:- ${jsonEncode(state.data)}");
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('UserProfileData', jsonEncode(state.data));
            await prefs.setString("Currency", "\$");
            global.activeCurrencysymbol = prefs.getString("Currency");
            // Navigate to the next screen
            otpController.pinEditingControllerlogin.clear();
            otpController.update();
            Get.off(
              () => SignupScreen(
                email: widget.emailid,
                userId: state.data?.data?.userId,
              ),
            );
            // Get.off(() => BottomNavigationBarScreen(index: 0));
          } else if (state is ApiFailure) {
            global.showToastMessage(message: tr("otp verification Failed"));
          }
        },
        builder: (context, state) {
          bool isLoading = state is ApiLoading;
          return Center(
            child: SizedBox(
              width: Get.width - Get.width * 0.1,
              child: Column(
                children: [
                  SizedBox(height: Get.height * 0.07),
                  Text(
                    'OTP Verification',
                    style: Get.textTheme.titleMedium!.copyWith(
                      color: AppColors.textColor,
                      fontSize: 17.sp,
                      fontWeight: FontWeight.normal,
                    ),
                    textAlign: TextAlign.center,
                  ).tr(),
                  SizedBox(height: Get.height * 0.02),
                  GetBuilder<LoginController>(
                    builder: (logincontroller) => RichText(
                      textAlign: TextAlign.center,
                      text: TextSpan(
                        text: tr('Enter the 6-digit code sent to '),
                        style: Get.textTheme.titleMedium!.copyWith(
                          color: AppColors.greyColor,
                          fontSize: 16.sp,
                          fontWeight: FontWeight.normal,
                        ),
                        children: [
                          TextSpan(
                            text: logincontroller.emailController.text,
                            style: Get.textTheme.titleMedium!.copyWith(
                              color: AppColors.primaryColor,
                              fontSize: 16.sp,
                              fontWeight: FontWeight.normal,
                            ),
                          ),
                          TextSpan(text: tr(' to verify your email.')),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 30),
                  SizedBox(
                    width: 65.w,
                    child: PinInputTextField(
                      focusNode: otpController.focusnode,
                      pinLength: 6,
                      decoration: BoxLooseDecoration(
                        bgColorBuilder: PinListenColorBuilder(
                          AppColors.primaryColor.withOpacity(0.1),
                          Colors.white,
                        ),
                        strokeColorBuilder: PinListenColorBuilder(
                          AppColors.primaryColor,
                          Colors.grey.shade400,
                        ),
                      ),
                      controller: otpController.pinEditingControllerlogin,
                      textInputAction: TextInputAction.done,
                      enabled: true,
                      keyboardType: TextInputType.number,
                      onSubmit: (pin) {},
                      onChanged: (pin) {},
                      enableInteractiveSelection: false,
                    ),
                  ),
                  SizedBox(height: Get.height * 0.02),
                  GetBuilder<OtpController>(
                    builder: (otpController) {
                      return RichText(
                        text: TextSpan(
                          text: tr("Didn't receive code? "),
                          style: Get.textTheme.titleMedium!.copyWith(
                            color: AppColors.textColor,
                            fontSize: 14.sp,
                          ),
                          children: [
                            TextSpan(
                              text: otpController.secondsRemaining > 0
                                  ? 'Resend in ${otpController.timerText}'
                                  : tr('Resend'),
                              style: TextStyle(
                                color: AppColors.primaryColor,
                                fontWeight: FontWeight.normal,
                              ),
                              recognizer: TapGestureRecognizer()
                                ..onTap = otpController.secondsRemaining == 0
                                    ? () {
                                        otpController.resetTimerAndResendOtp();
                                        context.read<LoginBloc>().add(
                                          LoginUser(widget.emailid),
                                        );
                                      }
                                    : null,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  SizedBox(height: Get.height * 0.07),
                  CustomElevatedButton(
                    width: double.infinity,
                    onPressed: isLoading
                        ? null
                        : () async {
                            otpController.focusnode.unfocus();
                            final enteredOtp = otpController
                                .pinEditingControllerlogin
                                .text
                                .trim();
                            final emailid = widget.emailid;
                            // Dispatch the VerifyUser event
                            context.read<Verifybloc>().add(
                              VerifyUser(emailid, otp: enteredOtp),
                            );
                          },
                    text: isLoading ? '' : tr('Submit'),
                  ),
                  SizedBox(height: 15),
                  Spacer(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: RichText(
                      textAlign: TextAlign.center,
                      text: TextSpan(
                        text: tr('By continuing, you accept our '),
                        style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                          fontSize: 15.sp,
                          color: AppColors.textColor,
                        ),
                        children: [
                          TextSpan(
                            text: tr('Terms and conditions'),
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: AppColors.primaryColor,
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.normal,
                                  decoration: TextDecoration.underline,
                                  decorationColor: AppColors.primaryColor,
                                ),
                            recognizer: TapGestureRecognizer()
                              ..onTap = () {
                                debugPrint('Term and Conditions');
                                otpController.femailfocusnode.unfocus();
                                Get.to(() => PrivacyPolicyScreen(index: 1));
                              },
                          ),
                          TextSpan(
                            text: tr(' and the '),
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 15.sp,
                                  color: AppColors.textColor,
                                ),
                          ),
                          TextSpan(
                            text: tr('Privacy Policy'),
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  color: AppColors.primaryColor,
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.normal,
                                  decoration: TextDecoration.underline,
                                  decorationColor: AppColors.primaryColor,
                                ),
                            recognizer: TapGestureRecognizer()
                              ..onTap = () {
                                debugPrint('Privacy tapped');
                                otpController.femailfocusnode.unfocus();
                                Get.to(() => PrivacyPolicyScreen(index: 0));
                              },
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 15),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

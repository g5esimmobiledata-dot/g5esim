import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pin_input_text_field/pin_input_text_field.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:esimconnect/widgets/textFieldWidget.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String? email;

  const ForgotPasswordScreen({super.key, this.email});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _codeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _codeFocus = FocusNode();
  final _newPasswordFocus = FocusNode();
  final _confirmPasswordFocus = FocusNode();
  bool _isLoading = false;
  bool _showPasswordFields = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _codeFocus.requestFocus();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldbackgroudColor,
      appBar: AppBar(
        title: Text('Reset Password').tr(),
        leading: IconButton(
          onPressed: () => Get.back(),
          icon: Icon(Icons.arrow_back_ios_new_outlined),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 5.w),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 3.h),

                // Title
                Text(
                  'Reset Password',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 20.sp,
                    fontWeight: FontWeight.normal,
                    color: AppColors.textColor,
                  ),
                ).tr(),

                SizedBox(height: 1.h),

                // Email display
                Text(
                  widget.email ?? '',
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 14.sp,
                    color: AppColors.primaryColor,
                    fontWeight: FontWeight.normal,
                  ),
                ),

                SizedBox(height: 2.h),

                // Instruction text
                Text(
                  _showPasswordFields
                      ? tr('Enter your new password below')
                      : tr('Enter the 6-digit code sent to your email'),
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 13.sp,
                    color: AppColors.textGreyColor,
                  ),
                ),

                SizedBox(height: 4.h),

                if (!_showPasswordFields) ...[
                  Text(
                    'Reset Code',
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.normal,
                      color: AppColors.textColor,
                    ),
                  ).tr(),
                  SizedBox(height: 1.h),
                  Text(
                    'Enter 6-digit code',
                    style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      fontSize: 12.sp,
                      color: AppColors.textGreyColor,
                    ),
                  ).tr(),
                  SizedBox(height: 1.h),
                  SizedBox(
                    width: 70.w,
                    child: PinInputTextField(
                      focusNode: _codeFocus,
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
                        radius: Radius.circular(8),
                        strokeWidth: 2,
                      ),
                      controller: _codeController,
                      textInputAction: TextInputAction.done,
                      enabled: !_isLoading,
                      keyboardType: TextInputType.number,
                      onSubmit: (pin) {
                        if (pin.length == 6) {
                          _verifyCode();
                        }
                      },
                      onChanged: (pin) {
                        if (pin.length == 6) {
                          _verifyCode();
                        }
                      },
                      enableInteractiveSelection: false,
                    ),
                  ),
                  SizedBox(height: 4.h),

                  // Resend code option
                  Center(
                    child: TextButton(
                      onPressed: () {
                        // Resend code logic
                        global.showToastMessage(
                          message: tr('New code sent to ') + widget.email!,
                        );
                      },
                      child: Text(
                        tr("Didn't receive code? Resend"),
                        style: TextStyle(
                          color: AppColors.primaryColor,
                          fontSize: 12.sp,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: 2.h),

                  // Verify Button
                  CustomElevatedButton(
                    width: double.infinity,
                    onPressed: _isLoading ? null : _verifyCode,
                    text: _isLoading ? '' : tr('Verify Code'),
                    progressIndicator: _isLoading
                        ? const CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          )
                        : null,
                  ),
                ] else ...[
                  TextFieldWidget(
                    textEditingController: _newPasswordController,
                    focusNode: _newPasswordFocus,
                    labelText: tr("New Password"),
                    obscureText: true,
                    showPasswordToggle: true,
                  ),

                  SizedBox(height: 2.h),
                  // Confirm Password Field
                  TextFieldWidget(
                    textEditingController: _confirmPasswordController,
                    focusNode: _confirmPasswordFocus,
                    labelText: tr("Confirm New Password"),
                    obscureText: true,
                    showPasswordToggle: true,
                  ),

                  SizedBox(height: 4.h),

                  // Reset Password Button
                  CustomElevatedButton(
                    width: double.infinity,
                    onPressed: _isLoading ? null : _resetPassword,
                    text: _isLoading ? '' : tr('Reset Password'),
                    progressIndicator: _isLoading
                        ? const CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          )
                        : null,
                  ),
                ],

                SizedBox(height: 3.h),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _verifyCode() async {
    //api call here
    final code = _codeController.text.trim();

    if (code.isEmpty || code.length != 6) {
      global.showToastMessage(message: tr('Please enter the 6-digit code'));
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await Future.delayed(Duration(seconds: 1));

      if (code.length == 6) {
        setState(() {
          _showPasswordFields = true;
          _isLoading = false;
        });
        _newPasswordFocus.requestFocus();
        global.showToastMessage(message: tr('Code verified successfully'));
      } else {
        global.showToastMessage(message: tr('Invalid verification code'));
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      global.showToastMessage(
        message: tr('Failed to verify code. Please try again.'),
      );
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _resetPassword() async {
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    // Validation
    if (newPassword.isEmpty || confirmPassword.isEmpty) {
      global.showToastMessage(
        message: tr('Please enter new password and confirm password'),
      );
      return;
    }

    if (newPassword.length < 6) {
      global.showToastMessage(
        message: tr('Password must be at least 6 characters'),
      );
      return;
    }

    if (newPassword != confirmPassword) {
      global.showToastMessage(message: tr('Passwords do not match'));
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      global.showToastMessage(message: tr('Password reset successfully!'));

      // Clear fields
      _codeController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();

      // Navigate back to login screen
      Get.offAll(() => LoginScreen());
    } catch (e) {
      global.showToastMessage(
        message: tr('Failed to reset password. Please try again.'),
      );
      setState(() {
        _isLoading = false;
      });
    }
  }
}

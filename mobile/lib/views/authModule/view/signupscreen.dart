import 'dart:developer';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/authModule/model/pswdModel.dart';
import 'package:esimconnect/views/authModule/pswdbloc/PswdEvent.dart';
import 'package:esimconnect/views/authModule/pswdbloc/pswd_bloc.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:esimconnect/widgets/textFieldWidget.dart';
import 'package:esimconnect/widgets/CanvasStyle/waveClipper.dart';

class SignupScreen extends StatefulWidget {
  final String email;
  final String? userId;

  const SignupScreen({super.key, required this.email, this.userId});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _passwordFocus = FocusNode();
  final _confirmPasswordFocus = FocusNode();
  bool _isLoading = false;
  bool _hasUppercase = false;
  bool _hasNumber = false;
  bool _hasMinLength = false;
  bool _passwordsMatch = false;

  @override
  void initState() {
    super.initState();

    // Listen to password changes for validation
    _passwordController.addListener(_validatePassword);
    _confirmPasswordController.addListener(_validatePasswordMatch);
  }

  @override
  void dispose() {
    _passwordController.removeListener(_validatePassword);
    _confirmPasswordController.removeListener(_validatePasswordMatch);
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _passwordFocus.dispose();
    _confirmPasswordFocus.dispose();
    super.dispose();
  }

  void _validatePassword() {
    final password = _passwordController.text;

    setState(() {
      _hasUppercase = password.contains(RegExp(r'[A-Z]'));
      _hasNumber = password.contains(RegExp(r'[0-9]'));
      _hasMinLength = password.length >= 6;
    });

    // Also validate match when password changes
    _validatePasswordMatch();
  }

  void _validatePasswordMatch() {
    setState(() {
      _passwordsMatch =
          _passwordController.text.isNotEmpty &&
          _confirmPasswordController.text.isNotEmpty &&
          _passwordController.text == _confirmPasswordController.text;
    });
  }

  LinearGradient get _authBackgroundGradient => AppColors.isDarkMode
      ? const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF070B1F), Color(0xFF10162D), Color(0xFF070B1F)],
          stops: [0.0, 0.5, 1.0],
        )
      : const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFE0F2F7), Color(0xFFF0F4F7), Color(0xFFFFFFFF)],
          stops: [0.0, 0.5, 1.0],
        );

  LinearGradient get _authHeroGradient => AppColors.isDarkMode
      ? const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF10162D),
            Color(0xFF172246),
            Color(0xFF102A38),
            Color(0xFF070B1F),
          ],
          stops: [0.0, 0.3, 0.7, 1.0],
        )
      : const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFE0F2F7),
            Color(0xFFE3E4F9),
            Color(0xFFFAE0E8),
            Color(0xFFFDE9D9),
          ],
          stops: [0.0, 0.3, 0.7, 1.0],
        );

  @override
  Widget build(BuildContext context) {
    return BlocListener<PswdBloc, ApiState<PswdModel>>(
      listener: (context, state) {
        if (state is ApiLoading<PswdModel>) {
          setState(() {
            _isLoading = true;
          });
        } else if (state is ApiSuccess<PswdModel>) {
          log('successfullchanged pswd is ${state.data.message}');
          Get.off(() => LoginScreen());
        } else if (state is ApiFailure) {
          setState(() {
            _isLoading = false;
          });
          global.showToastMessage(
            message: state.error ?? tr('Failed to setup password'),
          );
        }
      },
      child: Scaffold(
        resizeToAvoidBottomInset: false,
        backgroundColor: AppColors.scaffoldbackgroudColor,
        body: SafeArea(
          child: Stack(
            children: [
              Container(
                height: 100.h,
                decoration: BoxDecoration(gradient: _authBackgroundGradient),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipPath(
                    clipper: BottomWaveClipper(),
                    child: Container(
                      height: 30.h,
                      width: double.infinity,
                      padding: EdgeInsets.only(top: 5.h, left: 5.w, right: 5.w),
                      decoration: BoxDecoration(
                        gradient: _authHeroGradient,
                        color: AppColors.primaryColor,
                      ),
                      child: Column(
                        children: [
                          ClipRRect(
                            child: Image.asset(
                              Images.splasImage,
                              width: 55.w,
                              fit: BoxFit.contain,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(height: 3.h),

                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 5.w),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Create Password',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 20.sp,
                                fontWeight: FontWeight.normal,
                                color: AppColors.textColor,
                              ),
                        ).tr(),
                        SizedBox(height: 0.5.h),
                        Text(
                          widget.email,
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 16.sp,
                                color: AppColors.primaryColor,
                                fontWeight: FontWeight.normal,
                              ),
                        ),
                        SizedBox(height: 2.h),
                        Text(
                          'Create account to enable faster login next time.',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 15.sp,
                                color: AppColors.textGreyColor,
                                fontWeight: FontWeight.w400,
                              ),
                        ).tr(),

                        SizedBox(height: 1.h),

                        // Password Field
                        TextFieldWidget(
                          textEditingController: _passwordController,
                          focusNode: _passwordFocus,
                          labelText: tr("Password"),
                          obscureText: true,
                          maxLines: 1,
                          showPasswordToggle: true,
                          onChanged: (_) {
                            _validatePassword();
                          },
                        ),

                        SizedBox(height: 1.h),

                        // Password Requirements Section
                        Container(
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey[50],
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey[200]!),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Password must contain:',
                                style: TextStyle(
                                  fontSize: 14.sp,
                                  fontWeight: FontWeight.normal,
                                  color: Colors.grey[700],
                                ),
                              ).tr(),
                              SizedBox(height: 8),

                              Row(
                                children: [
                                  Icon(
                                    _hasUppercase
                                        ? Icons.check_circle
                                        : Icons.circle,
                                    size: 13.sp,
                                    color: _hasUppercase
                                        ? Colors.green
                                        : Colors.red,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'At least one uppercase letter (A-Z)',
                                    style: TextStyle(
                                      fontSize: 13.sp,
                                      color: _hasUppercase
                                          ? Colors.green
                                          : Colors.red,
                                    ),
                                  ).tr(),
                                ],
                              ),

                              SizedBox(height: 6),

                              // Number requirement
                              Row(
                                children: [
                                  Icon(
                                    _hasNumber
                                        ? Icons.check_circle
                                        : Icons.circle,
                                    size: 13.sp,
                                    color: _hasNumber
                                        ? Colors.green
                                        : Colors.red,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'At least one number (0-9)',
                                    style: TextStyle(
                                      fontSize: 13.sp,
                                      color: _hasNumber
                                          ? Colors.green
                                          : Colors.red,
                                    ),
                                  ).tr(),
                                ],
                              ),
                              SizedBox(height: 6),

                              // Length requirement
                              Row(
                                children: [
                                  Icon(
                                    _hasMinLength
                                        ? Icons.check_circle
                                        : Icons.circle,
                                    size: 13.sp,
                                    color: _hasMinLength
                                        ? Colors.green
                                        : Colors.red,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'At least 6 characters',
                                    style: TextStyle(
                                      fontSize: 13.sp,
                                      color: _hasMinLength
                                          ? Colors.green
                                          : Colors.red,
                                    ),
                                  ).tr(),
                                ],
                              ),
                            ],
                          ),
                        ),

                        SizedBox(height: 1.h),

                        TextFieldWidget(
                          textEditingController: _confirmPasswordController,
                          focusNode: _confirmPasswordFocus,
                          labelText: tr("Confirm Password"),
                          obscureText: true,
                          maxLines: 1,
                          showPasswordToggle: true,
                          onChanged: (_) {
                            _validatePasswordMatch();
                          },
                        ),

                        SizedBox(height: 1.h),

                        if (_confirmPasswordController.text.isNotEmpty)
                          Row(
                            children: [
                              Icon(
                                _passwordsMatch
                                    ? Icons.check_circle
                                    : Icons.error,
                                size: 16,
                                color: _passwordsMatch
                                    ? Colors.green
                                    : Colors.red,
                              ),
                              SizedBox(width: 8),
                              Text(
                                _passwordsMatch
                                    ? tr('Passwords match')
                                    : tr('Passwords do not match'),
                                style: TextStyle(
                                  fontSize: 12.sp,
                                  color: _passwordsMatch
                                      ? Colors.green
                                      : Colors.red,
                                  fontWeight: FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),

                  SizedBox(height: 2.h),

                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 5.w),
                    child: BlocBuilder<PswdBloc, ApiState<PswdModel>>(
                      builder: (context, state) {
                        return CustomElevatedButton(
                          elevation: 0,
                          width: double.infinity,
                          onPressed: _isLoading ? null : _submitPassword,
                          text: _isLoading ? '' : tr('Submit'),
                          progressIndicator: _isLoading
                              ? const CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                )
                              : null,
                          textStyle: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 16.sp,
                                fontWeight: FontWeight.w400,
                                color: AppColors.whiteColor,
                              ),
                        );
                      },
                    ),
                  ),

                  SizedBox(height: 1.h),

                  Center(
                    child: TextButton(
                      onPressed: _isLoading
                          ? null
                          : () {
                              Get.back();
                            },
                      child: Text.rich(
                        TextSpan(
                          text: tr('Already have a password? '),
                          style: TextStyle(
                            fontSize: 16.sp,
                            color: AppColors.textGreyColor,
                            fontWeight: FontWeight.normal,
                          ),
                          children: [
                            TextSpan(
                              text: tr('Login'),
                              style: TextStyle(
                                color: AppColors.primaryColor,
                                fontWeight: FontWeight.normal,
                                decoration: TextDecoration.underline,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  Spacer(),
                ],
              ),

              if (!_isLoading)
                Positioned(
                  top: 2.h,
                  left: 5.w,
                  child: GestureDetector(
                    onTap: () {
                      Get.back();
                    },
                    child: Container(
                      padding: EdgeInsets.all(1.w),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.8),
                      ),
                      child: Icon(
                        Icons.arrow_back_ios_new,
                        size: 18.sp,
                        color: AppColors.textColor,
                      ),
                    ),
                  ),
                ),
              if (_isLoading)
                Container(
                  color: Colors.black.withOpacity(0.3),
                  child: Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primaryColor,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitPassword() async {
    final _userId = widget.userId;
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    // Validate all requirements
    if (password.isEmpty || confirmPassword.isEmpty) {
      global.showToastMessage(
        message: tr('Please enter password and confirm password'),
      );
      return;
    }

    if (!_hasUppercase) {
      global.showToastMessage(
        message: tr(
          'Password must contain at least one uppercase letter (A-Z)',
        ),
      );
      return;
    }

    if (!_hasNumber) {
      global.showToastMessage(
        message: tr('Password must contain at least one number (0-9)'),
      );
      return;
    }

    if (!_hasMinLength) {
      global.showToastMessage(
        message: tr('Password must be at least 6 characters'),
      );
      return;
    }

    if (password != confirmPassword) {
      global.showToastMessage(message: tr('Passwords do not match'));
      return;
    }

    // Api call
    context.read<PswdBloc>().add(
      PswdEvent(cPswd: confirmPassword, pswd: password, id: _userId!),
    );
  }
}

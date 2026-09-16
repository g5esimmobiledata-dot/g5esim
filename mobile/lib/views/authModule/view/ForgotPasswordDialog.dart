import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/authModule/forgotpswdbloc/ResetEvent.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:pin_input_text_field/pin_input_text_field.dart';
import 'package:sizer/sizer.dart';
import '../../../core/bloc/api_state.dart';
import '../../../utills/appColors.dart';
import '../../../utills/global.dart';
import '../forgotpswdbloc/ResetBloc.dart';
import '../forgotpswdbloc/ResetPaswdBloc.dart';
import '../forgotpswdbloc/ResetPaswdEvent.dart';
import '../model/pswdModel.dart';
import '../model/usermodel.dart';

class ForgotPasswordDialog extends StatefulWidget {
  const ForgotPasswordDialog({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    Get.dialog(
      BlocProvider.value(
        value: BlocProvider.of<ResetBloc>(context),
        child: const ForgotPasswordDialog(),
      ),
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.8),
    );
  }

  @override
  State<ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

class _ForgotPasswordDialogState extends State<ForgotPasswordDialog> {
  final _pageController = PageController();
  final emailController = TextEditingController();
  final otpControllers = List.generate(6, (_) => TextEditingController());
  final focusNodes = List.generate(6, (_) => FocusNode());
  final formKey = GlobalKey<FormState>();
  String? userEmail;
  int _currentPage = 0;
  bool isForgotFlow = false;
  @override
  void initState() {
    super.initState();
    _pageController.addListener(() {
      final page = _pageController.page?.round() ?? 0;
      if (page != _currentPage) {
        setState(() {
          _currentPage = page;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ResetBloc, ApiState<LoginModel>>(
      listenWhen: (_, state) =>
          isForgotFlow &&
          (state is ApiSuccess<LoginModel> || state is ApiFailure<LoginModel>),
      listener: (context, state) {
        if (state is ApiSuccess<LoginModel>) {
          if (state.data.success == true) {
            // EMAIL → OTP
            if (_pageController.hasClients && _pageController.page == 0) {
              setState(() {
                userEmail = emailController.text;
              });
              setState(() => _currentPage = 1);
              _pageController.nextPage(
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeInOut,
              );
            }
            // OTP VERIFIED → CLOSE
            else {
              Get.back();
              showToastMessage(message: tr("OTP Verified Successfully"));
            }
          } else {
            showToastMessage(
              message: state.data.message ?? tr("Action failed"),
            );
          }
        }

        if (state is ApiFailure<LoginModel>) {
          showToastMessage(message: tr("Request failed"));
        }
      },
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        backgroundColor: AppColors.appSurface,
        child: SizedBox(
          width: 90.w,
          height: _currentPage == 0 ? 40.h : 67.h,
          child: PageView(
            controller: _pageController,
            physics: const NeverScrollableScrollPhysics(),
            children: [_emailPage(context), _otpPage(context, userEmail)],
          ),
        ),
      ),
    );
  }

  // ---------------- EMAIL PAGE ----------------

  Widget _emailPage(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(5.w),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Header
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tr("Forgot Password"),
                style: TextStyle(
                  fontSize: 20.sp,
                  fontWeight: FontWeight.normal,
                  color: AppColors.appTextPrimary,
                ),
              ),
              SizedBox(height: 2.h),
              Text(
                tr("Enter your email address to receive a verification code"),
                style: TextStyle(
                  color: AppColors.appTextSecondary,
                  fontSize: 14.sp,
                ),
              ),
            ],
          ),
          SizedBox(height: 4.h),
          // Email Form
          Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr("Email Address"),
                  style: TextStyle(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                    color: AppColors.appTextPrimary,
                  ),
                ),
                SizedBox(height: 8.sp),
                TextFormField(
                  controller: emailController,
                  decoration: InputDecoration(
                    hintText: tr("Enter your email"),
                    hintStyle: TextStyle(
                      fontSize: 14.sp,
                      color: AppColors.appTextSecondary,
                    ),
                    prefixIcon: Icon(
                      Icons.email_outlined,
                      size: 20.sp,
                      color: AppColors.appTextSecondary,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.appBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: AppColors.primaryColor,
                        width: 1.5,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.appBorder),
                    ),
                    filled: true,
                    fillColor: AppColors.appSurfaceAlt,
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 16.sp,
                      vertical: 14.sp,
                    ),
                  ),
                  style: TextStyle(fontSize: 14.sp),
                  validator: (v) {
                    if (v == null || v.isEmpty) {
                      return tr("Email is required");
                    }
                    if (!RegExp(
                      r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$',
                    ).hasMatch(v)) {
                      return tr("Please enter a valid email");
                    }
                    return null;
                  },
                ),
              ],
            ),
          ),
          SizedBox(height: 2.h),
          // Send OTP Button
          BlocBuilder<ResetBloc, ApiState<LoginModel>>(
            builder: (_, state) {
              final isLoading = state is ApiLoading;
              return SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isLoading
                      ? null
                      : () {
                          if (formKey.currentState!.validate()) {
                            isForgotFlow = true;
                            context.read<ResetBloc>().add(
                              ResetEvent(emailController.text),
                            );
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shadowColor: Colors.transparent,
                    padding: EdgeInsets.symmetric(vertical: 14.sp),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: isLoading
                      ? SizedBox(
                          height: 20.sp,
                          width: 20.sp,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              tr("Send OTP"),
                              style: TextStyle(
                                fontSize: 15.sp,
                                fontWeight: FontWeight.normal,
                                letterSpacing: 0.5,
                              ),
                            ),
                            SizedBox(width: 8.sp),
                            Icon(Icons.arrow_forward, size: 18.sp),
                          ],
                        ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ---------------- OTP PAGE ----------------
  Widget _otpPage(BuildContext context, String? userEmail) {
    final passwordFocusNode = FocusNode();
    final confirmPasswordFocusNode = FocusNode();
    final otpfocusNode = FocusNode();
    bool _showPassword = false;
    bool _showConfirmPassword = false;
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final otpcontorller = TextEditingController();

    return StatefulBuilder(
      builder: (context, setState) {
        return Padding(
          padding: EdgeInsets.all(4.w),
          child: SingleChildScrollView(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Top Section
                Column(
                  children: [
                    SizedBox(height: 8.sp),
                    Text(
                      tr("Enter OTP and set new password"),
                      style: TextStyle(
                        fontSize: 15.sp,
                        color: AppColors.appTextSecondary,
                      ),
                    ),
                    SizedBox(height: 4.sp),
                    Text(
                      userEmail ?? "",
                      style: TextStyle(
                        fontSize: 15.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.primaryColor,
                      ),
                    ),
                  ],
                ),

                SizedBox(height: 4.h),

                // OTP Section
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // OTP Section (PinInputTextField)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr("Verification Code"),
                          style: TextStyle(
                            fontSize: 14.sp,
                            fontWeight: FontWeight.normal,
                            color: AppColors.appTextPrimary,
                          ),
                        ),
                        SizedBox(height: 12.sp),

                        Center(
                          child: SizedBox(
                            width: 65.w,
                            child: PinInputTextField(
                              focusNode: otpfocusNode,
                              pinLength: 6,
                              controller: otpcontorller,
                              keyboardType: TextInputType.number,
                              textInputAction: TextInputAction.done,
                              enableInteractiveSelection: false,
                              enabled: true,

                              decoration: BoxLooseDecoration(
                                radius: Radius.circular(10),
                                gapSpace: 8,
                                bgColorBuilder: PinListenColorBuilder(
                                  AppColors.primaryColor.withOpacity(0.1),
                                  Colors.white,
                                ),
                                strokeColorBuilder: PinListenColorBuilder(
                                  AppColors.primaryColor,
                                  AppColors.appBorder,
                                ),
                              ),

                              onChanged: (pin) {
                                // optional
                              },

                              onSubmit: (pin) {
                                FocusScope.of(context).unfocus();
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                SizedBox(height: 4.h),

                // Password Fields Section
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // New Password Field
                    Text(
                      tr("New Password"),
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.appTextPrimary,
                      ),
                    ),
                    SizedBox(height: 8.sp),
                    TextFormField(
                      controller: newPasswordController,
                      focusNode: passwordFocusNode,
                      obscureText: !_showPassword,
                      decoration: InputDecoration(
                        hintText: tr("Enter new password"),
                        hintStyle: TextStyle(
                          fontSize: 14.sp,
                          color: AppColors.appTextSecondary,
                        ),
                        prefixIcon: Icon(
                          Icons.lock_outline_rounded,
                          size: 20.sp,
                          color: AppColors.appTextSecondary,
                        ),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            size: 20.sp,
                            color: AppColors.appTextSecondary,
                          ),
                          onPressed: () {
                            setState(() {
                              _showPassword = !_showPassword;
                            });
                          },
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: AppColors.appBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: AppColors.primaryColor,
                            width: 1.5,
                          ),
                        ),
                        filled: true,
                        fillColor: AppColors.appSurfaceAlt,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16.sp,
                          vertical: 14.sp,
                        ),
                      ),
                      style: TextStyle(fontSize: 14.sp),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return tr("Password is required");
                        }
                        if (value.length < 6) {
                          return tr("Password must be at least 6 characters");
                        }
                        return null;
                      },
                    ),

                    SizedBox(height: 20.sp),

                    // Confirm Password Field
                    Text(
                      tr("Confirm Password"),
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.normal,
                        color: AppColors.appTextPrimary,
                      ),
                    ),
                    SizedBox(height: 8.sp),
                    TextFormField(
                      controller: confirmPasswordController,
                      focusNode: confirmPasswordFocusNode,
                      obscureText: !_showConfirmPassword,
                      decoration: InputDecoration(
                        hintText: tr("Re-enter password"),
                        hintStyle: TextStyle(
                          fontSize: 14.sp,
                          color: AppColors.appTextSecondary,
                        ),
                        prefixIcon: Icon(
                          Icons.lock_outline_rounded,
                          size: 20.sp,
                          color: AppColors.appTextSecondary,
                        ),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _showConfirmPassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            size: 20.sp,
                            color: AppColors.appTextSecondary,
                          ),
                          onPressed: () {
                            setState(() {
                              _showConfirmPassword = !_showConfirmPassword;
                            });
                          },
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: AppColors.appBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: AppColors.primaryColor,
                            width: 1.5,
                          ),
                        ),
                        filled: true,
                        fillColor: AppColors.appSurfaceAlt,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 16.sp,
                          vertical: 14.sp,
                        ),
                      ),
                      style: TextStyle(fontSize: 14.sp),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return tr("Please confirm your password");
                        }
                        if (value != newPasswordController.text) {
                          return tr("Passwords do not match");
                        }
                        return null;
                      },
                    ),
                  ],
                ),

                SizedBox(height: 3.h),
                // Verify & Reset Button
                BlocListener<ResetPaswdBloc, ApiState<PswdModel>>(
                  listener: (context, state) {
                    if (state is ApiSuccess<PswdModel>) {
                      if (state.data.success == true) {
                        showToastMessage(
                          message: tr("Password reset successfully"),
                        );
                        Get.back();
                      } else {
                        showToastMessage(
                          message: state.data.message ?? tr("Reset failed"),
                        );
                      }
                    }

                    if (state is ApiFailure) {
                      showToastMessage(
                        message: state.error ?? tr("Something went wrong"),
                      );
                    }
                  },
                  child: BlocBuilder<ResetPaswdBloc, ApiState<PswdModel>>(
                    builder: (_, state) {
                      final isLoading = state is ApiLoading;

                      return Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: isLoading
                                  ? null
                                  : () {
                                      final enteredOtp = otpcontorller.text
                                          .trim();

                                      if (enteredOtp.length != 6) {
                                        showToastMessage(
                                          message: tr(
                                            "Please enter 6-digit OTP",
                                          ),
                                        );
                                        return;
                                      }

                                      if (userEmail == null ||
                                          userEmail.isEmpty) {
                                        showToastMessage(
                                          message: tr("Invalid email"),
                                        );
                                        return;
                                      }

                                      context.read<ResetPaswdBloc>().add(
                                        ResetPaswdEvent(
                                          email: userEmail,
                                          otp: enteredOtp,
                                          newpswd: newPasswordController.text,
                                          cnfmpswd:
                                              confirmPasswordController.text,
                                        ),
                                      );
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryColor,
                                foregroundColor: Colors.white,
                                elevation: 2,
                                padding: EdgeInsets.symmetric(vertical: 16.sp),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              child: isLoading
                                  ? SizedBox(
                                      height: 22.sp,
                                      width: 22.sp,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      tr("Reset Password"),
                                      style: TextStyle(
                                        fontSize: 16.sp,
                                        fontWeight: FontWeight.normal,
                                      ),
                                    ),
                            ),
                          ),

                          SizedBox(height: 2.h),

                          // Change Email Button
                          TextButton(
                            onPressed: () {
                              setState(() => _currentPage = 0);
                              _pageController.previousPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                              );
                            },
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.arrow_back_rounded,
                                  size: 16.sp,
                                  color: AppColors.appTextSecondary,
                                ),
                                SizedBox(width: 8.sp),
                                Text(
                                  tr("Change Email Address"),
                                  style: TextStyle(
                                    fontSize: 13.sp,
                                    color: AppColors.appTextSecondary,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ---------------- OTP BOX ----------------

  Widget _otpBox(int index) {
    return SizedBox(
      width: 35.sp,
      child: TextFormField(
        controller: otpControllers[index],
        focusNode: focusNodes[index],
        maxLength: 1,
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.normal),
        decoration: InputDecoration(
          counterText: "",
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onChanged: (v) {
          if (v.isNotEmpty && index < 5) {
            focusNodes[index + 1].requestFocus();
          }
          if (v.isEmpty && index > 0) {
            focusNodes[index - 1].requestFocus();
          }
        },
      ),
    );
  }

  @override
  void dispose() {
    emailController.dispose();
    for (final c in otpControllers) {
      c.dispose();
    }
    for (final f in focusNodes) {
      f.dispose();
    }
    _pageController.dispose();
    super.dispose();
  }
}

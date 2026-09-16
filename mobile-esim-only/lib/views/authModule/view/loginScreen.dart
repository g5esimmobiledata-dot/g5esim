import 'dart:convert';
import 'dart:developer';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/views/authModule/loginpswdbloc/loginpswd_bloc.dart';
import 'package:esimconnect/views/authModule/model/loginpswdModel.dart';
import 'package:esimconnect/views/authModule/view/ForgotPasswordDialog.dart';
import 'package:esimconnect/views/profileMoulde/privacyPolicyMudule/views/privacyPolicyScreen.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart' hide Transition;
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/views/authModule/login_bloc/LoginUser.dart';
import 'package:esimconnect/views/authModule/login_bloc/loginbloc.dart';
import 'package:esimconnect/views/authModule/view/otpScreen.dart';
import 'package:esimconnect/widgets/custiomOutlinedButton.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:esimconnect/widgets/textFieldWidget.dart';
import 'package:esimconnect/widgets/CanvasStyle/waveClipper.dart';
import '../../../utills/UserService.dart';
import '../../../utills/global.dart' as global;
import '../../navbarModule/bloc/navbar_bloc.dart';
import '../../navbarModule/views/bottomNavBarScreen.dart';
import '../../profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import '../../profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import '../auth_controller/LoginController.dart';
import '../google_apple_login/FirebaseLoginBloc.dart';
import '../google_apple_login/FirebaseLoginEvent.dart.dart';
import '../loginpswdbloc/loginPswdEvent.dart';
import '../model/usermodel.dart';

class LoginScreen extends StatefulWidget {
  bool? haspasswd = false;
  LoginScreen({super.key, this.haspasswd});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final loginController = Get.find<LoginController>();
  bool _isLoading = false;
  bool _isAppleLoading = false;
  bool? hasPassword = false;
  SharedPreferences? sp;

  @override
  void initState() {
    super.initState();
    getsharedpref();
  }

  Future<void> getsharedpref() async {
    sp = await SharedPreferences.getInstance();
  }

  bool isLoading = false;

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
    SystemChrome.setSystemUIOverlayStyle(AppColors.systemOverlayStyle());
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: AppColors.scaffoldbackgroudColor,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(gradient: _authBackgroundGradient),
              ),
            ),
            SingleChildScrollView(
              physics: AlwaysScrollableScrollPhysics(),
              padding: EdgeInsets.only(
                bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
              ),
              child: Column(
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
                  SizedBox(height: 4.h),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 5.w),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Enter your email to manage your eSIM',
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 15.sp,
                                color: AppColors.textColor,
                              ),
                        ).tr(),
                        SizedBox(height: 5.w),
                        TextFieldWidget(
                          textEditingController:
                              loginController.emailController,
                          focusNode: loginController.femailfocusnode,
                          labelText: tr("Email"),
                          onChanged: (_) {
                            hasPassword = false;
                            setState(() {});
                          },
                        ),
                        SizedBox(height: 2.w),
                        hasPassword == true
                            ? TextFieldWidget(
                                textEditingController:
                                    loginController.pswdController,
                                labelText: tr("password"),
                                maxLines: 1,
                                obscureText: true,
                                showPasswordToggle: true,
                              )
                            : SizedBox(),
                        // Forgot Password Link
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {
                              ForgotPasswordDialog.show(context);
                            },
                            child: Text(
                              'Forgot Password ?',
                              style: TextStyle(
                                fontStyle: FontStyle.italic,
                                color: AppColors.primaryColor,
                                fontSize: 14.sp,
                                decoration: TextDecoration.underline,
                                decorationStyle: TextDecorationStyle.dotted,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 2.h),
                  MultiBlocListener(
                    listeners: [
                      BlocListener<LoginBloc, ApiState<LoginModel>>(
                        listener: (context, state) {
                          isLoading = state is ApiLoading;
                          setState(() {});

                          if (state is ApiSuccess<LoginModel>) {
                            if (state.data.success == true) {
                              hasPassword = state.data.data?.isPasswordSet;
                              log('has already signup $hasPassword');
                              if (hasPassword == false) {
                                Get.to(
                                  () => OtpScreen(
                                    emailid:
                                        loginController.emailController.text,
                                  ),
                                );
                              } else {
                                setState(() {
                                  loginController.pswdController.clear();
                                  hasPassword = state.data.data?.isPasswordSet;
                                });
                              }
                            } else {
                              showToastMessage(message: tr("Invalid login"));
                            }
                          } else if (state is ApiFailure) {
                            showToastMessage(
                              message: "${tr('Login failed:')} ${state.error}",
                            );
                          }
                        },
                      ),
                      BlocListener<LoginPswdBloc, ApiState<LoginPswdModel>>(
                        listener: (context, state) async {
                          isLoading = state is ApiLoading;
                          setState(() {});
                          if (state is ApiSuccess<LoginPswdModel>) {
                            final prefs = await SharedPreferences.getInstance();
                            await prefs.setString(
                              'UserProfileData',
                              jsonEncode(state.data),
                            );
                            UserService.to.loadUserData();
                            // after save Load all data
                            await prefs.setString("Currency", "\$");
                            global.activeCurrencysymbol = prefs.getString(
                              "Currency",
                            );
                            Get.off(() => BottomNavigationBarScreen(index: 0));
                          } else if (state is ApiFailure) {
                            global.showToastMessage(
                              message: state.error ?? tr("Login failed"),
                            );
                          }
                        },
                      ),
                    ],

                    child: BlocBuilder<LoginBloc, ApiState<LoginModel>>(
                      builder: (context, state) {
                        return BlocBuilder<
                          LoginPswdBloc,
                          ApiState<LoginPswdModel>
                        >(
                          builder: (context, state) {
                            return Padding(
                              padding: EdgeInsets.symmetric(horizontal: 5.w),
                              child: CustomElevatedButton(
                                elevation: 0,
                                width: double.infinity,
                                onPressed: isLoading
                                    ? null
                                    : () async {
                                        final email = loginController
                                            .emailController
                                            .text
                                            .trim();
                                        final pswd =
                                            loginController.pswdController.text;
                                        loginController.femailfocusnode
                                            .unfocus();

                                        if (email.isEmpty) {
                                          showToastMessage(
                                            message: tr(
                                              "Please enter an email",
                                            ),
                                          );
                                          return;
                                        }

                                        if (!loginController.isValidEmail(
                                          email,
                                        )) {
                                          showToastMessage(
                                            message: tr(
                                              "Please enter a valid email",
                                            ),
                                          );
                                          return;
                                        }
                                        if (hasPassword == true) {
                                          setState(() {
                                            isLoading = false;
                                          });
                                          context.read<LoginPswdBloc>().add(
                                            LoginPswdEvent(
                                              email: email,
                                              password: pswd,
                                            ),
                                          );
                                        } else {
                                          context.read<LoginBloc>().add(
                                            LoginUser(email),
                                          );
                                        }
                                      },
                                text: isLoading ? null : tr('Continue'),
                                progressIndicator:
                                    const CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                textStyle: Theme.of(context)
                                    .textTheme
                                    .bodyMedium!
                                    .copyWith(
                                      fontSize: 16.sp,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.whiteColor,
                                    ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                  SizedBox(height: 5.h),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 5.w),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Divider(color: Colors.grey, thickness: 0.5),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: Text(
                            tr('Or log in with'),
                            style: Theme.of(context).textTheme.bodyMedium!
                                .copyWith(
                                  fontSize: 15.sp,
                                  fontWeight: FontWeight.normal,
                                  color: AppColors.textColor,
                                ),
                          ),
                        ),
                        const Expanded(
                          child: Divider(color: Colors.grey, thickness: 0.5),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32.0),

                  // -------------Google Sign-in Button----------------
                  BlocListener<FirebaseLoginBloc, ApiState<LoginPswdModel>>(
                    listener: (context, state) async {
                      if (state is! ApiLoading) {
                        if (mounted) {
                          setState(() {
                            _isLoading = false;
                          });
                        }
                      }
                      if (state is ApiSuccess) {
                        final prefs = await SharedPreferences.getInstance();
                        await prefs.setString(
                          'UserProfileData',
                          jsonEncode(state.data),
                        );
                        UserService.to
                            .loadUserData(); // after save Load all data
                        Get.off(() => BottomNavigationBarScreen(index: 0));
                      } else if (state is ApiFailure) {}
                    },
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 5.w),
                      child: CustomOutlinedButton(
                        icon: Icon(FontAwesomeIcons.google, size: 19.sp),
                        width: double.infinity,
                        text: _isLoading ? '' : tr("Continue with Google"),
                        onPressed: _isLoading
                            ? null
                            : () async {
                                setState(() {
                                  _isLoading = true;
                                });

                                final userCredential = await loginController
                                    .signInWithGoogle();
                                if (userCredential != null) {
                                  final user = userCredential.user;
                                  String? emailid = user?.email;
                                  context.read<FirebaseLoginBloc>().add(
                                    FirebaseLoginEvent(emailid!),
                                  );
                                } else {
                                  if (mounted) {
                                    setState(() {
                                      _isLoading = false;
                                    });
                                  }
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Google Sign-in failed or was cancelled',
                                      ).tr(),
                                    ),
                                  );
                                }
                              },
                      ),
                    ),
                  ),

                  // -------------Apple Sign-in Button----------------
                  SizedBox(height: 2.h), // Add spacing between buttons

                  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS)
                    BlocListener<FirebaseLoginBloc, ApiState<LoginPswdModel>>(
                      listener: (context, state) async {
                        if (state is! ApiLoading) {
                          if (mounted) {
                            setState(() {
                              _isAppleLoading = false;
                            });
                          }
                        }
                        if (state is ApiSuccess) {
                          final prefs = await SharedPreferences.getInstance();
                          await prefs.setString(
                            'UserProfileData',
                            jsonEncode(state.data),
                          );
                          UserService.to.loadUserData();
                          Get.off(() => BottomNavigationBarScreen(index: 0));
                        } else if (state is ApiFailure) {
                          // Handle Apple sign-in failure
                          if (mounted) {
                            setState(() {
                              _isAppleLoading = false;
                            });
                          }
                        }
                      },
                      child: Padding(
                        padding: EdgeInsets.symmetric(horizontal: 5.w),
                        child: CustomOutlinedButton(
                          backgroundColor: MaterialStateProperty.all(
                            Colors.black,
                          ),
                          icon: Icon(
                            Icons.apple,
                            color: Colors.white,
                            size: 20.sp,
                          ),
                          width: double.infinity,
                          text: _isAppleLoading
                              ? ''
                              : tr("Continue with Apple"),
                          textColor: Colors.white,
                          onPressed: _isAppleLoading
                              ? null
                              : () async {
                                  setState(() {
                                    _isAppleLoading = true;
                                  });

                                  final userCredential = await loginController
                                      .signInWithApple();

                                  if (userCredential != null) {
                                    print(' UID: ${userCredential.user?.uid}');
                                    print(
                                      ' Email:${userCredential.user?.email}',
                                    );

                                    final user = userCredential.user;
                                    final String uid = user!.uid;

                                    // Try to get email from multiple sources
                                    String? emailid = await _getUserEmail(
                                      uid,
                                      user.email,
                                    );

                                    if (emailid != null) {
                                      context.read<FirebaseLoginBloc>().add(
                                        FirebaseLoginEvent(emailid),
                                      );
                                    } else {
                                      // No email available - handle this case
                                      await _handleNoEmailScenario(
                                        uid,
                                        context,
                                      );
                                    }
                                  } else {
                                    if (mounted) {
                                      setState(() {
                                        _isAppleLoading = false;
                                      });
                                    }
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          ' Sign-in failed or was cancelled',
                                        ),
                                      ),
                                    );
                                  }
                                },
                        ),
                      ),
                    ),

                  SizedBox(height: 5.h),

                  // ----------Terms and Conditions-------------
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
                                loginController.femailfocusnode.unfocus();
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
                                loginController.femailfocusnode.unfocus();
                                Get.to(() => PrivacyPolicyScreen(index: 0));
                              },
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24.0),
                ],
              ),
            ),
            //skip text with icon forward arrow
            Positioned(
              top: 10,
              right: 0,
              child: GestureDetector(
                onTap: () async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setString("Currency", "\$");
                  global.activeCurrencysymbol = prefs.getString("Currency");
                  context.read<UserProfileBloc>().add(UserProfileEvent());
                  Get.find<BottomNavController>().navigateToTab(0);
                },
                child: Padding(
                  padding: EdgeInsets.only(top: 2.h, right: 5.w),
                  child: Align(
                    alignment: Alignment.topRight,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          tr('Skip'),
                          style: Theme.of(context).textTheme.bodyMedium!
                              .copyWith(
                                fontSize: 17.sp,
                                fontWeight: FontWeight.normal,
                                color: AppColors.textColor,
                              ),
                        ),
                        SizedBox(width: 1.w),
                        Icon(
                          Icons.arrow_forward_ios,
                          size: 18.sp,
                          color: AppColors.textColor,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<String?> _getUserEmail(String uid, String? currentEmail) async {
    if (currentEmail != null && currentEmail.isNotEmpty) {
      log('Using email from current sign-in: $currentEmail');
      return currentEmail;
    }
    try {
      final userData = await loginController.getUserData(uid);
      final storedEmail = userData?['email'] as String?;
      if (storedEmail != null && storedEmail.isNotEmpty) {
        log('Using stored email from Firestore: $storedEmail');
        return storedEmail;
      }
    } catch (e) {
      log('Error retrieving user data from Firestore: $e');
    }
    return null;
  }

  Future<void> _handleNoEmailScenario(String uid, BuildContext context) async {
    if (mounted) {
      setState(() {
        _isAppleLoading = false;
      });
    }
    final enteredEmail = await _showEmailInputDialog(context);
    if (enteredEmail != null && enteredEmail.isNotEmpty) {
      await loginController.saveUserData(uid, enteredEmail, null);
      if (mounted) {
        setState(() {
          _isAppleLoading = true;
        });
      }
      context.read<FirebaseLoginBloc>().add(FirebaseLoginEvent(enteredEmail));
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Email is required to continue').tr()),
        );
      }
    }
  }

  Future<String?> _showEmailInputDialog(BuildContext context) async {
    final emailController = TextEditingController();

    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Email Required').tr(),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('apple_email_missing').tr(),
            SizedBox(height: 16),
            TextFormField(
              controller: emailController,
              decoration: InputDecoration(
                labelText: tr('Email'),
                hintText: 'your@email.com',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
              autofocus: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel').tr(),
          ),
          ElevatedButton(
            onPressed: () {
              final email = emailController.text.trim();
              if (email.isNotEmpty && loginController.isValidEmail(email)) {
                Navigator.pop(context, email);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Please enter a valid email').tr()),
                );
              }
            },
            child: Text('Continue').tr(),
          ),
        ],
      ),
    );
  }
}

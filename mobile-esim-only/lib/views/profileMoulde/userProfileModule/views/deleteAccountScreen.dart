import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/view/loginScreen.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/deleteAccount_model.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/deleteAccount_bloc/deleteAccount_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/deleteAccount_bloc/deleteAccount_event.dart';
import 'package:esimconnect/widgets/customElevatedButton.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  bool _confirmed = false;

  Future<void> _finishDeletedAccount() async {
    await UserService.to.clearUserData();
    global.showToastMessage(message: tr('Account deleted successfully'));
    Get.offAll(() => LoginScreen());
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DeleteAccountBloc(ApiService()),
      child: BlocConsumer<DeleteAccountBloc, ApiState<DeleteModel>>(
        listener: (context, state) async {
          if (state is ApiSuccess<DeleteModel>) {
            await _finishDeletedAccount();
          } else if (state is ApiFailure<DeleteModel>) {
            global.showToastMessage(
              message: state.error ?? tr('Deleting account failed'),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is ApiLoading<DeleteModel>;

          return SafeArea(
            child: Scaffold(
              backgroundColor: AppColors.scaffoldbackgroudColor,
              appBar: AppBar(
                elevation: 0,
                backgroundColor: AppColors.scaffoldbackgroudColor,
                title: Text(
                  tr('Delete Account'),
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 15.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                leading: IconButton(
                  onPressed: isLoading ? null : () => Get.back(),
                  icon: Icon(
                    Icons.arrow_back_rounded,
                    color: AppColors.appTextPrimary,
                  ),
                ),
              ),
              body: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _warningHeader(),
                  const SizedBox(height: 18),
                  _infoCard(
                    icon: Icons.delete_forever_rounded,
                    title: tr('What will be deleted'),
                    lines: [
                      tr('Your G5 eSIM account profile'),
                      tr('Saved login session and app account access'),
                      tr('Personal data linked to your app account'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _infoCard(
                    icon: Icons.receipt_long_rounded,
                    title: tr('What may be retained'),
                    lines: [
                      tr(
                        'Some order, payment, invoice, fraud-prevention, or legal records may be retained when required by law.',
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  CheckboxListTile(
                    value: _confirmed,
                    onChanged: isLoading
                        ? null
                        : (value) {
                            setState(() => _confirmed = value ?? false);
                          },
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    activeColor: AppColors.redColor,
                    title: Text(
                      tr('I understand that deleting my account is permanent.'),
                      style: TextStyle(
                        color: AppColors.appTextPrimary,
                        fontSize: 13.sp,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  CustomElevatedButton(
                    onPressed: _confirmed && !isLoading
                        ? () {
                            context.read<DeleteAccountBloc>().add(
                              const DeleteAccountEvent(),
                            );
                          }
                        : null,
                    backgroundColor: AppColors.redColor,
                    text: isLoading ? null : tr('Delete Account'),
                  ),
                  const SizedBox(height: 10),
                  TextButton(
                    onPressed: isLoading ? null : () => Get.back(),
                    child: Text(
                      tr('Cancel'),
                      style: TextStyle(color: AppColors.appTextSecondary),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _warningHeader() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.redColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.redColor.withOpacity(0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: AppColors.redColor),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr('Delete your G5 eSIM account'),
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  tr(
                    'This request permanently deletes your account and removes access to your G5 eSIM profile.',
                  ),
                  style: TextStyle(
                    color: AppColors.appTextSecondary,
                    fontSize: 12.sp,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoCard({
    required IconData icon,
    required String title,
    required List<String> lines,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primaryColor),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...lines.map(
            (line) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 5,
                    height: 5,
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      color: AppColors.appTextSecondary,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      line,
                      style: TextStyle(
                        color: AppColors.appTextSecondary,
                        fontSize: 12.sp,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

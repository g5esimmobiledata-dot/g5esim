// --- The New KYC Form Screen ---

import 'dart:io';
import 'package:esimconnect/widgets/CustomElevatedButton.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import '../../../../utills/config.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import '../../../profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import '../kycform_bloc/kyc_form_bloc.dart';
import '../kycform_bloc/kycformevent.dart';
import '../model/KYCResponse.dart';
import 'imagefullscreen.dart';

class KycFormScreen extends StatefulWidget {
  const KycFormScreen({super.key});

  @override
  State<KycFormScreen> createState() => _KycFormScreenState();
}

class _KycFormScreenState extends State<KycFormScreen> {
  File? _document;
  String? selectedDocumentType;
  final List<String> documentTypes = [
    'Passport',
    'National ID Card',
    'Driving License',
    'Proff of Address',
  ];

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(void Function(File?) setImage) async {
    final XFile? pickedFile = await _picker.pickImage(
      source: ImageSource.gallery,
    );
    if (pickedFile != null) {
      setState(() {
        setImage(File(pickedFile.path));
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _submitForm() {
    if (_document != null && selectedDocumentType != null) {
      // Dispatch the event to the review_blocs
      BlocProvider.of<KycFormBloc>(context).add(
        KycFormEvent(
          documentType: selectedDocumentType ?? "",
          document: _document!.path,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Please fill all fields and select all images.").tr(),
        ),
      );
    }
  }

  Widget _buildImagePicker(
    String label,
    File? imageFile,
    void Function(File?) onImagePicked,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 16.sp, fontWeight: FontWeight.normal),
        ).tr(),
        const SizedBox(height: 8),
        Column(
          children: [
            Row(
              children: [
                Container(
                  height: 40,
                  width: 60.w,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(3.w),
                    border: Border.all(color: Colors.grey),
                  ),
                  child: imageFile != null
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SizedBox(width: 8),
                            Icon(
                              Icons.file_download_done,
                              color: Colors.grey,
                              size: 20,
                            ),
                            SizedBox(width: 8),
                            SizedBox(
                              width: 45.w,
                              child: Text(
                                imageFile.path.split('/').last,
                                style: TextStyle(color: Colors.grey),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.add_a_photo,
                              color: Colors.grey,
                              size: 20,
                            ),
                            SizedBox(width: 8),
                            Text(
                              "Click on upload",
                              style: TextStyle(color: Colors.grey),
                            ).tr(),
                            SizedBox(width: 10),
                            Icon(
                              Icons.arrow_forward,
                              color: Colors.grey,
                              size: 15,
                            ),
                          ],
                        ),
                ),
                SizedBox(width: 8),
                CustomElevatedButton(
                  width: 28.w,
                  height: 40,
                  onPressed: () => _pickImage(onImagePicked),
                  text: tr("Upload"),
                  padding: EdgeInsets.all(0.w),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Complete KYC Form").tr()),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            /// Document Type Dropdown
            const Text(
              'Select Document Type',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.normal),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: selectedDocumentType,
              hint: const Text('Choose document type'),
              items: documentTypes
                  .map(
                    (type) => DropdownMenuItem(value: type, child: Text(type)),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  selectedDocumentType = value;
                });
              },
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),
            SizedBox(height: 2.h),
            _buildImagePicker(
              "Document",
              _document,
              (file) => _document = file,
            ),
            SizedBox(height: 2.h),

            /// Instructions
            const Text(
              'Document Requirements',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.normal),
            ),
            SizedBox(height: 2.h),
            _instructionItem('Must be a government-issued ID'),
            _instructionItem('Photo should be clear and readable'),
            _instructionItem('All corners of the document must be visible'),
            _instructionItem('No glare or shadows covering text'),
            SizedBox(height: 2.h),

            /// Instruction Image
            const Text(
              'How to Upload Document Photo',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.normal),
            ),
            SizedBox(height: 2.h),
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => FullScreenImageView(
                      imagePath:
                          '$imageBaseUrl/uploads/kyc-details/kyc-details.jpeg',
                    ),
                  ),
                );
              },
              child: Center(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    '$imageBaseUrl/uploads/kyc-details/kyc-details.jpeg',
                    height: 30.h,
                    width: 90.w,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),

      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 2),
          child: BlocConsumer<KycFormBloc, ApiState<KYCResponse>>(
            listener: (context, state) {
              if (state is ApiSuccess) {
                context.read<UserProfileBloc>().add(UserProfileEvent());
                Get.back();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("KYC Form Submitted Successfully!").tr(),
                  ),
                );
              }
            },
            builder: (context, state) {
              final isLoading = state is ApiLoading;
              return SizedBox(
                height: 43,
                child: ElevatedButton(
                  onPressed: isLoading ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          "Submit KYC Form",
                          style: TextStyle(fontSize: 16.sp),
                        ).tr(),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _instructionItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }

  Widget _buildTextFormField({
    required TextEditingController controller,
    required String label,
    required String? Function(String?) validator,
    int? maxLines = 1,
    int? minline = 1,
    bool readOnly = false,
    VoidCallback? onTap,
  }) {
    return TextFormField(
      controller: controller,
      validator: validator,
      maxLines: maxLines,
      minLines: minline,
      readOnly: readOnly,
      onTap: onTap,
      decoration: InputDecoration(
        isDense: true,
        border: OutlineInputBorder(
          borderSide: const BorderSide(color: Colors.grey),
          borderRadius: BorderRadius.circular(3.w),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: Colors.grey),
          borderRadius: BorderRadius.circular(3.w),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: Colors.grey),
          borderRadius: BorderRadius.circular(3.w),
        ),
        fillColor: readOnly == true ? Colors.grey.shade200 : Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 3.w),
        labelText: tr(label),
        labelStyle: Theme.of(context).textTheme.bodyMedium!.copyWith(
          fontSize: 15.sp,
          fontWeight: FontWeight.w400,
          color: AppColors.textGreyColor,
        ),
        floatingLabelStyle: Theme.of(context).textTheme.bodyMedium!.copyWith(
          fontSize: 16.sp,
          fontWeight: FontWeight.normal,
          color: AppColors.primaryColor,
        ),
      ),
    );
  }
}

import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/bloc/editProfile_bloc/editProfile_event.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:esimconnect/core/bloc/api_bloc.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';

import '../../model/profileupdateModel.dart';

class EditProfileBloc
    extends
        ApiBloc<
          EditProfileEvent,
          ApiState<ProfileUpdateModel>,
          ProfileUpdateModel
        > {
  final ApiService apiService;

  EditProfileBloc(this.apiService) : super(ApiInitial()) {
    on<EditProfileEvent>(_onEditProfileEvent);
  }

  Future<void> _onEditProfileEvent(
    EditProfileEvent event,
    Emitter<ApiState<ProfileUpdateModel>> emit,
  ) async {
    debugPrint('🚀 EditProfileEvent triggered loadingState');
    emit(loadingState());
    try {
      final users = await executeApiCall(event);
      emit(successState(users));
    } catch (e) {
      emit(errorState(e.toString()));
    }
  }

  @override
  Future<ProfileUpdateModel> executeApiCall(EditProfileEvent event) async {
    try {
      final profileImagePath = event.profileImage?.trim() ?? '';
      final profileImageFileName = profileImagePath.isNotEmpty
          ? profileImagePath.split(Platform.pathSeparator).last
          : '';
      final formData = FormData.fromMap({
        'name': event.name,
        'phone': event.phone,
        "address": event.address,
        "currency": event.currency,
        'destination': event.destination,
      });
      final profileImageBytes = event.profileImageBytes;
      if (profileImageBytes != null && profileImageBytes.isNotEmpty) {
        final fileName = _safeProfileImageFileName(event.profileImageFileName);
        formData.files.add(
          MapEntry(
            'profileImage',
            MultipartFile.fromBytes(
              profileImageBytes,
              filename: fileName,
              contentType: DioMediaType.parse(
                _safeProfileImageMimeType(event.profileImageMimeType, fileName),
              ),
            ),
          ),
        );
      } else if (profileImagePath.isNotEmpty) {
        formData.files.add(
          MapEntry(
            'profileImage',
            await MultipartFile.fromFile(
              profileImagePath,
              filename: profileImageFileName,
            ),
          ),
        );
      }
      final response = await apiService.put(
        ApiEndPoints.UPDATEPROFILE,
        data: formData,
      );

      log('Edit Profile response: ${jsonEncode(response)}');
      if (response['success'] == true) {
        showToastMessage(message: "Profile updated successfully");
      } else {
        final msg = response['message'] ?? 'Failed to update profile';
        showToastMessage(message: msg);
      }

      return ProfileUpdateModel.fromJson(response);
    } catch (e) {
      throw e is DioException
          ? e.message ?? 'Failed EditUserProfile'
          : 'Unknown error occurred';
    }
  }

  String _safeProfileImageFileName(String? value) {
    final fileName = value?.trim();
    if (fileName == null || fileName.isEmpty) return 'profile.jpg';
    return fileName.contains('.') ? fileName : '$fileName.jpg';
  }

  String _safeProfileImageMimeType(String? value, String fileName) {
    final mimeType = value?.trim().toLowerCase();
    if (mimeType != null && mimeType.startsWith('image/')) {
      return mimeType;
    }

    final extension = fileName.split('.').last.toLowerCase();
    switch (extension) {
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }

  @override
  ApiState<ProfileUpdateModel> loadingState() => ApiLoading();

  @override
  ApiState<ProfileUpdateModel> successState(ProfileUpdateModel response) =>
      ApiSuccess(response);

  @override
  ApiState<ProfileUpdateModel> errorState(String error) => ApiFailure(error);
}

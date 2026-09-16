import 'dart:convert';
import 'dart:developer';

import 'package:dio/dio.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  final Dio _dio;

  static const String _reset = '\x1B[0m';
  static const String _red = '\x1B[31m';
  static const String _green = '\x1B[32m';
  static const String _yellow = '\x1B[33m';
  static const String _cyan = '\x1B[36m';
  static const String _bold = '\x1B[1m';

  void _logError(String message) {
    log('$_red$_bold$message$_reset');
  }

  void _logSuccess(String message) {
    log('$_green$message$_reset');
  }

  void _logWarning(String message) {
    log('$_yellow$message$_reset');
  }

  void _logInfo(String message) {
    log('$_cyan$message$_reset');
  }

  ApiService({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 90),
              receiveTimeout: const Duration(seconds: 90),
              headers: {'Content-Type': 'application/json'},
            ),
          ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra['requiresAuth'] == false) {
            return handler.next(options);
          }

          final prefs = await SharedPreferences.getInstance();
          final userData = prefs.getString('UserProfileData');
          if (userData != null) {
            try {
              final userMap = jsonDecode(userData);
              final token = userMap['data']?['token'] as String?;

              if (token != null && token.isNotEmpty) {
                options.headers['Authorization'] = 'Bearer $token';
                _logSuccess('Token attached to request');
              } else {
                _logWarning('No token found in user data');
              }
            } catch (e) {
              _logError('Error decoding user data: $e');
            }
          } else {
            _logWarning('No user data found in SharedPreferences');
          }

          return handler.next(options);
        },
        onResponse: (response, handler) {
          _logInfo('----------------------------------------');
          _logSuccess(
            'RESPONSE: ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.path}',
          );
          _logInfo('----------------------------------------');
          return handler.next(response);
        },
        onError: (error, handler) {
          _logError('----------------------------------------');
          _logError(
            'ERROR: ${error.requestOptions.method} ${error.requestOptions.path}',
          );
          _logError('Status Code: ${error.response?.statusCode}');
          _logError('Error Response: ${error.response?.data}');
          _logError('----------------------------------------');

          if (error.response?.statusCode == 401) {
            _logWarning('Unauthorized - token may be expired or invalid');
          }

          return handler.next(error);
        },
      ),
    );
  }

  DioException _handleError(DioException e, String method) {
    var errorMessage = 'Something went wrong';
    final safeHeaders = Map<String, dynamic>.from(e.requestOptions.headers);
    safeHeaders.remove('Authorization');

    _logError('----------------------------------------');
    _logError('ERROR in $method method');
    _logError(
      'Request URL: ${e.requestOptions.baseUrl}${e.requestOptions.path}',
    );
    _logError('Request Method: ${e.requestOptions.method}');
    _logError('Request Data: ${e.requestOptions.data}');
    _logError('Request Headers: $safeHeaders');
    _logError('Query Parameters: ${e.requestOptions.queryParameters}');
    _logError('----------------------------------------');

    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      final responseData = e.response!.data;
      _logError('Response Status Code: $statusCode');
      _logError('Response Data: $responseData');

      switch (statusCode) {
        case 400:
          errorMessage = _extractErrorMessage(
            responseData,
            'Bad Request - Invalid data sent to server',
          );
          _logError('400 Bad Request: $errorMessage');
          break;
        case 401:
          errorMessage = _extractErrorMessage(
            responseData,
            'Unauthorized - Please login again',
          );
          _logError('401 Unauthorized: $errorMessage');
          break;
        case 403:
          errorMessage = _extractErrorMessage(
            responseData,
            "Forbidden - You don't have permission",
          );
          _logError('403 Forbidden: $errorMessage');
          break;
        case 404:
          errorMessage = _extractErrorMessage(
            responseData,
            "Not Found - Resource doesn't exist",
          );
          _logError('404 Not Found: $errorMessage');
          break;
        case 422:
          errorMessage = _extractErrorMessage(responseData, 'Validation Error');
          _logError('422 Validation Error: $errorMessage');
          break;
        case 500:
          errorMessage = _extractErrorMessage(
            responseData,
            'Server Error - Please try again later',
          );
          _logError('500 Server Error: $errorMessage');
          break;
        case 503:
          errorMessage = _extractErrorMessage(
            responseData,
            'Service Unavailable - Server is down',
          );
          _logError('503 Service Unavailable: $errorMessage');
          break;
        default:
          errorMessage = _extractErrorMessage(
            responseData,
            'Error: $statusCode',
          );
          _logError('Status $statusCode: $errorMessage');
      }

      if (responseData is Map && responseData['success'] == false) {
        errorMessage = responseData['message'] ?? errorMessage;
        _logError('API returned success=false: $errorMessage');
      }
    } else {
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
          errorMessage = 'Connection timeout - Please check your internet';
          _logError('Connection Timeout');
          break;
        case DioExceptionType.sendTimeout:
          errorMessage = 'Send timeout - Request took too long';
          _logError('Send Timeout');
          break;
        case DioExceptionType.receiveTimeout:
          errorMessage = 'Receive timeout - Server took too long to respond';
          _logError('Receive Timeout');
          break;
        case DioExceptionType.connectionError:
          final uri = e.requestOptions.uri;
          final serverUrl = '${uri.scheme}://${uri.host}:${uri.port}';
          errorMessage = 'Cannot connect to API server';
          _logError('Connection Error - API server unreachable at $serverUrl');
          break;
        case DioExceptionType.cancel:
          errorMessage = 'Request cancelled';
          _logError('Request Cancelled');
          break;
        default:
          errorMessage = e.message ?? 'Unknown error occurred';
          _logError('Unknown Error: ${e.message}');
      }
    }
    _logError('----------------------------------------');
    return DioException(
      requestOptions: e.requestOptions,
      response: e.response,
      type: e.type,
      error: errorMessage,
      message: errorMessage,
    );
  }

  String _extractErrorMessage(dynamic responseData, String defaultMessage) {
    if (responseData == null) return defaultMessage;
    if (responseData is Map) {
      return responseData['message'] ??
          responseData['error'] ??
          responseData['msg'] ??
          responseData['detail'] ??
          defaultMessage;
    }
    if (responseData is String) {
      return responseData;
    }
    return defaultMessage;
  }

  Future<dynamic> post(
    String endpoint, {
    dynamic data,
    bool? isFromverification = false,
  }) async {
    try {
      final response = await _dio.post(
        endpoint,
        data: data,
        options: data is FormData
            ? Options(contentType: Headers.multipartFormDataContentType)
            : null,
      );
      return response.data;
    } on DioException catch (e) {
      if (isFromverification == true) {
        _logWarning('Verification endpoint error (not throwing): ${e.message}');
        return e.response?.data;
      }
      throw _handleError(e, 'POST');
    } catch (e) {
      _logError('Unexpected error in POST: $e');
      rethrow;
    }
  }

  Future<dynamic> postForm(
    String endpoint, {
    required FormData data,
  }) async {
    try {
      final response = await _dio.post(
        endpoint,
        data: data,
        options: Options(contentType: Headers.multipartFormDataContentType),
      );
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e, 'POST FORM');
    } catch (e) {
      _logError('Unexpected error in POST FORM: $e');
      rethrow;
    }
  }

  Future<List<int>> postBytes(
    String endpoint, {
    dynamic data,
  }) async {
    try {
      final response = await _dio.post<List<int>>(
        endpoint,
        data: data,
        options: Options(responseType: ResponseType.bytes),
      );
      return response.data ?? <int>[];
    } on DioException catch (e) {
      throw _handleError(e, 'POST BYTES');
    } catch (e) {
      _logError('Unexpected error in POST BYTES: $e');
      rethrow;
    }
  }

  Future<dynamic> get(
    String endpoint, {
    Map<String, dynamic>? query,
    bool requiresAuth = true,
  }) async {
    try {
      final response = await _dio.get(
        endpoint,
        queryParameters: query,
        options: Options(extra: {'requiresAuth': requiresAuth}),
      );
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e, 'GET');
    } catch (e) {
      _logError('Unexpected error in GET: $e');
      rethrow;
    }
  }

  Future<dynamic> put(
    String endpoint, {
    dynamic data,
    bool? isFromverification = false,
  }) async {
    try {
      final response = await _dio.put(
        endpoint,
        data: data,
        options: data is FormData
            ? Options(contentType: Headers.multipartFormDataContentType)
            : null,
      );
      return response.data;
    } on DioException catch (e) {
      if (isFromverification == true) {
        _logWarning('Verification endpoint error (not throwing): ${e.message}');
        return e.response?.data;
      }
      throw _handleError(e, 'PUT');
    } catch (e) {
      _logError('Unexpected error in PUT: $e');
      rethrow;
    }
  }

  Future<dynamic> patch(String endpoint, {dynamic data}) async {
    try {
      final response = await _dio.patch(endpoint, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e, 'PATCH');
    } catch (e) {
      _logError('Unexpected error in PATCH: $e');
      rethrow;
    }
  }

  Future<dynamic> delete(String endpoint, {Map<String, dynamic>? query}) async {
    try {
      final response = await _dio.delete(endpoint, queryParameters: query);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e, 'DELETE');
    } catch (e) {
      _logError('Unexpected error in DELETE: $e');
      rethrow;
    }
  }
}

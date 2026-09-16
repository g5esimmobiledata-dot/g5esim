import 'package:dio/dio.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class ApiHostSettingsScreen extends StatefulWidget {
  const ApiHostSettingsScreen({super.key});

  @override
  State<ApiHostSettingsScreen> createState() => _ApiHostSettingsScreenState();
}

class _ApiHostSettingsScreenState extends State<ApiHostSettingsScreen> {
  late final TextEditingController _hostController;
  bool _busy = false;
  bool? _connected;
  String _message = 'Not tested yet';

  @override
  void initState() {
    super.initState();
    _hostController = TextEditingController(
      text: AppRuntimeConfig.realDeviceHost,
    );
  }

  @override
  void dispose() {
    _hostController.dispose();
    super.dispose();
  }

  Future<void> _saveAndTest() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _connected = null;
      _message = 'Checking connection...';
    });

    final host = AppRuntimeConfig.normalizeHost(_hostController.text);
    await AppRuntimeConfig.setRealDeviceHost(host);
    _hostController.text = host;

    try {
      final isLocalHttpHost =
          host.startsWith('localhost') ||
          RegExp(r'^\d{1,3}(\.\d{1,3}){3}(:\d+)?$').hasMatch(host);
      final scheme = isLocalHttpHost ? 'http' : 'https';
      final response = await Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
        ),
      ).get('$scheme://$host/api/public/settings');

      final statusCode = response.statusCode ?? 0;
      final ok = statusCode >= 200 && statusCode < 300;
      setState(() {
        _connected = ok;
        _message = ok ? 'Connected' : 'Server returned $statusCode';
      });
    } on DioException catch (error) {
      final statusCode = error.response?.statusCode;
      setState(() {
        _connected = false;
        _message = statusCode == null
            ? 'Can not connect to this server'
            : 'Server reached, API returned $statusCode';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reset() async {
    setState(() {
      _busy = true;
      _connected = null;
    });
    await AppRuntimeConfig.resetRealDeviceHost();
    _hostController.text = AppRuntimeConfig.realDeviceHost;
    setState(() {
      _busy = false;
      _message = 'Default server restored';
    });
  }

  Color get _statusColor {
    if (_connected == true) return AppColors.primaryColor;
    if (_connected == false) return Colors.redAccent;
    return AppColors.appTextSecondary;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(
          elevation: 0,
          backgroundColor: AppColors.scaffoldbackgroudColor,
          leading: IconButton(
            onPressed: () => Get.back(),
            icon: Icon(
              Icons.arrow_back_rounded,
              color: AppColors.appTextPrimary,
            ),
          ),
          title: Text(
            'Connection Settings',
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontSize: 14.sp,
              fontWeight: FontWeight.normal,
            ),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildStatusCard(),
            SizedBox(height: 3.h),
            Text(
              'Server IP / Host',
              style: TextStyle(
                color: AppColors.appTextPrimary,
                fontSize: 14.sp,
                fontWeight: FontWeight.normal,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _hostController,
              keyboardType: TextInputType.url,
              style: TextStyle(color: AppColors.appTextPrimary),
              decoration: InputDecoration(
                hintText: 'g5esim.mobile',
                hintStyle: TextStyle(color: AppColors.appTextSecondary),
                filled: true,
                fillColor: AppColors.appSurface,
                prefixIcon: Icon(
                  Icons.dns_rounded,
                  color: AppColors.primaryColor,
                ),
                enabledBorder: _inputBorder(AppColors.appBorder),
                focusedBorder: _inputBorder(AppColors.primaryColor),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Example: g5esim.mobile',
              style: TextStyle(
                color: AppColors.appTextSecondary,
                fontSize: 14.sp,
              ),
            ),
            SizedBox(height: 3.h),
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _busy ? null : _saveAndTest,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.check_circle_rounded),
                label: Text(_busy ? 'Checking...' : 'Save & Test'),
                style: ElevatedButton.styleFrom(
                  elevation: 0,
                  foregroundColor: Colors.white,
                  backgroundColor: AppColors.primaryColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            TextButton(
              onPressed: _busy ? null : _reset,
              child: Text(
                'Reset to default',
                style: TextStyle(color: AppColors.appTextSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: _statusColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              _connected == true ? Icons.wifi_rounded : Icons.wifi_find_rounded,
              color: _statusColor,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _message,
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 14.sp,
                    fontWeight: FontWeight.normal,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  baseUrl,
                  style: TextStyle(
                    color: AppColors.appTextSecondary,
                    fontSize: 14.sp,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  OutlineInputBorder _inputBorder(Color color) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: color),
    );
  }
}

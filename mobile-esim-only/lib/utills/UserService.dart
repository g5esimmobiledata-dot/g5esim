import 'dart:convert';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../views/authModule/model/loginpswdModel.dart';
import 'global.dart' as global;

class UserService extends GetxService {
  static const String profileImagePathKey = 'SavedProfileImagePath';
  static UserService get to => Get.find();
  LoginPswdModel? _userData;
  String? _referralCode;
  LoginPswdModel? get currentUserData => _userData;
  String? get referralCode => _referralCode;

  void setReferralCode(String code) {
    _referralCode = code;
  }

  Future<void> loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('UserProfileData');
    if (userJson != null) {
      _userData = LoginPswdModel.fromJson(jsonDecode(userJson));
    }
  }

  Future<void> updateWalletBalance(String balance) async {
    _userData?.data?.walletBalance = balance;
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('UserProfileData');
    if (userJson == null) return;

    final userMap = jsonDecode(userJson) as Map<String, dynamic>;
    final data = Map<String, dynamic>.from(userMap['data'] ?? {});
    data['walletBalance'] = balance;
    userMap['data'] = data;
    await prefs.setString('UserProfileData', jsonEncode(userMap));
  }

  Future<void> updateMemberSummary({
    String? memberType,
    String? rewardsWallet,
    String? referralBalance,
  }) async {
    if (memberType != null && memberType.isNotEmpty) {
      _userData?.data?.memberType = memberType;
    }
    if (rewardsWallet != null && rewardsWallet.isNotEmpty) {
      _userData?.data?.memberRewardsWallet = rewardsWallet;
    }
    if (referralBalance != null && referralBalance.isNotEmpty) {
      _userData?.data?.referralBalance = referralBalance;
    }

    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('UserProfileData');
    if (userJson == null) return;

    final userMap = jsonDecode(userJson) as Map<String, dynamic>;
    final data = Map<String, dynamic>.from(userMap['data'] ?? {});
    if (memberType != null && memberType.isNotEmpty) {
      data['memberType'] = memberType;
    }
    if (rewardsWallet != null && rewardsWallet.isNotEmpty) {
      data['memberRewardsWallet'] = rewardsWallet;
    }
    if (referralBalance != null && referralBalance.isNotEmpty) {
      data['referralBalance'] = referralBalance;
    }
    userMap['data'] = data;
    await prefs.setString('UserProfileData', jsonEncode(userMap));
  }

  Future<String?> getSavedProfileImagePath() async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString(profileImagePathKey)?.trim();
    return path?.isNotEmpty == true ? path : null;
  }

  Future<void> updateProfileImagePath(String imagePath) async {
    final path = imagePath.trim();
    if (path.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(profileImagePathKey, path);

    final userJson = prefs.getString('UserProfileData');
    if (userJson == null) return;

    final userMap = jsonDecode(userJson) as Map<String, dynamic>;
    final data = Map<String, dynamic>.from(userMap['data'] ?? {});
    data['imagePath'] = path;
    userMap['data'] = data;
    await prefs.setString('UserProfileData', jsonEncode(userMap));
  }

  Future<void> updateProfileFields({
    String? name,
    String? phone,
    String? address,
    String? currency,
    String? destination,
    String? imagePath,
  }) async {
    if (name != null && name.trim().isNotEmpty) {
      _userData?.data?.name = name.trim();
    }

    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('UserProfileData');
    if (userJson == null) return;

    final userMap = jsonDecode(userJson) as Map<String, dynamic>;
    final data = Map<String, dynamic>.from(userMap['data'] ?? {});

    void setField(String key, String? value) {
      if (value == null) return;
      data[key] = value.trim();
    }

    setField('name', name);
    setField('phone', phone);
    setField('address', address);
    setField('currency', currency);
    setField('destination', destination);
    setField('imagePath', imagePath);

    userMap['data'] = data;
    await prefs.setString('UserProfileData', jsonEncode(userMap));
  }

  Future<void> clearUserData() async {
    _userData = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('UserProfileData');
    global.activeCurrencyname = "USD";
    global.activeCurrencysymbol = "\$";
  }
}

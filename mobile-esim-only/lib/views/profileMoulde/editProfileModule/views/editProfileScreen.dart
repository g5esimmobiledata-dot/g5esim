import 'dart:convert';
import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:esimconnect/utills/UserService.dart';
import 'package:esimconnect/utills/global.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/navbarModule/bloc/navbar_bloc.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/bloc/editProfile_bloc/editProfile_bloc.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/bloc/editProfile_bloc/editProfile_event.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:intl_phone_field/intl_phone_field.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/image.dart';
import 'package:esimconnect/widgets/textFieldWidget.dart';
import 'package:esimconnect/views/navbarModule/views/bottomNavBarScreen.dart';
import 'package:esimconnect/views/packageModule/packagesList/bloc/country_bloc/countriesListbloc.dart'
    show CountryBloc;
import 'package:esimconnect/views/packageModule/packagesList/bloc/country_bloc/country_event.dart';
import 'package:esimconnect/views/packageModule/packagesList/model/countryListModel.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionList_bloc/region_bloc.dart';
import 'package:esimconnect/views/packageModule/regionsList/regionList_bloc/region_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/Model/userProfileModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/profile_bloc/userprofile_event.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/bloc/getCurrency_bloc/getCurrency_bloc.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/model/getCurrencyModel.dart';
import 'package:esimconnect/views/profileMoulde/editProfileModule/model/profileupdateModel.dart';

class EditUserProfile extends StatefulWidget {
  final String? name;
  final String? email;
  final String? currencyId;
  final String? imagePath;
  final String? currencyName;
  final String? countryName;
  final String? selectedContryId;
  final String? address;
  final String? phoneno;

  const EditUserProfile({
    Key? key,
    this.countryName,
    this.name,
    this.email,
    this.currencyId,
    this.imagePath,
    this.currencyName,
    this.selectedContryId,
    this.address,
    this.phoneno,
  }) : super(key: key);

  @override
  State<EditUserProfile> createState() => _EditUserProfileState();
}

class _EditUserProfileState extends State<EditUserProfile> {
  final nameController = TextEditingController();
  final phoneController = TextEditingController();
  final addressController = TextEditingController();
  final emailController = TextEditingController();
  File? _selectedImage;
  Uint8List? _selectedImageBytes;
  String? _selectedImageFileName;
  String? _selectedImageMimeType;
  String? selectedCurrencyId;
  final ImagePicker _picker = ImagePicker();
  final focusNode = FocusNode();
  String profileimagePath = "";
  String currencyName = "";
  String selectedCountryName = "";
  String selectedContryId = "";
  String? _phoneCountryCode;
  bool _didApplyDefaultCurrency = false;
  bool _didApplyDefaultCountry = false;
  String? _networkCountryCode;

  String _cleanCountryCode(String? value) {
    final code = value?.trim().toUpperCase() ?? '';
    return RegExp(r'^[A-Z]{2}$').hasMatch(code) ? code : '';
  }

  Future<void> _loadDefaultPhoneCountryCode() async {
    final detectedCode = await _detectNetworkCountryCode();
    if (!mounted) return;

    setState(() {
      _networkCountryCode = detectedCode.isNotEmpty ? detectedCode : 'US';
      _phoneCountryCode = detectedCode.isNotEmpty ? detectedCode : 'US';
    });
  }

  Future<String> _detectNetworkCountryCode() async {
    final lookups = <Uri>[
      Uri.parse('https://ipapi.co/json/'),
      Uri.parse('https://ipwho.is/'),
      Uri.parse('https://ipinfo.io/json'),
    ];

    for (final lookup in lookups) {
      final countryCode = await _detectCountryCodeFrom(lookup);
      if (countryCode.isNotEmpty) return countryCode;
    }

    return '';
  }

  Future<String> _detectCountryCodeFrom(Uri uri) async {
    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 3));
      if (response.statusCode != 200) return '';

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) return '';

      return _cleanCountryCode(
        (decoded['country_code'] ?? decoded['country'])?.toString(),
      );
    } catch (_) {
      return '';
    }
  }

  String _guessImageMimeType(String fileName) {
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

  Datum? _findDefaultUsdCurrency(List<Datum> currencies) {
    for (final currency in currencies) {
      final code = currency.code?.trim().toUpperCase() ?? '';
      if (code == 'USD') return currency;
    }

    for (final currency in currencies) {
      final name = currency.name?.trim().toLowerCase() ?? '';
      if (name == 'us dollar' || name == 'usd' || name.contains('dollar')) {
        return currency;
      }
    }

    for (final currency in currencies) {
      if (currency.symbol?.trim() == r'$') return currency;
    }

    return null;
  }

  void _applyDefaultCurrencyIfNeeded(List<Datum> currencies) {
    if (_didApplyDefaultCurrency) return;

    final usdCurrency = _findDefaultUsdCurrency(currencies);
    if (usdCurrency?.id == null) return;

    _didApplyDefaultCurrency = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      setState(() {
        selectedCurrencyId = usdCurrency!.id;
        currencyName = usdCurrency.symbol ?? usdCurrency.code ?? 'USD';
      });
    });
  }

  Countries? _findCountryByCode(List<Countries> countries, String code) {
    final normalizedCode = _cleanCountryCode(code);
    if (normalizedCode.isEmpty) return null;

    for (final country in countries) {
      final countryCode = _cleanCountryCode(country.countryCode?.toString());
      if (countryCode == normalizedCode) return country;
    }

    return null;
  }

  void _applyDefaultCountryIfNeeded(List<Countries> countries) {
    if (_didApplyDefaultCountry || _networkCountryCode == null) return;

    final defaultCountry =
        _findCountryByCode(countries, _networkCountryCode!) ??
        _findCountryByCode(countries, 'US');
    if (defaultCountry?.id == null) return;

    _didApplyDefaultCountry = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      setState(() {
        selectedContryId = defaultCountry!.id.toString();
        selectedCountryName = defaultCountry.name?.toString() ?? '';
      });
    });
  }

  Future<void> pickImage(Function(File?) setImage) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (pickedFile != null) {
        if (kIsWeb) {
          final imageBytes = await pickedFile.readAsBytes();
          setState(() {
            _selectedImage = null;
            _selectedImageBytes = imageBytes;
            _selectedImageFileName = pickedFile.name;
            _selectedImageMimeType =
                pickedFile.mimeType ?? _guessImageMimeType(pickedFile.name);
            profileimagePath = "";
          });
        } else {
          _selectedImageBytes = null;
          _selectedImageFileName = pickedFile.name;
          _selectedImageMimeType =
              pickedFile.mimeType ?? _guessImageMimeType(pickedFile.name);
          setImage(File(pickedFile.path));
        }
      } else {
        setImage(null);
      }
    } catch (e) {
      print('Image pick error: $e');
      setImage(null);
    }
  }

  void _getUserDate() {
    nameController.text = widget.name ?? "";
    emailController.text = widget.email ?? "";
    profileimagePath = widget.imagePath ?? "";
    selectedCurrencyId = widget.currencyId ?? "";
    currencyName = widget.currencyName ?? "";
    selectedCountryName = widget.countryName ?? "";
    selectedContryId = widget.selectedContryId ?? "";
    addressController.text = widget.address ?? "";
    phoneController.text = widget.phoneno ?? "";

    setState(() {});
    print("currencyName:- $selectedCurrencyId");
    print(currencyName);
  }

  void _submitProfile() {
    if (nameController.text == "") {
      global.showToastMessage(message: tr("Name is Required"));
    } else if (selectedCurrencyId != "" && selectedContryId != "") {
      BlocProvider.of<EditProfileBloc>(context).add(
        EditProfileEvent(
          destination: selectedContryId,
          name: nameController.text,
          email: emailController.text,
          profileImage: _selectedImage?.path != null
              ? _selectedImage!.path
              : "",
          profileImageBytes: _selectedImageBytes,
          profileImageFileName: _selectedImageFileName,
          profileImageMimeType: _selectedImageMimeType,
          currency: selectedCurrencyId.toString(),
          phone: phoneController.text,
          address: addressController.text,
        ),
      );
    } else {
      if (selectedCurrencyId == "") {
        showToastMessage(message: tr("Please Select Currency"));
      } else {
        showToastMessage(message: tr("Please Select Country"));
      }
    }
  }

  Future<String?> _saveSelectedProfileImageLocally() async {
    if (kIsWeb) return null;

    final selectedImage = _selectedImage;
    if (selectedImage == null || !await selectedImage.exists()) return null;

    final appDirectory = await getApplicationDocumentsDirectory();
    final extension = selectedImage.path.split('.').last.toLowerCase();
    final safeExtension = extension.isNotEmpty && extension.length <= 5
        ? extension
        : 'jpg';
    final savedImage = File(
      '${appDirectory.path}${Platform.pathSeparator}profile_image.$safeExtension',
    );
    await selectedImage.copy(savedImage.path);
    await UserService.to.updateProfileImagePath(savedImage.path);
    return savedImage.path;
  }

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      context.read<GetCurrencyBloc>().add(GetCurrencyEvent());
      context.read<CountryBloc>().add(CountryEvent());
      _getUserDate();
      _loadDefaultPhoneCountryCode();
    });
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(title: Text('Profile').tr()),
        body: SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.only(left: 4.w, right: 4.w),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: 25),
                  Center(
                    child: Stack(
                      children: [
                        _selectedImage != null || _selectedImageBytes != null
                            ? Container(
                                height: 30.w,
                                width: 30.w,
                                padding: EdgeInsets.all(0.w),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryColor.withOpacity(
                                    0.1,
                                  ),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.primaryColor,
                                  ),
                                ),
                                child: ClipOval(
                                  child: _selectedImageBytes != null
                                      ? Image.memory(
                                          _selectedImageBytes!,
                                          fit: BoxFit.cover,
                                          height: 30.w,
                                          width: 30.w,
                                        )
                                      : _selectedImage != null
                                      ? Image.file(
                                          _selectedImage!,
                                          fit: BoxFit.cover,
                                          height: 30.w,
                                          width: 30.w,
                                        )
                                      : Image.asset(
                                          Images.defaultProfile,
                                          fit: BoxFit.cover,
                                          height: 30.w,
                                          width: 30.w,
                                        ),
                                ),
                              )
                            : profileimagePath != ""
                            ? Container(
                                height: 30.w,
                                width: 30.w,
                                padding: EdgeInsets.all(0.w),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryColor,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.primaryColor,
                                    width: 0.5,
                                  ),
                                ),
                                child: global.isLocalImagePath(profileimagePath)
                                    ? ClipOval(
                                        child: Image.file(
                                          File(
                                            profileimagePath.replaceFirst(
                                              'file://',
                                              '',
                                            ),
                                          ),
                                          fit: BoxFit.cover,
                                          height: 30.w,
                                          width: 30.w,
                                        ),
                                      )
                                    : CachedNetworkImage(
                                        imageUrl: global.buildImageUrl(
                                          profileimagePath,
                                        ),
                                        placeholder: (context, url) =>
                                            const SizedBox(
                                              width: 10,
                                              height: 10,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                              ),
                                            ),
                                        errorWidget: (context, url, error) =>
                                            Container(
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                border: Border.all(
                                                  color: AppColors.primaryColor,
                                                ),
                                                image: DecorationImage(
                                                  image: AssetImage(
                                                    Images.defaultProfile,
                                                  ),
                                                  fit: BoxFit.cover,
                                                ),
                                              ),
                                            ),
                                        imageBuilder:
                                            (context, imageProvider) =>
                                                Container(
                                                  height: 30.w,
                                                  width: 30.w,
                                                  decoration: BoxDecoration(
                                                    shape: BoxShape.circle,
                                                    image: DecorationImage(
                                                      image: imageProvider,
                                                      fit: BoxFit.cover,
                                                    ),
                                                  ),
                                                ),
                                      ),
                              )
                            : Container(
                                height: 30.w,
                                width: 30.w,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.primaryColor,
                                  ),
                                  image: DecorationImage(
                                    image: AssetImage(Images.defaultProfile),
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                        Positioned(
                          bottom: 1,
                          right: 1,
                          child: GestureDetector(
                            onTap: () {
                              pickImage((file) {
                                setState(() {
                                  _selectedImage = file;
                                });
                              });
                            },
                            child: Container(
                              padding: EdgeInsets.all(2.w),
                              height: 30,
                              width: 30,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColors.primaryColor,
                                border: Border.all(color: AppColors.whiteColor),
                              ),
                              child: Image.asset(
                                Images.uploadImage,
                                color: AppColors.whiteColor,
                                height: 4.w,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 5.h),
                  TextFieldWidget(
                    textEditingController: nameController,
                    labelText: tr('Full Name'),
                    keyboardType: TextInputType.name,
                    formatter: [
                      FilteringTextInputFormatter.allow(RegExp("[a-zA-Z ]")),
                    ],
                  ),
                  SizedBox(height: 2.h),
                  if (_phoneCountryCode == null)
                    TextFieldWidget(
                      readOnly: true,
                      textEditingController: phoneController,
                      labelText: tr('Phone Number'),
                      keyboardType: TextInputType.phone,
                      suffixIcon: Icons.schedule,
                    )
                  else
                    IntlPhoneField(
                      key: ValueKey(_phoneCountryCode),
                      controller: phoneController,
                      initialCountryCode: _phoneCountryCode!,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppColors.appSurface,
                        labelText: tr('Phone Number'),
                        hintText: tr("Enter phone number"),
                        hintStyle: Theme.of(context).textTheme.bodyMedium!
                            .copyWith(color: AppColors.textGreyColor),
                        labelStyle: Theme.of(context).textTheme.bodyMedium!
                            .copyWith(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textGreyColor,
                            ),
                        border: OutlineInputBorder(
                          borderSide: BorderSide(color: AppColors.appBorder),
                          borderRadius: BorderRadius.circular(3.w),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: AppColors.appBorder),
                          borderRadius: BorderRadius.circular(3.w),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderSide: BorderSide(color: AppColors.primaryColor),
                          borderRadius: BorderRadius.circular(3.w),
                        ),
                      ),
                      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                        color: AppColors.appTextPrimary,
                      ),
                      dropdownTextStyle: Theme.of(context).textTheme.bodyMedium!
                          .copyWith(color: AppColors.appTextPrimary),
                      disableLengthCheck:
                          false, // ✅ Enforces country-specific length
                      keyboardType: TextInputType.phone,
                      onChanged: (phone) {
                        print("Complete Number: ${phone.completeNumber}");
                        print("Country Code: ${phone.countryCode}");
                        print("National Number: ${phone.number}");
                      },
                      onCountryChanged: (country) {
                        print('Country changed to: ${country.name}');
                      },
                      validator: (phone) {
                        if (phone == null || phone.number.isEmpty) {
                          return tr("Please enter phone number");
                        }
                        return null;
                      },
                    ),
                  SizedBox(height: 1.h),
                  TextFieldWidget(
                    maxLines: 5,
                    textEditingController: addressController,
                    labelText: tr('Address'),
                    keyboardType: TextInputType.streetAddress,
                  ),
                  SizedBox(height: 2.h),
                  TextFieldWidget(
                    readOnly: true,
                    textEditingController: emailController,
                    keyboardType: TextInputType.name,
                    formatter: [
                      FilteringTextInputFormatter.allow(RegExp("[a-zA-Z ]")),
                    ],
                    labelText: tr('Email'),
                  ),
                  SizedBox(height: 2.h),

                  BlocBuilder<GetCurrencyBloc, ApiState<GetCurrencyModel>>(
                    builder: (context, state) {
                      List<Datum> currencyList = [];
                      if (state is ApiLoading) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.appSurface,
                            border: Border.all(color: AppColors.appBorder),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: InkWell(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                RichText(
                                  text: TextSpan(
                                    text: tr("Currency"),
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium!
                                        .copyWith(
                                          fontSize: 17.sp,
                                          fontWeight: FontWeight.normal,
                                          color: AppColors.appTextPrimary,
                                        ),
                                    children: [
                                      TextSpan(text: "    "),
                                      TextSpan(
                                        text: '...',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium!
                                            .copyWith(
                                              fontSize: 16.sp,
                                              fontWeight: FontWeight.w400,
                                              color: AppColors.textGreyColor,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.arrow_drop_down,
                                  color: AppColors.appTextPrimary,
                                ),
                              ],
                            ),
                          ),
                        );
                      } else if (state is ApiSuccess) {
                        currencyList = state.data?.data ?? [];
                        _applyDefaultCurrencyIfNeeded(currencyList);
                      } else if (state is ApiFailure) {
                        showToastMessage(message: tr("Failed to Get Currency"));
                      } else {
                        return SizedBox.shrink();
                      }
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.appSurface,
                          border: Border.all(color: AppColors.appBorder),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: InkWell(
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (context) {
                                String? tempSelectedId = selectedCurrencyId;
                                String? tempCurrencyName = currencyName;
                                print("tempSelectedId:- $tempSelectedId");

                                return StatefulBuilder(
                                  builder: (context, setState) {
                                    return AlertDialog(
                                      backgroundColor: AppColors.appSurface,
                                      insetPadding: const EdgeInsets.symmetric(
                                        horizontal: 28,
                                        vertical: 24,
                                      ),
                                      title: const Text("Select Currency").tr(),
                                      content: SizedBox(
                                        width: double.maxFinite,
                                        height: 300,
                                        child: ListView.builder(
                                          itemCount: currencyList.length,
                                          itemBuilder: (context, index) {
                                            final currency =
                                                currencyList[index];
                                            print(
                                              "currencyid:-  ${currency.id}",
                                            );
                                            return CheckboxListTile(
                                              contentPadding: EdgeInsets.zero,
                                              title: Row(
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      "${currency.name}",
                                                      maxLines: 1,
                                                      overflow:
                                                          TextOverflow.ellipsis,
                                                      style: TextStyle(
                                                        color: AppColors
                                                            .appTextPrimary,
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 12),
                                                  Text(
                                                    "${currency.symbol}",
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: Theme.of(context)
                                                        .textTheme
                                                        .bodyMedium!
                                                        .copyWith(
                                                          fontSize: 16.sp,
                                                          fontWeight:
                                                              FontWeight.w400,
                                                          color: AppColors
                                                              .textGreyColor,
                                                        ),
                                                  ),
                                                ],
                                              ),
                                              activeColor:
                                                  AppColors.primaryColor,
                                              checkColor:
                                                  AppColors.appTextPrimary,
                                              value:
                                                  tempSelectedId ==
                                                  currency.id.toString(),
                                              onChanged: (bool? value) {
                                                setState(() {
                                                  if (value == true) {
                                                    tempSelectedId = currency.id
                                                        .toString();
                                                    tempCurrencyName = currency
                                                        .symbol
                                                        .toString();
                                                  } else {
                                                    tempSelectedId = null;
                                                    tempCurrencyName = '';
                                                  }
                                                });
                                              },
                                            );
                                          },
                                        ),
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Navigator.pop(context);
                                          },
                                          child: const Text("Cancel").tr(),
                                        ),
                                        ElevatedButton(
                                          onPressed: () {
                                            this.setState(() {
                                              selectedCurrencyId =
                                                  tempSelectedId;
                                              currencyName =
                                                  tempCurrencyName ?? '';
                                            });
                                            Navigator.pop(context);
                                          },
                                          child: const Text("OK").tr(),
                                        ),
                                      ],
                                    );
                                  },
                                );
                              },
                            );
                          },
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              RichText(
                                text: TextSpan(
                                  text: tr("Currency"),
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(
                                        fontSize: 17.sp,
                                        fontWeight: FontWeight.w400,
                                        color: AppColors.appTextPrimary,
                                      ),
                                  children: [
                                    TextSpan(text: "    "),
                                    TextSpan(
                                      text: currencyName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                            fontSize: 16.sp,
                                            fontWeight: FontWeight.w400,
                                            color: AppColors.textGreyColor,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.arrow_drop_down,
                                color: AppColors.appTextPrimary,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  SizedBox(height: 2.h),
                  BlocBuilder<CountryBloc, ApiState<CountryListModel>>(
                    builder: (context, state) {
                      List<Countries> countryList = [];
                      if (state is ApiLoading) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.appSurface,
                            border: Border.all(color: AppColors.appBorder),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              RichText(
                                text: TextSpan(
                                  text: tr("Country"),
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(
                                        fontSize: 17.sp,
                                        fontWeight: FontWeight.normal,
                                        color: AppColors.appTextPrimary,
                                      ),
                                  children: [
                                    TextSpan(text: "    "),
                                    TextSpan(
                                      text: '...',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                            fontSize: 16.sp,
                                            fontWeight: FontWeight.w400,
                                            color: AppColors.textGreyColor,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.arrow_drop_down,
                                color: AppColors.appTextPrimary,
                              ),
                            ],
                          ),
                        );
                      } else if (state is ApiSuccess<CountryListModel>) {
                        countryList = state.data.data ?? [];
                        _applyDefaultCountryIfNeeded(countryList);
                      } else if (state is ApiFailure) {
                        showToastMessage(
                          message: tr("Failed to Get Countries"),
                        );
                      } else {
                        return SizedBox.shrink();
                      }

                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.appSurface,
                          border: Border.all(color: AppColors.appBorder),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: InkWell(
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (context) {
                                final countrySearchController =
                                    TextEditingController();
                                String tempSelectedCountry =
                                    selectedCountryName;
                                String tempSelectedCountryId = selectedContryId;
                                String countrySearchQuery = '';
                                return StatefulBuilder(
                                  builder: (context, setState) {
                                    final normalizedQuery = countrySearchQuery
                                        .trim()
                                        .toLowerCase();
                                    final filteredCountryList =
                                        normalizedQuery.isEmpty
                                        ? countryList
                                        : countryList.where((country) {
                                            final name =
                                                country.name
                                                    ?.toString()
                                                    .toLowerCase() ??
                                                '';
                                            final code =
                                                country.countryCode
                                                    ?.toString()
                                                    .toLowerCase() ??
                                                '';
                                            final id =
                                                country.id
                                                    ?.toString()
                                                    .toLowerCase() ??
                                                '';
                                            return name.contains(
                                                  normalizedQuery,
                                                ) ||
                                                code.contains(
                                                  normalizedQuery,
                                                ) ||
                                                id.contains(normalizedQuery);
                                          }).toList();
                                    return AlertDialog(
                                      backgroundColor: AppColors.appSurface,
                                      title: const Text("Select Country").tr(),
                                      content: SizedBox(
                                        width: double.maxFinite,
                                        height: 360,
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            TextField(
                                              controller:
                                                  countrySearchController,
                                              autofocus: true,
                                              style: TextStyle(
                                                color: AppColors.appTextPrimary,
                                              ),
                                              decoration: InputDecoration(
                                                filled: true,
                                                fillColor:
                                                    AppColors.appSurfaceAlt,
                                                hintText: tr("Search Country"),
                                                hintStyle: TextStyle(
                                                  color:
                                                      AppColors.textGreyColor,
                                                ),
                                                prefixIcon: Icon(
                                                  Icons.search,
                                                  color:
                                                      AppColors.textGreyColor,
                                                ),
                                                suffixIcon:
                                                    countrySearchQuery.isEmpty
                                                    ? null
                                                    : IconButton(
                                                        onPressed: () {
                                                          setState(() {
                                                            countrySearchController
                                                                .clear();
                                                            countrySearchQuery =
                                                                '';
                                                          });
                                                        },
                                                        icon: Icon(
                                                          Icons.close,
                                                          color: AppColors
                                                              .textGreyColor,
                                                        ),
                                                      ),
                                                border: OutlineInputBorder(
                                                  borderSide: BorderSide(
                                                    color: AppColors.appBorder,
                                                  ),
                                                  borderRadius:
                                                      BorderRadius.circular(12),
                                                ),
                                                enabledBorder:
                                                    OutlineInputBorder(
                                                      borderSide: BorderSide(
                                                        color:
                                                            AppColors.appBorder,
                                                      ),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            12,
                                                          ),
                                                    ),
                                                focusedBorder:
                                                    OutlineInputBorder(
                                                      borderSide: BorderSide(
                                                        color: AppColors
                                                            .primaryColor,
                                                      ),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                            12,
                                                          ),
                                                    ),
                                                contentPadding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 12,
                                                      vertical: 10,
                                                    ),
                                              ),
                                              onChanged: (value) {
                                                setState(() {
                                                  countrySearchQuery = value;
                                                });
                                              },
                                            ),
                                            const SizedBox(height: 12),
                                            Expanded(
                                              child: filteredCountryList.isEmpty
                                                  ? Center(
                                                      child: Text(
                                                        tr(
                                                          "No countries found",
                                                        ),
                                                        style: Theme.of(context)
                                                            .textTheme
                                                            .bodyMedium!
                                                            .copyWith(
                                                              color: AppColors
                                                                  .textGreyColor,
                                                            ),
                                                      ),
                                                    )
                                                  : ListView.builder(
                                                      itemCount:
                                                          filteredCountryList
                                                              .length,
                                                      itemBuilder: (context, index) {
                                                        final country =
                                                            filteredCountryList[index];
                                                        return CheckboxListTile(
                                                          title: Text(
                                                            "${country.name}",
                                                            style: TextStyle(
                                                              color: AppColors
                                                                  .appTextPrimary,
                                                            ),
                                                          ),
                                                          subtitle:
                                                              country.countryCode ==
                                                                  null
                                                              ? null
                                                              : Text(
                                                                  country
                                                                      .countryCode
                                                                      .toString(),
                                                                  style: TextStyle(
                                                                    color: AppColors
                                                                        .textGreyColor,
                                                                  ),
                                                                ),
                                                          activeColor: AppColors
                                                              .primaryColor,
                                                          checkColor: AppColors
                                                              .appTextPrimary,
                                                          value:
                                                              tempSelectedCountry ==
                                                              country.name,
                                                          onChanged: (bool? value) {
                                                            setState(() {
                                                              if (value ==
                                                                  true) {
                                                                tempSelectedCountryId =
                                                                    country.id
                                                                        ?.toString() ??
                                                                    "";
                                                                tempSelectedCountry =
                                                                    country.name
                                                                        ?.toString() ??
                                                                    '';
                                                              } else {
                                                                tempSelectedCountry =
                                                                    '';
                                                                tempSelectedCountryId =
                                                                    '';
                                                              }
                                                            });
                                                            print(
                                                              "Selected Country: $tempSelectedCountry",
                                                            );
                                                          },
                                                        );
                                                      },
                                                    ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Navigator.pop(context);
                                          },
                                          child: const Text("Cancel").tr(),
                                        ),
                                        ElevatedButton(
                                          onPressed: () {
                                            this.setState(() {
                                              selectedCountryName =
                                                  tempSelectedCountry;
                                              selectedContryId =
                                                  tempSelectedCountryId;
                                            });
                                            print(
                                              " Country: $selectedCountryName",
                                            );

                                            Navigator.pop(context);
                                          },
                                          child: const Text("OK").tr(),
                                        ),
                                      ],
                                    );
                                  },
                                );
                              },
                            );
                          },
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              RichText(
                                text: TextSpan(
                                  text: tr("Country"),
                                  style: Theme.of(context).textTheme.bodyMedium!
                                      .copyWith(
                                        fontSize: 17.sp,
                                        fontWeight: FontWeight.w400,
                                        color: AppColors.appTextPrimary,
                                      ),
                                  children: [
                                    TextSpan(text: "    "),
                                    TextSpan(
                                      text: selectedCountryName.isEmpty
                                          ? tr("Select Country")
                                          : selectedCountryName,
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium!
                                          .copyWith(
                                            fontSize: 16.sp,
                                            fontWeight: FontWeight.w400,
                                            color: AppColors.textGreyColor,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.arrow_drop_down,
                                color: AppColors.appTextPrimary,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  SizedBox(height: 10),
                  SizedBox(height: 70),
                ],
              ),
            ),
          ),
        ),
        bottomSheet: SafeArea(
          child: Container(
            width: double.infinity,
            color: Colors.transparent,
            padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 2),
            margin: EdgeInsets.only(bottom: 2.w),
            child: MultiBlocListener(
              listeners: [
                BlocListener<EditProfileBloc, ApiState<ProfileUpdateModel>>(
                  listener: (context, state) async {
                    if (state is ApiSuccess) {
                      final localImagePath =
                          await _saveSelectedProfileImageLocally();
                      final updatedImagePath =
                          state.data?.data?.imagePath?.toString().trim() ??
                          localImagePath;
                      await UserService.to.updateProfileFields(
                        name: nameController.text,
                        phone: phoneController.text,
                        address: addressController.text,
                        currency: selectedCurrencyId,
                        destination: selectedContryId,
                        imagePath: updatedImagePath,
                      );
                      if (updatedImagePath != null &&
                          updatedImagePath.isNotEmpty &&
                          mounted) {
                        await UserService.to.updateProfileImagePath(
                          updatedImagePath,
                        );
                        setState(() {
                          profileimagePath = updatedImagePath;
                        });
                      }
                      await Future.delayed(const Duration(milliseconds: 500));
                      if (!context.mounted) return;
                      context.read<UserProfileBloc>().add(UserProfileEvent());
                    }
                  },
                ),
                BlocListener<UserProfileBloc, ApiState<UserProfileModel>>(
                  listener: (context, state) {
                    if (state is ApiSuccess) {
                      // Update global currency
                      global.UserkycStatus = state.data?.data?.kycStatus ?? '';
                      global.activeCurrencyname =
                          state.data?.data?.currencyRate?.code;
                      global.activeCurrencysymbol =
                          state.data?.data?.currencyRate?.symbol ?? '\$';

                      // Refresh other blocs if needed
                      context.read<RegionsListBloc>().add(RegionsListEvent());

                      // Now navigate to profile tab
                      Get.find<BottomNavController>().jumpToOriginalTab(4);
                      Get.off(() => BottomNavigationBarScreen(index: 4));
                    }
                  },
                ),
              ],
              child: BlocBuilder<EditProfileBloc, ApiState<ProfileUpdateModel>>(
                builder: (context, state) {
                  final isLoading = state is ApiLoading;

                  return SizedBox(
                    height: 42,
                    child: ElevatedButton(
                      onPressed: isLoading ? null : _submitProfile,
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
                              tr('Update Profile'),
                              style: TextStyle(fontSize: 16.sp),
                            ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

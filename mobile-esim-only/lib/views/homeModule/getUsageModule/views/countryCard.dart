import 'package:esimconnect/utills/region_flag_avatar.dart';
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/widgets/CanvasStyle/wavyBottomPainter.dart';

class CountryCard extends StatelessWidget {
  static const colorPalette = [
    Color(0xFFF28A2E),
    Color(0xFF2F80ED),
    Color(0xFF27AE60),
    Color(0xFF00A6A6),
    Color(0xFF7C5CFF),
    Color(0xFFE2556F),
  ];

  static Color colorForIndex(int index) =>
      colorPalette[index % colorPalette.length];

  final String imagePath;
  final String countryName;
  final String? countryCode;
  final List<String>? countryCodes;
  final String? flagemoji;
  final Color? cardColor;

  const CountryCard({
    Key? key,
    required this.imagePath,
    required this.countryName,
    this.countryCode,
    this.countryCodes,
    this.flagemoji,
    this.cardColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final backgroundColor = countryName == "Discover Global"
        ? Colors.pinkAccent
        : cardColor ?? _colorForName(countryName);

    return Container(
      width: 37.w,
      margin: EdgeInsets.symmetric(horizontal: 1.w, vertical: 2),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            backgroundColor.withOpacity(0.96),
            backgroundColor.withOpacity(0.78),
          ],
        ),
        borderRadius: BorderRadius.circular(2.w),
        border: Border.all(color: Colors.white.withOpacity(0.18), width: 0.8),
        boxShadow: [
          BoxShadow(
            color: backgroundColor.withOpacity(0.22),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: ClipRRect(
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(2.w), // Use fixed values
                bottomRight: Radius.circular(2.w),
              ),
              child: CustomPaint(
                size: const Size(150, 40),
                painter: WavyBottomPainter(
                  color: Colors.white.withOpacity(0.22),
                ),
              ),
            ),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                RegionFlagAvatar(
                  imagePath: countryCodes == null ? imagePath : null,
                  countryCodes: countryCodes ?? _singleCountryCode,
                  size: 10.w,
                  fallbackColor: Colors.white,
                ),

                const SizedBox(height: 5), // Adjust spacing
                Text(
                  countryName,
                  style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.normal,
                    color: countryName == "Discover Global"
                        ? Colors.white
                        : Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<String>? get _singleCountryCode {
    final code = countryCode?.trim();
    if (code == null || code.isEmpty) return null;
    return [code];
  }

  Color _colorForName(String value) {
    final index = value.codeUnits.fold<int>(
      0,
      (sum, codeUnit) => sum + codeUnit,
    );
    return colorForIndex(index);
  }
}

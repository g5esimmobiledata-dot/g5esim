import 'package:country_flags/country_flags.dart';
import 'package:esimconnect/utills/flag_utils.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

bool hasUsableFlagEmoji(String? value) {
  return hasUsableFlagEmojiValue(value);
}

bool looksLikeFlagImagePath(String? value) {
  return looksLikeFlagImagePathValue(value);
}

Widget buildCountryFlag(
  String? countryCode, {
  required double size,
  double? width,
  double? height,
  Widget? fallback,
}) {
  final normalized = countryCode?.trim().toUpperCase() ?? '';
  if (normalized.length != 2 ||
      normalized.codeUnits.any((codeUnit) => codeUnit < 65 || codeUnit > 90)) {
    return fallback ?? Icon(Icons.public, size: size, color: Colors.grey);
  }

  if (kIsWeb) {
    final emoji = flagEmojiFromCountryCode(normalized);

    return SizedBox(
      width: width ?? size,
      height: height ?? size,
      child: Center(
        child: Text(emoji ?? '', style: TextStyle(fontSize: size)),
      ),
    );
  }

  return CountryFlag.fromCountryCode(normalized, theme: EmojiTheme(size: size));
}

Widget buildCountryFlagOrEmoji({
  required double size,
  String? countryCode,
  String? flagEmoji,
  Color fallbackColor = Colors.grey,
  double? width,
  double? height,
}) {
  final resolvedFlagEmoji = flagEmoji;
  Widget fallbackWidget;
  if (hasUsableFlagEmoji(resolvedFlagEmoji)) {
    fallbackWidget = SizedBox(
      width: width ?? size,
      height: height ?? size,
      child: Center(
        child: Text(
          resolvedFlagEmoji!.trim(),
          style: TextStyle(fontSize: size),
        ),
      ),
    );
  } else {
    fallbackWidget = Icon(Icons.public, size: size, color: fallbackColor);
  }

  return buildCountryFlag(
    countryCode,
    size: size,
    width: width,
    height: height,
    fallback: fallbackWidget,
  );
}

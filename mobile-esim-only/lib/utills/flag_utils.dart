String? flagEmojiFromCountryCode(String? countryCode) {
  final normalized = countryCode?.trim().toUpperCase() ?? '';
  if (normalized.length != 2 ||
      normalized.codeUnits.any((codeUnit) => codeUnit < 65 || codeUnit > 90)) {
    return null;
  }

  const regionalIndicatorOffset = 0x1F1E6 - 65;
  return String.fromCharCodes(
    normalized.codeUnits.map((codeUnit) => codeUnit + regionalIndicatorOffset),
  );
}

bool looksLikeFlagImagePathValue(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty || trimmed.toLowerCase() == 'null') {
    return false;
  }
  return trimmed.startsWith('/') || trimmed.startsWith('http');
}

bool hasUsableFlagEmojiValue(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty || trimmed.toLowerCase() == 'null') {
    return false;
  }
  if (looksLikeFlagImagePathValue(trimmed)) return false;

  // Guard against mojibake / replacement characters from mis-decoded emojis.
  if (trimmed.codeUnits.contains(0x00F0) || trimmed.runes.contains(0xFFFD)) {
    return false;
  }

  return true;
}

String? resolveFlagEmoji(String? flagEmoji, String? countryCode) {
  if (hasUsableFlagEmojiValue(flagEmoji)) return flagEmoji!.trim();
  return flagEmojiFromCountryCode(countryCode);
}

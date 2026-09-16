import 'package:cached_network_image/cached_network_image.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/country_flag_fallback.dart';
import 'package:flutter/material.dart';

class RegionFlagAvatar extends StatelessWidget {
  final String? imagePath;
  final List<String>? countryCodes;
  final double size;
  final Color backgroundColor;
  final Color borderColor;
  final Color fallbackColor;
  final bool showBackground;
  final bool showFlagDecoration;

  const RegionFlagAvatar({
    super.key,
    this.imagePath,
    this.countryCodes,
    required this.size,
    this.backgroundColor = const Color(0xFFEFF7F4),
    this.borderColor = const Color(0xFFD7E7E1),
    this.fallbackColor = Colors.grey,
    this.showBackground = false,
    this.showFlagDecoration = false,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = _buildImageUrl(imagePath);
    final fallback = _RegionFlagCluster(
      countryCodes: countryCodes,
      size: size,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      fallbackColor: fallbackColor,
      showBackground: showBackground,
      showFlagDecoration: showFlagDecoration,
    );

    if (imageUrl == null) return fallback;

    return CachedNetworkImage(
      imageUrl: imageUrl,
      width: size,
      height: size,
      fit: BoxFit.cover,
      placeholder: (context, url) => _RegionFlagShell(
        size: size,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        showBackground: showBackground,
      ),
      errorWidget: (context, url, error) => fallback,
      imageBuilder: (context, imageProvider) {
        if (!showBackground) {
          return SizedBox(
            width: size,
            height: size,
            child: Image(image: imageProvider, fit: BoxFit.contain),
          );
        }

        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: borderColor),
            image: DecorationImage(image: imageProvider, fit: BoxFit.cover),
          ),
        );
      },
    );
  }

  String? _buildImageUrl(String? value) {
    final trimmed = value?.trim();
    if (trimmed == null || trimmed.isEmpty || trimmed.toLowerCase() == 'null') {
      return null;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return '$imageBaseUrl$trimmed';
  }
}

class _RegionFlagCluster extends StatelessWidget {
  final List<String>? countryCodes;
  final double size;
  final Color backgroundColor;
  final Color borderColor;
  final Color fallbackColor;
  final bool showBackground;
  final bool showFlagDecoration;

  const _RegionFlagCluster({
    required this.countryCodes,
    required this.size,
    required this.backgroundColor,
    required this.borderColor,
    required this.fallbackColor,
    required this.showBackground,
    required this.showFlagDecoration,
  });

  @override
  Widget build(BuildContext context) {
    final codes = _validCountryCodes(countryCodes);

    return _RegionFlagShell(
      size: size,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      showBackground: showBackground,
      child: codes.isEmpty
          ? Center(child: _fallbackIcon())
          : _buildCluster(codes),
    );
  }

  Widget _buildCluster(List<String> codes) {
    if (codes.length == 1) {
      return Center(child: _flagBubble(codes.first, size * 0.62));
    }

    if (codes.length == 2) {
      return Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: size * 0.12,
            top: size * 0.25,
            child: _flagBubble(codes[0], size * 0.48),
          ),
          Positioned(
            right: size * 0.12,
            top: size * 0.25,
            child: _flagBubble(codes[1], size * 0.48),
          ),
        ],
      );
    }

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          left: size * 0.28,
          top: size * 0.08,
          child: _flagBubble(codes[0], size * 0.44),
        ),
        Positioned(
          left: size * 0.13,
          bottom: size * 0.12,
          child: _flagBubble(codes[1], size * 0.44),
        ),
        Positioned(
          right: size * 0.13,
          bottom: size * 0.12,
          child: _flagBubble(codes[2], size * 0.44),
        ),
      ],
    );
  }

  Widget _flagBubble(String countryCode, double bubbleSize) {
    final flag = Center(
      child: buildCountryFlagOrEmoji(
        countryCode: countryCode,
        size: showFlagDecoration ? bubbleSize * 0.72 : bubbleSize,
        fallbackColor: fallbackColor,
      ),
    );

    if (!showFlagDecoration) {
      return SizedBox(width: bubbleSize, height: bubbleSize, child: flag);
    }

    return Container(
      width: bubbleSize,
      height: bubbleSize,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(color: Colors.white, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: flag,
    );
  }

  Widget _fallbackIcon() {
    return Icon(Icons.public, size: size * 0.58, color: fallbackColor);
  }

  List<String> _validCountryCodes(List<String>? values) {
    final seen = <String>{};
    final codes = <String>[];
    for (final value in values ?? const <String>[]) {
      final code = value.trim().toUpperCase();
      final isValid =
          code.length == 2 &&
          code.codeUnits.every((codeUnit) => codeUnit >= 65 && codeUnit <= 90);
      if (isValid && seen.add(code)) {
        codes.add(code);
      }
      if (codes.length == 3) break;
    }
    return codes;
  }
}

class _RegionFlagShell extends StatelessWidget {
  final double size;
  final Color backgroundColor;
  final Color borderColor;
  final bool showBackground;
  final Widget? child;

  const _RegionFlagShell({
    required this.size,
    required this.backgroundColor,
    required this.borderColor,
    required this.showBackground,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (!showBackground) {
      return SizedBox(width: size, height: size, child: child);
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: backgroundColor,
        border: Border.all(color: borderColor),
      ),
      child: child,
    );
  }
}

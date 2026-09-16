import 'package:flutter/material.dart';

class WaveClipper extends CustomClipper<Path> {
  final bool top;
  final bool bottom;

  WaveClipper({this.top = false, this.bottom = false});

  @override
  Path getClip(Size size) {
    final path = Path();
    const double waveHeight = 5.0;
    const double waveWidth = 20.0;

    // --- TOP wave ---
    if (top) {
      path.moveTo(0, waveHeight);
      for (double x = 0; x < size.width; x += waveWidth) {
        path.relativeQuadraticBezierTo(
          waveWidth / 4,
          -waveHeight,
          waveWidth / 2,
          0,
        );
        path.relativeQuadraticBezierTo(
          waveWidth / 4,
          waveHeight,
          waveWidth / 2,
          0,
        );
      }
    } else {
      path.moveTo(0, 0);
      path.lineTo(size.width, 0);
    }

    path.lineTo(size.width, size.height - (bottom ? waveHeight : 0));

    // --- BOTTOM wave ---
    if (bottom) {
      for (double x = size.width; x > 0; x -= waveWidth) {
        path.relativeQuadraticBezierTo(
          -waveWidth / 4,
          waveHeight,
          -waveWidth / 2,
          0,
        );
        path.relativeQuadraticBezierTo(
          -waveWidth / 4,
          -waveHeight,
          -waveWidth / 2,
          0,
        );
      }
    } else {
      path.lineTo(0, size.height);
    }

    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => true;
}

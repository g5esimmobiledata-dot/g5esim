import 'package:flutter/material.dart';

class BottomWaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    var path = Path();
    path.lineTo(0, size.height - 20);
    var controlPoint1 = Offset(size.width / 4, size.height);
    var endPoint1 = Offset(size.width / 2, size.height - 20);
    path.quadraticBezierTo(
      controlPoint1.dx,
      controlPoint1.dy,
      endPoint1.dx,
      endPoint1.dy,
    );

    var controlPoint2 = Offset(size.width * 3 / 4, size.height - 40);
    var endPoint2 = Offset(size.width, size.height - 20);
    path.quadraticBezierTo(
      controlPoint2.dx,
      controlPoint2.dy,
      endPoint2.dx,
      endPoint2.dy,
    );

    // Line to the top-right corner, ensuring the top is straight
    path.lineTo(size.width, 0);

    // Close the path to form a complete shape
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) {
    return false; // Set to true if clipping depends on external factors that change
  }
}

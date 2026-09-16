import 'package:flutter/material.dart';

class WavyBottomPainter extends CustomPainter {
  final Color color;

  const WavyBottomPainter({this.color = const Color(0xFFEDEDED)});

  @override
  void paint(Canvas canvas, Size size) {
    var paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    var path = Path();
    path.moveTo(0, size.height);
    path.lineTo(0, size.height * 0.4);
    var firstControlPoint = Offset(size.width * 0.25, 0);
    var firstEndPoint = Offset(size.width * 0.5, size.height * 0.4);
    path.quadraticBezierTo(
      firstControlPoint.dx,
      firstControlPoint.dy,
      firstEndPoint.dx,
      firstEndPoint.dy,
    );

    var secondControlPoint = Offset(size.width * 0.75, size.height * 0.8);
    var secondEndPoint = Offset(size.width, size.height * 0.4);
    path.quadraticBezierTo(
      secondControlPoint.dx,
      secondControlPoint.dy,
      secondEndPoint.dx,
      secondEndPoint.dy,
    );

    path.lineTo(size.width, size.height);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) {
    return oldDelegate is WavyBottomPainter && oldDelegate.color != color;
  }
}

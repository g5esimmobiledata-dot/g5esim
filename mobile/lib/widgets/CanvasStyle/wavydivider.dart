import 'package:flutter/material.dart';

class WavyDivider extends StatelessWidget {
  final double waveHeight;
  final double waveLength;
  final double strokeWidth;
  final Color color;

  const WavyDivider({
    super.key,
    this.waveHeight = 5.0,
    this.waveLength = 20.0,
    this.strokeWidth = 1.0,
    this.color = Colors.grey,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(double.infinity, 30),
      painter: _WavyLinePainter(
        waveHeight: waveHeight,
        waveLength: waveLength,
        strokeWidth: strokeWidth,
        color: color,
      ),
    );
  }
}

class _WavyLinePainter extends CustomPainter {
  final double waveHeight;
  final double waveLength;
  final double strokeWidth;
  final Color color;

  _WavyLinePainter({
    required this.waveHeight,
    required this.waveLength,
    required this.strokeWidth,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(0, size.height / 2);

    for (double x = 0; x <= size.width; x += waveLength) {
      path.relativeQuadraticBezierTo(
        waveLength / 4,
        -waveHeight,
        waveLength / 2,
        0,
      );
      path.relativeQuadraticBezierTo(
        waveLength / 4,
        waveHeight,
        waveLength / 2,
        0,
      );
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

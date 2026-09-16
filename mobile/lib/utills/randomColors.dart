import 'dart:math';
import 'package:flutter/material.dart';

class RandomColorHelper {
  static final List<Color> _colors = [
    Colors.red.shade800,
    Colors.blue.shade800,
    Colors.green.shade800,
    Colors.orange.shade900,
    Colors.purple.shade800,
    Colors.teal.shade700,
    Colors.pink.shade700,
    Colors.indigo.shade900,
    Colors.brown.shade800,
    Colors.deepPurple.shade800,
  ];

  static final Random _random = Random();
  static Color? _lastColor;

  /// Returns a random color ensuring it's not the same as the last one.
  static Color getRandomColor() {
    if (_colors.length == 1) return _colors.first;

    Color newColor;
    do {
      newColor = _colors[_random.nextInt(_colors.length)];
    } while (newColor == _lastColor);

    _lastColor = newColor;
    return newColor;
  }

  /// Returns a shuffled list of colors for use in lists (no duplicates simultaneously).
  static List<Color> getShuffledColors({int count = 10}) {
    final shuffled = List<Color>.from(_colors)..shuffle();
    // If more colors are needed than available, cycle through
    return List.generate(count, (i) => shuffled[i % shuffled.length]);
  }
}

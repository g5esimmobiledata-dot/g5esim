import 'dart:js_interop';

import 'package:web/web.dart' as web;

class WebDtmfTonePlayer {
  static web.AudioContext? _context;
  static final List<web.OscillatorNode> _activeOscillators =
      <web.OscillatorNode>[];

  static Future<bool> play(String digit) async {
    final frequencies =
        _frequencies[_normalizeDigit(digit)] ??
        _previewFrequencies[_normalizePreviewDigit(digit)];
    if (frequencies == null) return false;

    final context = _context ??= web.AudioContext();
    if (context.state == 'suspended') {
      await context.resume().toDart;
    }

    final now = context.currentTime;
    _stopActive(now);

    final low = context.createOscillator();
    final high = context.createOscillator();
    final gain = context.createGain();
    final gainParam = gain.gain;

    low.type = 'sine';
    high.type = 'sine';
    low.frequency.setValueAtTime(frequencies[0], now);
    high.frequency.setValueAtTime(frequencies[1], now);

    gainParam.setValueAtTime(0.0001, now);
    gainParam.exponentialRampToValueAtTime(0.20, now + 0.012);
    gainParam.setValueAtTime(0.20, now + 0.15);
    gainParam.exponentialRampToValueAtTime(0.0001, now + 0.18);

    low.connect(gain);
    high.connect(gain);
    gain.connect(context.destination);

    low.start(now);
    high.start(now);
    low.stop(now + 0.18);
    high.stop(now + 0.18);

    _activeOscillators
      ..add(low)
      ..add(high);

    return true;
  }

  static void _stopActive(num when) {
    for (final oscillator in _activeOscillators) {
      try {
        oscillator.stop(when);
      } catch (_) {}
      try {
        oscillator.disconnect();
      } catch (_) {}
    }
    _activeOscillators.clear();
  }

  static String? _normalizeDigit(String digit) {
    final value = digit.trim();
    if (value.length != 1) return null;
    if (RegExp(r'^[0-9*#A-Da-d]$').hasMatch(value)) {
      return value.toUpperCase();
    }
    return null;
  }

  static String? _normalizePreviewDigit(String digit) {
    final value = digit.trim();
    if (value.length != 1) return null;
    if (RegExp(r'^[+]$').hasMatch(value)) return value;
    return null;
  }

  static const Map<String, List<double>> _previewFrequencies =
      <String, List<double>>{
        '+': <double>[880.0, 1175.0],
      };

  static const Map<String, List<double>> _frequencies = <String, List<double>>{
    '1': <double>[697.0, 1209.0],
    '2': <double>[697.0, 1336.0],
    '3': <double>[697.0, 1477.0],
    'A': <double>[697.0, 1633.0],
    '4': <double>[770.0, 1209.0],
    '5': <double>[770.0, 1336.0],
    '6': <double>[770.0, 1477.0],
    'B': <double>[770.0, 1633.0],
    '7': <double>[852.0, 1209.0],
    '8': <double>[852.0, 1336.0],
    '9': <double>[852.0, 1477.0],
    'C': <double>[852.0, 1633.0],
    '*': <double>[941.0, 1209.0],
    '0': <double>[941.0, 1336.0],
    '#': <double>[941.0, 1477.0],
    'D': <double>[941.0, 1633.0],
  };
}

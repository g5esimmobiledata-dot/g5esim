// theme_event.dart
import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

abstract class ThemeEvent extends Equatable {
  const ThemeEvent();

  @override
  List<Object> get props => [];
}

class LoadTheme extends ThemeEvent {
  const LoadTheme();
}

class ChangePrimaryColor extends ThemeEvent {
  final Color primaryColor;
  const ChangePrimaryColor(this.primaryColor);

  @override
  List<Object> get props => [primaryColor];
}

class ChangeSecondaryColor extends ThemeEvent {
  final int pickIntColor;
  const ChangeSecondaryColor(this.pickIntColor);

  @override
  List<Object> get props => [pickIntColor];
}

class ChangeThemeMode extends ThemeEvent {
  final bool isDarkTheme;
  const ChangeThemeMode(this.isDarkTheme);

  @override
  List<Object> get props => [isDarkTheme];
}

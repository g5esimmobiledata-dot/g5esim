import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:esimconnect/theme/bloc/theme_event.dart';
import 'package:esimconnect/theme/bloc/theme_state.dart';

class ThemeBloc extends Bloc<ThemeEvent, ThemeState> {
  static const int _oldGreenPrimary = 0xff34E3CF;
  static const int _defaultBluePrimary = 0xff4AA8FF;

  ThemeBloc() : super(ThemeState.initial()) {
    on<LoadTheme>(_onLoadTheme);
    on<ChangePrimaryColor>(_onChangePrimaryColor);
    on<ChangeSecondaryColor>(_onChangeSecondaryColor);
    on<ChangeThemeMode>(_onChangeThemeMode);
    add(const LoadTheme());
  }

  Future<void> _onLoadTheme(LoadTheme event, Emitter<ThemeState> emit) async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    int? primaryColorValue = sp.getInt('primaryColor');
    int? secondaryColorValue = sp.getInt('secondaryColor');
    final bool isDarkTheme = sp.getBool('isDarkTheme') ?? true;

    if (primaryColorValue == _oldGreenPrimary) {
      primaryColorValue = _defaultBluePrimary;
      await sp.setInt('primaryColor', _defaultBluePrimary);
    }
    if (secondaryColorValue == _oldGreenPrimary) {
      secondaryColorValue = _defaultBluePrimary;
      await sp.setInt('secondaryColor', _defaultBluePrimary);
    }

    Color primaryColor = primaryColorValue != null
        ? Color(primaryColorValue)
        : const Color(_defaultBluePrimary);
    int pickIntColor = secondaryColorValue ?? _defaultBluePrimary;

    emit(
      state.copyWith(
        isDarkTheme: isDarkTheme,
        primaryColor: primaryColor,
        pickIntColor: pickIntColor,
      ),
    );
  }

  Future<void> _onChangePrimaryColor(
    ChangePrimaryColor event,
    Emitter<ThemeState> emit,
  ) async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    sp.setInt('primaryColor', event.primaryColor.value);

    emit(state.copyWith(primaryColor: event.primaryColor));
  }

  Future<void> _onChangeSecondaryColor(
    ChangeSecondaryColor event,
    Emitter<ThemeState> emit,
  ) async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    sp.setInt('secondaryColor', event.pickIntColor);

    emit(state.copyWith(pickIntColor: event.pickIntColor));
  }

  Future<void> _onChangeThemeMode(
    ChangeThemeMode event,
    Emitter<ThemeState> emit,
  ) async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    await sp.setBool('isDarkTheme', event.isDarkTheme);

    emit(state.copyWith(isDarkTheme: event.isDarkTheme));
  }
}

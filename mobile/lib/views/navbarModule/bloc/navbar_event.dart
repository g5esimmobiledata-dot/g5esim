// bottom_navigation_event.dart

import 'package:equatable/equatable.dart';

abstract class BottomNavigationEvent extends Equatable {
  const BottomNavigationEvent();
  @override
  List<Object> get props => [];
}

class ChangeBottomNavIndex extends BottomNavigationEvent {
  final int newIndex;
  const ChangeBottomNavIndex(this.newIndex);
  @override
  List<Object> get props => [newIndex];
}

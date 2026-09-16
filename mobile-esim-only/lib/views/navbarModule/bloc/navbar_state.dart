import 'package:equatable/equatable.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';

class BottomNavigationState extends Equatable {
  final int bottomNavIndex;
  final PersistentTabController persistantController;

  const BottomNavigationState({
    required this.bottomNavIndex,
    required this.persistantController,
  });
  // Add this copyWith method
  BottomNavigationState copyWith({
    int? bottomNavIndex,
    PersistentTabController? persistantController,
  }) {
    return BottomNavigationState(
      bottomNavIndex: bottomNavIndex ?? this.bottomNavIndex,
      persistantController: persistantController ?? this.persistantController,
    );
  }

  @override
  List<Object> get props => [bottomNavIndex]; // Still only compare index
}

import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

// Events
abstract class ConnectivityEvent {}

class ConnectivityChanged extends ConnectivityEvent {
  final List<ConnectivityResult> results;
  ConnectivityChanged(this.results);
}

abstract class ConnectivityState {}

class Connected extends ConnectivityState {}

class Disconnected extends ConnectivityState {}

class ConnectivityBloc extends Bloc<ConnectivityEvent, ConnectivityState> {
  final Connectivity _connectivity = Connectivity();
  late StreamSubscription _subscription;

  ConnectivityBloc() : super(Connected()) {
    on<ConnectivityChanged>((event, emit) {
      final isDisconnected =
          event.results.isEmpty ||
          event.results.every((result) => result == ConnectivityResult.none);

      if (isDisconnected) {
        emit(Disconnected());
      } else {
        emit(Connected());
      }
    });
    _checkInitialConnectivity();
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      add(ConnectivityChanged(results));
    });
  }

  Future<void> _checkInitialConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    add(ConnectivityChanged(results));
  }

  @override
  Future<void> close() {
    _subscription.cancel();
    return super.close();
  }
}

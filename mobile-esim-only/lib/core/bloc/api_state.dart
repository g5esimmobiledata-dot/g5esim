import 'package:equatable/equatable.dart';

abstract class ApiState<T> extends Equatable {
  final T? data;
  final String? error;

  const ApiState({this.data, this.error});

  @override
  List<Object?> get props => [data, error];
}

class ApiInitial<T> extends ApiState<T> {
  const ApiInitial() : super();
}

class ApiLoading<T> extends ApiState<T> {
  const ApiLoading() : super();
}

class ApiSuccess<T> extends ApiState<T> {
  final T value;
  const ApiSuccess(this.value) : super(data: value);

  @override
  T get data => value;

  @override
  List<Object?> get props => [data];
}

class ApiFailure<T> extends ApiState<T> {
  final String message;

  const ApiFailure(this.message) : super(error: message);

  @override
  String? get error => message;

  @override
  List<Object?> get props => [error];
}

import 'package:bloc_test/bloc_test.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/api_end_points.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:esimconnect/views/authModule/login_bloc/LoginUser.dart';
import 'package:esimconnect/views/authModule/login_bloc/loginbloc.dart';
import 'package:esimconnect/views/authModule/model/usermodel.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';

class MockApiService extends Mock implements ApiService {}

class FakeLoginUser extends Fake implements LoginUser {}

void main() {
  late LoginBloc loginBloc;
  late MockApiService mockApiService;

  setUpAll(() {
    registerFallbackValue(FakeLoginUser());
  });

  setUp(() {
    mockApiService = MockApiService();
    loginBloc = LoginBloc(mockApiService);
  });

  tearDown(() {
    loginBloc.close();
  });

  final testEmail = 'test@example.com';
  final mockSuccessResponse = {
    'success': true,
    'message': 'Login successful',
    'data': {'email': testEmail, 'is_password_set': true},
  };

  group('LoginBloc Tests', () {
    test('initial state is ApiInitial', () {
      expect(loginBloc.state, isA<ApiInitial>());
    });

    blocTest<LoginBloc, ApiState<LoginModel>>(
      'emits [ApiLoading, ApiSuccess] when executeApiCall succeeds',
      build: () {
        when(
          () => mockApiService.post(
            ApiEndPoints.LOGIN,
            data: {'email': testEmail},
          ),
        ).thenAnswer((_) async => mockSuccessResponse);
        return loginBloc;
      },
      act: (bloc) => bloc.add(LoginUser(testEmail)),
      expect: () => [
        isA<ApiLoading<LoginModel>>(),
        isA<ApiSuccess<LoginModel>>()
            .having((state) => state.data.success, 'success', true)
            .having((state) => state.data.data?.email, 'email', testEmail),
      ],
      verify: (_) {
        verify(
          () => mockApiService.post(
            ApiEndPoints.LOGIN,
            data: {'email': testEmail},
          ),
        ).called(1);
      },
    );

    blocTest<LoginBloc, ApiState<LoginModel>>(
      'emits [ApiLoading, ApiFailure] when executeApiCall fails',
      build: () {
        when(
          () => mockApiService.post(
            ApiEndPoints.LOGIN,
            data: {'email': testEmail},
          ),
        ).thenThrow(Exception('Network Error'));
        return loginBloc;
      },
      act: (bloc) => bloc.add(LoginUser(testEmail)),
      expect: () => [
        isA<ApiLoading<LoginModel>>(),
        isA<ApiFailure<LoginModel>>().having(
          (state) => state.error,
          'error',
          'Unknown error occurred',
        ),
      ],
      verify: (_) {
        verify(
          () => mockApiService.post(
            ApiEndPoints.LOGIN,
            data: {'email': testEmail},
          ),
        ).called(1);
      },
    );

    blocTest<LoginBloc, ApiState<LoginModel>>(
      'emits [ApiLoading, ApiFailure] with Dio message when executeApiCall throws DioException',
      build: () {
        final dioError = DioException(
          requestOptions: RequestOptions(path: ApiEndPoints.LOGIN),
          message: 'Server Timeout',
        );
        when(
          () => mockApiService.post(
            ApiEndPoints.LOGIN,
            data: {'email': testEmail},
          ),
        ).thenThrow(dioError);
        return loginBloc;
      },
      act: (bloc) => bloc.add(LoginUser(testEmail)),
      expect: () => [
        isA<ApiLoading<LoginModel>>(),
        isA<ApiFailure<LoginModel>>().having(
          (state) => state.error,
          'error',
          'Server Timeout',
        ),
      ],
      verify: (_) {
        verify(
          () => mockApiService.post(
            ApiEndPoints.LOGIN,
            data: {'email': testEmail},
          ),
        ).called(1);
      },
    );
  });
}

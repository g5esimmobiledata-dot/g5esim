import 'package:dio/dio.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

class MockResponse<T> extends Mock implements Response<T> {}

void main() {
  late ApiService apiService;
  late MockDio mockDio;

  setUp(() {
    mockDio = MockDio();
    when(() => mockDio.interceptors).thenReturn(Interceptors());
    apiService = ApiService(dio: mockDio);
  });

  group('ApiService Tests', () {
    test('POST request returns data successfully', () async {
      final mockResponseData = {'success': true, 'data': 'mocked_data'};
      final mockResponse = MockResponse();

      when(() => mockResponse.data).thenReturn(mockResponseData);
      when(() => mockResponse.statusCode).thenReturn(200);

      when(
        () => mockDio.post(
          any(),
          data: any(named: 'data'),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
          cancelToken: any(named: 'cancelToken'),
          onSendProgress: any(named: 'onSendProgress'),
          onReceiveProgress: any(named: 'onReceiveProgress'),
        ),
      ).thenAnswer((_) async => mockResponse);

      final result = await apiService.post(
        '/test-endpoint',
        data: {'key': 'value'},
      );

      expect(result, mockResponseData);
      verify(
        () => mockDio.post('/test-endpoint', data: {'key': 'value'}),
      ).called(1);
    });

    test('GET request returns data successfully', () async {
      final mockResponseData = {'success': true, 'items': []};
      final mockResponse = MockResponse();

      when(() => mockResponse.data).thenReturn(mockResponseData);
      when(() => mockResponse.statusCode).thenReturn(200);

      when(
        () => mockDio.get(
          any(),
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
          cancelToken: any(named: 'cancelToken'),
          onReceiveProgress: any(named: 'onReceiveProgress'),
        ),
      ).thenAnswer((_) async => mockResponse);

      final result = await apiService.get('/test-get', query: {'page': 1});

      expect(result, mockResponseData);
      verify(
        () => mockDio.get(
          '/test-get',
          data: null,
          queryParameters: {'page': 1},
          options: any(named: 'options'),
          cancelToken: any(named: 'cancelToken'),
          onReceiveProgress: any(named: 'onReceiveProgress'),
        ),
      ).called(1);
    });
  });
}

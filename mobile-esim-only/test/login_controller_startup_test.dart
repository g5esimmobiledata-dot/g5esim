import 'package:esimconnect/views/authModule/auth_controller/LoginController.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('login controller can be created before Firebase initializes', () {
    expect(Firebase.apps, isEmpty);
    final controller = LoginController();
    expect(controller.status, 'Idle');
    controller.emailController.dispose();
    controller.pswdController.dispose();
    controller.femailfocusnode.dispose();
    controller.pswdfocusnode.dispose();
  });
}

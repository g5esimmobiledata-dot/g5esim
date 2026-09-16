import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> setupLocalNotifications() async {}

Future<void> startVoiceNotificationListeners() async {}

bool isIncomingCallNotificationData(Map<String, dynamic> data) {
  final type = data['type']?.toString();
  return type == 'vonage_voice_call' || type == 'incoming_call';
}

class NotificationUtils {
  Future<void> showNotification(RemoteMessage message) async {}

  Future<void> requestPermissions() async {}
}

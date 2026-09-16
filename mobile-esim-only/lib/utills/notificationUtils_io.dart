import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:get/get.dart';

import '../views/navbarModule/bloc/navbar_bloc.dart';
import '../views/profileMoulde/userProfileModule/supportmodule/views/SupportChatScreen.dart';

final localNotifications = FlutterLocalNotificationsPlugin();
final Map<String, int> _notificationCounts = {};

bool isAdminPushNotificationData(Map<String, dynamic> data) {
  return data['type']?.toString() == 'admin_push' ||
      data['source']?.toString() == 'push_campaign';
}

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse details) {
  _handleNotificationResponse(details);
}

Future<void> setupLocalNotifications() async {
  const android = AndroidInitializationSettings('@mipmap/ic_launcher');
  const ios = DarwinInitializationSettings(
    requestAlertPermission: true,
    requestBadgePermission: true,
    requestSoundPermission: true,
  );

  await localNotifications.initialize(
    settings: const InitializationSettings(android: android, iOS: ios),
    onDidReceiveNotificationResponse: _handleNotificationResponse,
    onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
  );

  final androidPlugin = localNotifications
      .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin
      >();

  if (androidPlugin != null) {
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        'g5_push_channel',
        'G5 Push Notifications',
        description: 'Mobile app push notifications from G5eSIM',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        audioAttributesUsage: AudioAttributesUsage.notification,
      ),
    );
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        'default_channel',
        'General Notifications',
        description: 'General app notifications',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      ),
    );
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        'support_channel',
        'Support Notifications',
        description: 'Support ticket replies',
        importance: Importance.high,
      ),
    );
    await androidPlugin.requestNotificationsPermission();
  }
}

void _handleNotificationResponse(NotificationResponse details) {
  if (details.payload == null) return;
  _handleNotificationTap(details.payload!);
}

void _handleNotificationTap(String payload) {
  try {
    final data = json.decode(payload) as Map<String, dynamic>;
    final type = data['type'];

    if (type == 'ticket_reply') {
      final ticketId = data['ticketId'];
      Get.to(
        () => SupportChatScreen(ticketId: ticketId, istileRequired: false),
      );
    } else if (type == '9') {
      Get.find<BottomNavController>().navigateToTab(3);
    }
  } catch (e) {
    log('Error handling notification tap: $e');
  }
}

class NotificationUtils {
  Future<void> showNotification(RemoteMessage message) async {
    try {
      final type = message.data['type'];

      if (type == 'ticket_reply') {
        await _showGroupedNotification(message);
      } else if (isAdminPushNotificationData(message.data)) {
        await _showAdminPushNotification(message);
      } else {
        await _showRegularNotification(message);
      }
    } catch (e) {
      log('Notification error: $e');
    }
  }

  Future<void> _showAdminPushNotification(RemoteMessage message) async {
    final payloadData = Map<String, dynamic>.from(message.data);
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    const androidDetails = AndroidNotificationDetails(
      'g5_push_channel',
      'G5 Push Notifications',
      channelDescription: 'Mobile app push notifications from G5eSIM',
      importance: Importance.max,
      priority: Priority.max,
      category: AndroidNotificationCategory.message,
      visibility: NotificationVisibility.public,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      threadIdentifier: 'g5_push',
    );

    await localNotifications.show(
      id: notificationId,
      title:
          message.notification?.title ??
          payloadData['title']?.toString() ??
          'G5eSIM',
      body: message.notification?.body ?? payloadData['body']?.toString() ?? '',
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      payload: json.encode(payloadData),
    );
  }

  Future<void> _showGroupedNotification(RemoteMessage message) async {
    final ticketId = message.data['ticketId'] ?? 'support';
    final groupKey = 'support_tickets';
    final notificationId = ticketId.hashCode.abs() % 100000;

    _notificationCounts[groupKey] = (_notificationCounts[groupKey] ?? 0) + 1;
    final count = _notificationCounts[groupKey]!;
    final androidDetails = _buildAndroidDetails(groupKey, count);

    const iosDetails = DarwinNotificationDetails(
      threadIdentifier: 'support_tickets',
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    await localNotifications.show(
      id: notificationId,
      title: message.notification?.title ?? 'Support',
      body: message.notification?.body ?? '',
      notificationDetails: NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      payload: json.encode(message.data),
    );

    if (Platform.isAndroid && count > 1) {
      await _showGroupSummary(groupKey, count, message);
    }
  }

  Future<void> _showRegularNotification(RemoteMessage message) async {
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final androidDetails = _buildAndroidDetails(null, null);
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    await localNotifications.show(
      id: notificationId,
      title: message.notification?.title ?? message.data['title'] ?? 'G5eSIM',
      body: message.notification?.body ?? message.data['body'] ?? '',
      notificationDetails: NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      ),
      payload: json.encode(message.data),
    );
  }

  AndroidNotificationDetails _buildAndroidDetails(
    String? groupKey,
    int? count,
  ) {
    return AndroidNotificationDetails(
      groupKey == null ? 'default_channel' : 'support_channel',
      groupKey == null ? 'General Notifications' : 'Support Notifications',
      channelDescription: groupKey == null
          ? 'General app notifications'
          : 'Support ticket replies',
      importance: Importance.high,
      priority: Priority.high,
      groupKey: groupKey,
      setAsGroupSummary: false,
      number: count,
      icon: '@mipmap/ic_launcher',
    );
  }

  Future<void> _showGroupSummary(
    String groupKey,
    int count,
    RemoteMessage latestMessage,
  ) async {
    const summaryId = 100000;
    await localNotifications.show(
      id: summaryId,
      title: 'Support',
      body: '$count new support messages',
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          'support_channel',
          'Support Notifications',
          channelDescription: 'Support ticket replies',
          importance: Importance.high,
          priority: Priority.high,
          groupKey: groupKey,
          setAsGroupSummary: true,
          icon: '@mipmap/ic_launcher',
        ),
      ),
      payload: json.encode(latestMessage.data),
    );
  }

  Future<void> requestPermissions() async {
    final androidPlugin = localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidPlugin?.requestNotificationsPermission();

    final iosPlugin = localNotifications
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    await iosPlugin?.requestPermissions(alert: true, badge: true, sound: true);
  }
}

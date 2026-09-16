import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'dart:io';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get/get.dart';
import '../views/navbarModule/bloc/navbar_bloc.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import '../views/profileMoulde/userProfileModule/supportmodule/views/SupportChatScreen.dart';
import '../views/profileMoulde/userProfileModule/virtualNumberModule/views/IncomingCallScreen.dart';
import '../views/premiumModule/views/premium_chat_screen.dart';
import 'services/VoiceBridgeService.dart';

final localNotifications = FlutterLocalNotificationsPlugin();
final Map<String, int> _notificationCounts = {};
StreamSubscription<Map<String, dynamic>>? _voiceEventSubscription;

bool isIncomingCallNotificationData(Map<String, dynamic> data) {
  final type = data['type']?.toString();
  if (type == 'vonage_voice_call' || type == 'incoming_call') return true;
  return _looksLikeVonageVoicePayload(data);
}

bool isPremiumChatCallNotificationData(Map<String, dynamic> data) {
  return data['type']?.toString() == 'premium_chat_call';
}

bool isPremiumChatMessageNotificationData(Map<String, dynamic> data) {
  return data['type']?.toString() == 'premium_chat_message';
}

bool isAdminPushNotificationData(Map<String, dynamic> data) {
  return data['type']?.toString() == 'admin_push' ||
      data['source']?.toString() == 'push_campaign';
}

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse details) {
  _handleNotificationResponse(details);
}

Future<void> setupLocalNotifications() async {
  final incomingCallCategory = DarwinNotificationCategory(
    'incoming_call',
    actions: <DarwinNotificationAction>[
      DarwinNotificationAction.plain('accept_call', 'Accept'),
      DarwinNotificationAction.plain('decline_call', 'Decline'),
    ],
  );
  final premiumChatCallCategory = DarwinNotificationCategory(
    'premium_chat_call',
    actions: <DarwinNotificationAction>[
      DarwinNotificationAction.plain('open_chat', 'Open Chat'),
      DarwinNotificationAction.plain('decline_call', 'Dismiss'),
    ],
  );

  const android = AndroidInitializationSettings('@mipmap/ic_launcher');
  final ios = DarwinInitializationSettings(
    requestAlertPermission: true,
    requestBadgePermission: true,
    requestSoundPermission: true,
    notificationCategories: <DarwinNotificationCategory>[
      incomingCallCategory,
      premiumChatCallCategory,
    ],
  );

  await localNotifications.initialize(
    settings: InitializationSettings(android: android, iOS: ios),
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
        'vonage_call_channel',
        'eRoaming Calls',
        description: 'Incoming eRoaming and VoIP calls',
        importance: Importance.max,
        audioAttributesUsage: AudioAttributesUsage.notificationRingtone,
      ),
    );
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
    await androidPlugin.createNotificationChannel(
      const AndroidNotificationChannel(
        'chat_call_channel',
        'Premium Chat Calls',
        description: 'Incoming Premium Chat call notifications',
        importance: Importance.max,
        audioAttributesUsage: AudioAttributesUsage.notificationRingtone,
      ),
    );
    await androidPlugin.requestNotificationsPermission();
    await androidPlugin.requestFullScreenIntentPermission();
  }
}

Future<void> startVoiceNotificationListeners() async {
  VoiceBridgeService.startListeningForNativeEvents();
  _voiceEventSubscription ??= VoiceBridgeService.nativeEvents.listen((
    Map<String, dynamic> event,
  ) {
    final eventName = event['event']?.toString() ?? '';
    if (eventName == 'incomingCallInvite') {
      final payload = Map<String, dynamic>.from(event);
      payload.putIfAbsent('type', () => 'incoming_call');
      unawaited(NotificationUtils().showIncomingCallData(payload));
    }
  });
}

void _openIncomingCallScreen(Map<String, dynamic> data, {String? actionId}) {
  Get.to(() => IncomingCallScreen(callData: data, initialAction: actionId));
}

void _handleNotificationResponse(NotificationResponse details) {
  if (details.payload == null) return;
  _handleNotificationTap(details.payload!, actionId: details.actionId);
}

void _handleNotificationTap(String payload, {String? actionId}) {
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
    } else if (isPremiumChatCallNotificationData(data) ||
        isPremiumChatMessageNotificationData(data)) {
      if (actionId == 'decline_call') return;
      Get.to(
        () => PremiumChatScreen(
          initialConversationId: data['conversationId']?.toString(),
          pendingCall: isPremiumChatCallNotificationData(data)
              ? Map<String, dynamic>.from(data)
              : null,
        ),
      );
    } else if (isIncomingCallNotificationData(data)) {
      _openIncomingCallScreen(data, actionId: actionId);
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
      } else if (isPremiumChatCallNotificationData(message.data)) {
        await _showPremiumChatCallNotification(message);
      } else if (isPremiumChatMessageNotificationData(message.data)) {
        await _showPremiumChatMessageNotification(message);
      } else if (isAdminPushNotificationData(message.data)) {
        await _showAdminPushNotification(message);
      } else if (await _isIncomingCallMessage(message)) {
        await _showIncomingCallNotification(message);
      } else {
        await _showRegularNotification(message);
      }
    } catch (e) {
      log('Notification error: $e');
    }
  }

  Future<void> _showIncomingCallNotification(RemoteMessage message) async {
    final payloadData = Map<String, dynamic>.from(message.data);
    final preparedPayload = await _prepareIncomingCallPayload(payloadData);
    preparedPayload.putIfAbsent(
      'rawPushPayload',
      () => json.encode(message.data),
    );
    await showIncomingCallData(
      preparedPayload,
      fallbackTitle: message.notification?.title,
      fallbackBody: message.notification?.body,
    );
  }

  Future<void> _showPremiumChatCallNotification(RemoteMessage message) async {
    final payloadData = Map<String, dynamic>.from(message.data);
    final callerName =
        (payloadData['fromName'] ??
                payloadData['callerName'] ??
                message.notification?.title ??
                'Premium Chat Call')
            .toString();
    final body =
        message.notification?.body ?? '$callerName is calling you in Chat.';
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    const androidDetails = AndroidNotificationDetails(
      'chat_call_channel',
      'Premium Chat Calls',
      channelDescription: 'Incoming Premium Chat call notifications',
      importance: Importance.max,
      priority: Priority.max,
      category: AndroidNotificationCategory.call,
      fullScreenIntent: true,
      visibility: NotificationVisibility.public,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
      actions: <AndroidNotificationAction>[
        AndroidNotificationAction(
          'open_chat',
          'Open Chat',
          showsUserInterface: true,
          cancelNotification: true,
        ),
        AndroidNotificationAction(
          'decline_call',
          'Dismiss',
          cancelNotification: true,
        ),
      ],
    );

    const iOSDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      categoryIdentifier: 'premium_chat_call',
    );

    await localNotifications.show(
      id: notificationId,
      title: callerName,
      body: body,
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: iOSDetails,
      ),
      payload: json.encode(payloadData),
    );
  }

  Future<void> _showPremiumChatMessageNotification(
    RemoteMessage message,
  ) async {
    final payloadData = Map<String, dynamic>.from(message.data);
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    await localNotifications.show(
      id: notificationId,
      title:
          message.notification?.title ??
          payloadData['fromName']?.toString() ??
          'Premium Chat',
      body: message.notification?.body ?? 'New chat message',
      notificationDetails: NotificationDetails(
        android: _buildAndroidDetails(null, null),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
          threadIdentifier: 'premium_chat',
        ),
      ),
      payload: json.encode(payloadData),
    );
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

    const iOSDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      threadIdentifier: 'g5_push',
    );

    await localNotifications.show(
      id: notificationId,
      title: message.notification?.title ?? payloadData['title']?.toString() ?? 'G5eSIM',
      body: message.notification?.body ?? payloadData['body']?.toString() ?? '',
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: iOSDetails,
      ),
      payload: json.encode(payloadData),
    );
  }

  Future<void> showIncomingCallData(
    Map<String, dynamic> data, {
    String? fallbackTitle,
    String? fallbackBody,
  }) async {
    final payloadData = await _prepareIncomingCallPayload(data);
    payloadData.putIfAbsent('type', () => 'incoming_call');
    payloadData.putIfAbsent(
      'rawVonagePayload',
      () => _toNativeMapString(payloadData),
    );
    final callerName =
        (payloadData['callerName'] ??
                payloadData['from'] ??
                payloadData['from_user'] ??
                payloadData['caller'] ??
                fallbackTitle ??
                'Incoming call')
            .toString();
    final callBody =
        (payloadData['body'] ?? fallbackBody ?? 'Incoming eRoaming call.')
            .toString();
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    const androidDetails = AndroidNotificationDetails(
      'vonage_call_channel',
      'eRoaming Calls',
      channelDescription: 'Incoming eRoaming Number calls',
      importance: Importance.max,
      priority: Priority.max,
      category: AndroidNotificationCategory.call,
      fullScreenIntent: true,
      visibility: NotificationVisibility.public,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
      ongoing: true,
      autoCancel: false,
      actions: <AndroidNotificationAction>[
        AndroidNotificationAction(
          'accept_call',
          'Accept',
          showsUserInterface: true,
          cancelNotification: true,
        ),
        AndroidNotificationAction(
          'decline_call',
          'Decline',
          cancelNotification: true,
        ),
      ],
    );

    const iOSDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      categoryIdentifier: 'incoming_call',
    );

    await localNotifications.show(
      id: notificationId,
      title: callerName,
      body: callBody,
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: iOSDetails,
      ),
      payload: json.encode(payloadData),
    );
  }

  Future<Map<String, dynamic>> _prepareIncomingCallPayload(
    Map<String, dynamic> data,
  ) async {
    final payload = Map<String, dynamic>.from(data);
    if (_hasCallId(payload)) return payload;

    try {
      final processed = await VoiceBridgeService().processIncomingPush(payload);
      for (final entry in processed.entries) {
        payload.putIfAbsent(entry.key, () => entry.value);
      }
    } catch (_) {
      // The native voice engine may not have a warm session yet. The user can
      // still open the incoming-call screen, which retries processing the push.
    }
    return payload;
  }

  bool _hasCallId(Map<String, dynamic> data) {
    const keys = <String>[
      'callId',
      'call_id',
      'callID',
      'id',
      'uuid',
      'callUuid',
      'call_uuid',
    ];
    return keys.any((key) => data[key]?.toString().trim().isNotEmpty == true);
  }

  Future<void> _showGroupedNotification(RemoteMessage message) async {
    final ticketId = message.data['ticketId'] ?? 'support';
    final groupKey = 'support_tickets';
    final notificationId = ticketId.hashCode.abs() % 100000;

    _notificationCounts[groupKey] = (_notificationCounts[groupKey] ?? 0) + 1;
    final count = _notificationCounts[groupKey]!;
    final androidDetails = _buildAndroidDetails(groupKey, count);

    const iOSDetails = DarwinNotificationDetails(
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
        iOS: iOSDetails,
      ),
      payload: json.encode(message.data),
    );

    if (Platform.isAndroid && count > 1) {
      await _showGroupSummary(groupKey, count, message);
    }
  }

  Future<void> _showRegularNotification(RemoteMessage message) async {
    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final imageUrl = _getImageUrl(message);

    AndroidNotificationDetails androidDetails;
    if (imageUrl != null) {
      final imagePath = await _downloadImage(imageUrl);
      if (imagePath.isNotEmpty) {
        androidDetails = AndroidNotificationDetails(
          'default_channel',
          'General Notifications',
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          styleInformation: BigPictureStyleInformation(
            FilePathAndroidBitmap(imagePath),
            contentTitle: message.notification?.title,
            summaryText: message.notification?.body,
          ),
        );
      } else {
        androidDetails = _buildAndroidDetails(null, null);
      }
    } else {
      androidDetails = _buildAndroidDetails(null, null);
    }

    DarwinNotificationDetails? iOSDetails;
    if (imageUrl != null) {
      final imagePath = await _downloadImage(imageUrl);
      if (imagePath.isNotEmpty) {
        iOSDetails = DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
          attachments: [
            DarwinNotificationAttachment(imagePath, identifier: 'image'),
          ],
        );
      }
    }

    iOSDetails ??= const DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    await localNotifications.show(
      id: notificationId,
      title: message.notification?.title ?? 'Notification',
      body: message.notification?.body ?? '',
      notificationDetails: NotificationDetails(
        android: androidDetails,
        iOS: iOSDetails,
      ),
      payload: json.encode(message.data),
    );
  }

  Future<void> _showGroupSummary(
    String groupKey,
    int count,
    RemoteMessage message,
  ) async {
    const androidDetails = AndroidNotificationDetails(
      'support_summary',
      'Support Summary',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      groupKey: 'support_tickets',
      setAsGroupSummary: true,
    );

    await localNotifications.show(
      id: 9999,
      title: 'Support Messages',
      body: '$count new messages',
      notificationDetails: const NotificationDetails(android: androidDetails),
      payload: json.encode(message.data),
    );
  }

  AndroidNotificationDetails _buildAndroidDetails(
    String? groupKey,
    int? count,
  ) {
    return AndroidNotificationDetails(
      groupKey != null ? 'support_channel' : 'default_channel',
      groupKey != null ? 'Support Notifications' : 'General Notifications',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
      groupKey: groupKey,
      number: count,
    );
  }

  String? _getImageUrl(RemoteMessage message) {
    if (Platform.isAndroid) {
      return message.data['image'] ?? message.notification?.android?.imageUrl;
    } else if (Platform.isIOS) {
      return message.data['image'] ?? message.notification?.apple?.imageUrl;
    }
    return message.data['image'];
  }

  Future<String> _downloadImage(String url) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final extension = url.split('.').last.split('?').first;
      final filePath =
          '${directory.path}/notif_${DateTime.now().millisecondsSinceEpoch}.$extension';

      final response = await Dio().get<List<int>>(
        url,
        options: Options(responseType: ResponseType.bytes),
      );

      final file = File(filePath);
      await file.writeAsBytes(response.data!);
      return filePath;
    } catch (_) {
      return '';
    }
  }

  Future<bool> _isIncomingCallMessage(RemoteMessage message) async {
    final data = Map<String, dynamic>.from(message.data);
    if (isIncomingCallNotificationData(data)) return true;
    return VoiceBridgeService().isIncomingVoicePush(data);
  }

  void clearGroupCount(String groupKey) {
    _notificationCounts.remove(groupKey);
  }

  Future<void> requestPermissions() async {
    if (Platform.isIOS) {
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    }
  }
}

bool _looksLikeVonageVoicePayload(Map<String, dynamic> data) {
  final keys = data.keys.map((key) => key.toLowerCase()).toSet();
  final joined = data.entries
      .map((entry) => '${entry.key}:${entry.value}')
      .join('|')
      .toLowerCase();

  if ((joined.contains('vonage') || joined.contains('nexmo')) &&
      (joined.contains('call') ||
          joined.contains('invite') ||
          joined.contains('rtc'))) {
    return true;
  }
  if (keys.contains('conversation_uuid') &&
      (keys.contains('uuid') ||
          keys.contains('call_id') ||
          keys.contains('from_user'))) {
    return true;
  }
  if (keys.any(
        (key) =>
            key.startsWith('nxm') ||
            key.startsWith('nexmo') ||
            key.startsWith('vonage'),
      ) &&
      (joined.contains('call') || joined.contains('invite'))) {
    return true;
  }
  return false;
}

String _toNativeMapString(Map<String, dynamic> data) {
  const ignoredKeys = <String>{
    'type',
    'initialAction',
    'rawVonagePayload',
    'rawPushPayload',
    'payload',
  };
  final parts = data.entries
      .where((entry) => !ignoredKeys.contains(entry.key))
      .map((entry) => '${entry.key}=${entry.value}')
      .join(', ');
  return '{$parts}';
}

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/config.dart';
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:dio/dio.dart' as dio;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:get/get.dart' hide navigator;
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:sizer/sizer.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'package:uuid/uuid.dart';

enum _ChatMediaFilter { all, media, images, videos, recordings }

enum _PremiumChatTab { calls, chats, communities, updates, you }

class PremiumChatScreen extends StatefulWidget {
  const PremiumChatScreen({
    super.key,
    this.initialConversationId,
    this.pendingCall,
  });

  final String? initialConversationId;
  final Map<String, dynamic>? pendingCall;

  @override
  State<PremiumChatScreen> createState() => _PremiumChatScreenState();
}

class _PremiumChatScreenState extends State<PremiumChatScreen> {
  static const MethodChannel _voiceChannel = MethodChannel('esimconnect/voice');

  final ApiService _api = ApiService();
  final ImagePicker _imagePicker = ImagePicker();
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _messagesController = ScrollController();
  final RTCVideoRenderer _localVideoRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteVideoRenderer = RTCVideoRenderer();

  Map<String, dynamic>? _currentUser;
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _callHistory = [];
  List<Map<String, dynamic>> _messages = [];
  List<Map<String, dynamic>> _searchResults = [];
  String? _selectedConversationId;
  Map<String, dynamic>? _pendingCall;
  Map<String, dynamic>? _activeCall;
  socket_io.Socket? _chatSocket;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  final List<RTCIceCandidate> _queuedIceCandidates = [];
  bool _loading = true;
  bool _loadingCallHistory = false;
  bool _loadingMessages = false;
  bool _searching = false;
  bool _sending = false;
  bool _uploading = false;
  bool _recording = false;
  bool _renderersReady = false;
  bool _muted = false;
  bool _typingMessage = false;
  String? _recordingPath;
  String _callStatus = 'Idle';
  _ChatMediaFilter _mediaFilter = _ChatMediaFilter.all;
  _PremiumChatTab _homeTab = _PremiumChatTab.chats;
  final Set<String> _loadingMessageConversations = <String>{};
  final Map<String, DateTime> _lastMessageLoads = <String, DateTime>{};
  Timer? _searchDebounce;
  Timer? _refreshTimer;
  Timer? _presenceTimer;
  Timer? _ringtoneTimer;
  Timer? _callTimeoutTimer;
  bool _refreshingConversations = false;
  DateTime? _lastConversationRefresh;

  @override
  void initState() {
    super.initState();
    _selectedConversationId =
        widget.initialConversationId?.trim().isEmpty == true
        ? null
        : widget.initialConversationId;
    _pendingCall = widget.pendingCall == null
        ? null
        : Map<String, dynamic>.from(widget.pendingCall!);
    _messageController.addListener(_handleComposerTextChanged);
    unawaited(_initializeCallRenderers());
    _loadBootstrap();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted || _loading || _searching || _sending || _uploading) return;
      unawaited(_refreshConversations());
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _refreshTimer?.cancel();
    _presenceTimer?.cancel();
    _callTimeoutTimer?.cancel();
    _stopRingtone();
    _chatSocket?.dispose();
    _closePeerConnection();
    _stopLocalStream();
    _localVideoRenderer.dispose();
    _remoteVideoRenderer.dispose();
    _searchController.dispose();
    _messageController.dispose();
    _messagesController.dispose();
    _recorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  void _handleComposerTextChanged() {
    final typing = _messageController.text.trim().isNotEmpty;
    if (typing == _typingMessage || !mounted) return;
    setState(() => _typingMessage = typing);
  }

  Future<void> _initializeCallRenderers() async {
    await _localVideoRenderer.initialize();
    await _remoteVideoRenderer.initialize();
    if (mounted) setState(() => _renderersReady = true);
  }

  Map<String, dynamic> _dataMap(dynamic response) {
    if (response is Map) {
      final data = response['data'];
      if (data is Map) return Map<String, dynamic>.from(data);
      return Map<String, dynamic>.from(response);
    }
    return <String, dynamic>{};
  }

  List<Map<String, dynamic>> _mapList(dynamic value) {
    if (value is List) {
      return value
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }
    return <Map<String, dynamic>>[];
  }

  String _absoluteFileUrl(String value) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    return '$imageBaseUrl$value';
  }

  String _attachmentKind(List<Map<String, dynamic>> files) {
    if (files.isEmpty) return 'text';
    final types = files.map((file) => file['type']?.toString() ?? '').toList();
    if (types.every((type) => type.startsWith('image/'))) return 'image';
    if (types.every((type) => type.startsWith('video/'))) return 'video';
    if (types.every((type) => type.startsWith('audio/'))) return 'audio';
    return 'file';
  }

  bool _messageIsRecording(Map<String, dynamic> message) {
    final metadata = message['metadata'];
    return metadata is Map &&
        (metadata['recording'] == true || metadata['chatRecording'] == true);
  }

  bool _messageMatchesFilter(Map<String, dynamic> message) {
    if (_mediaFilter == _ChatMediaFilter.all) return true;
    if (_mediaFilter == _ChatMediaFilter.recordings) {
      return _messageIsRecording(message);
    }

    final attachments = _mapList(message['attachments']);
    if (_mediaFilter == _ChatMediaFilter.images) {
      return attachments.any(
        (file) => (file['type']?.toString() ?? '').startsWith('image/'),
      );
    }
    if (_mediaFilter == _ChatMediaFilter.videos) {
      return attachments.any(
        (file) => (file['type']?.toString() ?? '').startsWith('video/'),
      );
    }
    return attachments.isNotEmpty || _messageIsRecording(message);
  }

  List<Map<String, dynamic>> get _visibleMessages =>
      _messages.where(_messageMatchesFilter).toList();

  String _emptyFilterText() {
    switch (_mediaFilter) {
      case _ChatMediaFilter.images:
        return 'No images in this chat yet.';
      case _ChatMediaFilter.videos:
        return 'No videos in this chat yet.';
      case _ChatMediaFilter.recordings:
        return 'No saved call recordings in this chat yet.';
      case _ChatMediaFilter.media:
        return 'No media in this chat yet.';
      case _ChatMediaFilter.all:
        return 'Send the first message in this chat.';
    }
  }

  String _mediaFilterLabel(_ChatMediaFilter filter) {
    switch (filter) {
      case _ChatMediaFilter.media:
        return 'All Media';
      case _ChatMediaFilter.images:
        return 'Images';
      case _ChatMediaFilter.videos:
        return 'Videos';
      case _ChatMediaFilter.recordings:
        return 'Calls Recorded';
      case _ChatMediaFilter.all:
        return 'All';
    }
  }

  IconData _mediaFilterIcon(_ChatMediaFilter filter) {
    switch (filter) {
      case _ChatMediaFilter.media:
        return Icons.attach_file_rounded;
      case _ChatMediaFilter.images:
        return Icons.image_rounded;
      case _ChatMediaFilter.videos:
        return Icons.videocam_rounded;
      case _ChatMediaFilter.recordings:
        return Icons.settings_input_antenna_rounded;
      case _ChatMediaFilter.all:
        return Icons.chat_bubble_outline_rounded;
    }
  }

  Future<void> _loadBootstrap({bool keepSelection = true}) async {
    setState(() => _loading = true);
    try {
      final response = await _api.get('chat/bootstrap');
      final data = _dataMap(response);
      final conversations = _mapList(data['conversations']);
      final selectedStillExists =
          _selectedConversationId != null &&
          conversations.any((item) => item['id'] == _selectedConversationId);

      if (!mounted) return;
      setState(() {
        _currentUser = data['currentUser'] is Map
            ? Map<String, dynamic>.from(data['currentUser'])
            : null;
        _conversations = conversations;
        if (!keepSelection || !selectedStillExists) {
          _selectedConversationId = null;
          _messages = [];
        }
      });

      if (_selectedConversationId != null) {
        await _loadMessages(_selectedConversationId!);
      }
      unawaited(_loadCallHistory());
      unawaited(_connectRealtime());
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMessages(
    String conversationId, {
    bool silent = false,
    bool force = false,
  }) async {
    if (_loadingMessageConversations.contains(conversationId)) return;
    final now = DateTime.now();
    final lastLoad = _lastMessageLoads[conversationId];
    if (!force &&
        silent &&
        lastLoad != null &&
        now.difference(lastLoad) < const Duration(seconds: 3)) {
      return;
    }

    _loadingMessageConversations.add(conversationId);
    if (!silent) setState(() => _loadingMessages = true);
    try {
      _joinSelectedConversation();
      final response = await _api.get(
        'chat/conversations/$conversationId/messages',
      );
      final data = response is Map ? response['data'] : null;
      if (!mounted) return;
      _lastMessageLoads[conversationId] = DateTime.now();
      setState(() => _messages = _mapList(data));
      if (!silent) _scrollToBottom();
      unawaited(_refreshConversations());
    } catch (error) {
      _showError(error.toString());
    } finally {
      _loadingMessageConversations.remove(conversationId);
      if (mounted && !silent) setState(() => _loadingMessages = false);
    }
  }

  Future<void> _refreshConversations({bool force = false}) async {
    if (_refreshingConversations) return;
    final now = DateTime.now();
    if (!force &&
        _lastConversationRefresh != null &&
        now.difference(_lastConversationRefresh!) <
            const Duration(seconds: 3)) {
      return;
    }

    _refreshingConversations = true;
    _lastConversationRefresh = now;
    try {
      final response = await _api.get('chat/conversations');
      final data = response is Map ? response['data'] : null;
      if (!mounted) return;
      setState(() => _conversations = _mapList(data));
      if (_homeTab == _PremiumChatTab.calls) {
        unawaited(_loadCallHistory(silent: true));
      }
    } catch (_) {
      // Message loading already succeeded; keep the existing list if this
      // lightweight conversation refresh fails.
    } finally {
      _refreshingConversations = false;
    }
  }

  Future<void> _loadCallHistory({bool silent = false}) async {
    if (_loadingCallHistory) return;
    if (!silent && mounted) setState(() => _loadingCallHistory = true);
    try {
      final response = await _api.get('chat/call-history');
      final data = response is Map ? response['data'] : response;
      if (!mounted) return;
      setState(() => _callHistory = _mapList(data));
    } catch (_) {
      // Keep the current calls list if the history endpoint is unavailable.
    } finally {
      if (mounted) setState(() => _loadingCallHistory = false);
    }
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    final query = value.trim();
    if (query.length < 3) {
      setState(() => _searchResults = []);
      return;
    }
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      _searchUsers(query);
    });
  }

  Future<void> _searchUsers(String query) async {
    setState(() => _searching = true);
    try {
      final response = await _api.get('chat/users', query: {'search': query});
      final data = response is Map ? response['data'] : null;
      if (!mounted) return;
      setState(() => _searchResults = _mapList(data));
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _startDirectChat(Map<String, dynamic> user) async {
    final userId = user['id']?.toString();
    if (userId == null || userId.isEmpty) return;

    setState(() => _loading = true);
    try {
      final response = await _api.post(
        'chat/conversations',
        data: {
          'type': 'direct',
          'participantIds': [userId],
        },
      );
      final data = _dataMap(response);
      final conversationId = data['conversationId']?.toString();
      final conversations = _mapList(data['conversations']);
      if (!mounted) return;
      setState(() {
        if (conversations.isNotEmpty) _conversations = conversations;
        _selectedConversationId = conversationId;
        _searchController.clear();
        _searchResults = [];
      });
      if (conversationId != null && conversationId.isNotEmpty) {
        _joinSelectedConversation();
        await _loadMessages(conversationId);
      }
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendMessage() async {
    final conversationId = _selectedConversationId;
    final body = _messageController.text.trim();
    if (conversationId == null || body.isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      _messageController.clear();
      if (mounted) setState(() => _typingMessage = false);
      final response = await _api.post(
        'chat/conversations/$conversationId/messages',
        data: {'messageType': 'text', 'body': body},
      );
      final message = _dataMap(response);
      if (message.isNotEmpty) {
        _appendMessage(message);
      } else {
        await _loadMessages(conversationId);
      }
      unawaited(_refreshConversations(force: true));
    } catch (error) {
      _messageController.text = body;
      if (mounted) setState(() => _typingMessage = body.trim().isNotEmpty);
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _sendStructuredMessage({
    required String messageType,
    required String body,
    Map<String, dynamic>? location,
    Map<String, dynamic>? metadata,
  }) async {
    final conversationId = _selectedConversationId;
    if (conversationId == null || conversationId.isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      final response = await _api.post(
        'chat/conversations/$conversationId/messages',
        data: {
          'messageType': messageType,
          'body': body,
          ...?(location == null ? null : {'location': location}),
          ...?(metadata == null ? null : {'metadata': metadata}),
        },
      );
      final message = _dataMap(response);
      if (message.isNotEmpty) {
        _appendMessage(message);
      } else {
        await _loadMessages(conversationId);
      }
      unawaited(_refreshConversations(force: true));
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  bool _canForwardMessage(Map<String, dynamic> message) {
    final type = message['messageType']?.toString() ?? 'text';
    if (type.contains('call')) return false;
    final body = message['body']?.toString().trim() ?? '';
    return body.isNotEmpty ||
        _mapList(message['attachments']).isNotEmpty ||
        message['location'] is Map ||
        message['emoji'] is Map;
  }

  Map<String, dynamic> _forwardPayload(Map<String, dynamic> message) {
    final type = message['messageType']?.toString() ?? 'text';
    final body = message['body']?.toString() ?? '';
    final attachments = _mapList(message['attachments']);
    final location = message['location'] is Map
        ? Map<String, dynamic>.from(message['location'])
        : null;
    final emoji = message['emoji'] is Map
        ? Map<String, dynamic>.from(message['emoji'])
        : null;
    final metadata = message['metadata'] is Map
        ? Map<String, dynamic>.from(message['metadata'])
        : <String, dynamic>{};

    metadata
      ..remove('privateRecording')
      ..remove('recordingVisibility')
      ..remove('visibleOnlyToUserId')
      ..['forwarded'] = true
      ..['forwardedAt'] = DateTime.now().toIso8601String();
    final sourceId = message['id']?.toString();
    if (sourceId != null && sourceId.isNotEmpty) {
      metadata['forwardedFromMessageId'] = sourceId;
    }

    return {
      'messageType': type,
      'body': body,
      if (attachments.isNotEmpty) 'attachments': attachments,
      ...?(location == null ? null : {'location': location}),
      ...?(emoji == null ? null : {'emoji': emoji}),
      'metadata': metadata,
    };
  }

  Future<void> _forwardMessageToConversation(
    Map<String, dynamic> message,
    String conversationId,
  ) async {
    if (conversationId.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final payload = _forwardPayload(message);
      await _api.post(
        'chat/conversations/$conversationId/messages',
        data: payload,
      );
      _showNotice('Message forwarded.');
      unawaited(_refreshConversations(force: true));
      if (conversationId == _selectedConversationId) {
        unawaited(_loadMessages(conversationId, silent: true, force: true));
      }
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _forwardMessageToUser(
    Map<String, dynamic> message,
    Map<String, dynamic> user,
  ) async {
    final userId = user['id']?.toString();
    if (userId == null || userId.isEmpty) return;

    try {
      final response = await _api.post(
        'chat/conversations',
        data: {
          'type': 'direct',
          'participantIds': [userId],
        },
      );
      final data = _dataMap(response);
      final conversationId = data['conversationId']?.toString();
      final conversations = _mapList(data['conversations']);
      if (mounted && conversations.isNotEmpty) {
        setState(() => _conversations = conversations);
      }
      if (conversationId == null || conversationId.isEmpty) {
        _showError('Could not open this chat.');
        return;
      }
      await _forwardMessageToConversation(message, conversationId);
    } catch (error) {
      _showError(error.toString());
    }
  }

  void _showForwardSheet(Map<String, dynamic> message) {
    if (!_canForwardMessage(message)) return;

    final searchController = TextEditingController();
    Timer? debounce;
    var results = <Map<String, dynamic>>[];
    var searching = false;

    Future<void> runSearch(
      String value,
      void Function(void Function()) setSheetState,
    ) async {
      final query = value.trim();
      debounce?.cancel();
      if (query.length < 3) {
        setSheetState(() => results = []);
        return;
      }
      debounce = Timer(const Duration(milliseconds: 320), () async {
        setSheetState(() => searching = true);
        try {
          final response = await _api.get(
            'chat/users',
            query: {'search': query},
          );
          final data = response is Map ? response['data'] : null;
          if (!mounted) return;
          setSheetState(() => results = _mapList(data));
        } catch (_) {
          if (mounted) setSheetState(() => results = []);
        } finally {
          if (mounted) setSheetState(() => searching = false);
        }
      });
    }

    final existingConversations = _conversations
        .where(
          (conversation) =>
              conversation['id']?.toString() != _selectedConversationId,
        )
        .toList();

    unawaited(
      Get.bottomSheet(
        StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              constraints: BoxConstraints(maxHeight: 78.h),
              padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.h),
              decoration: BoxDecoration(
                color: AppColors.appSurface,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(22),
                ),
                border: Border(top: BorderSide(color: AppColors.appBorder)),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 12.w,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.appBorder,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    SizedBox(height: 1.6.h),
                    Row(
                      children: [
                        Icon(
                          Icons.shortcut_rounded,
                          color: const Color(0xFF7DDDEC),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            tr('Forward message'),
                            style: TextStyle(
                              color: AppColors.appTextPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 1.4.h),
                    TextField(
                      controller: searchController,
                      onChanged: (value) => runSearch(value, setSheetState),
                      style: TextStyle(color: AppColors.appTextPrimary),
                      decoration:
                          _dialogFieldDecoration(
                            'Search by email, phone, name, or UID',
                          ).copyWith(
                            prefixIcon: Icon(
                              Icons.search_rounded,
                              color: AppColors.appTextSecondary,
                            ),
                          ),
                    ),
                    SizedBox(height: 1.4.h),
                    Expanded(
                      child: ListView(
                        children: [
                          if (searching)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 14),
                              child: Center(child: CircularProgressIndicator()),
                            ),
                          if (results.isNotEmpty) ...[
                            _sectionLabel('People'),
                            ...results.map(
                              (user) => _ForwardTargetTile(
                                title: _displayName(user),
                                subtitle: user['email']?.toString() ?? '',
                                initials: _initials(_displayName(user)),
                                onTap: () {
                                  Get.back();
                                  unawaited(
                                    _forwardMessageToUser(message, user),
                                  );
                                },
                              ),
                            ),
                            Divider(color: AppColors.appBorder, height: 24),
                          ],
                          _sectionLabel('Chats'),
                          if (existingConversations.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              child: Text(
                                tr('Search a user to forward this message.'),
                                style: TextStyle(
                                  color: AppColors.appTextSecondary,
                                ),
                              ),
                            )
                          else
                            ...existingConversations.map((conversation) {
                              final title = _conversationTitle(conversation);
                              final lastMessage =
                                  conversation['lastMessage'] is Map
                                  ? Map<String, dynamic>.from(
                                      conversation['lastMessage'],
                                    )
                                  : null;
                              return _ForwardTargetTile(
                                title: title,
                                subtitle: _messagePreview(lastMessage),
                                initials: _initials(title),
                                onTap: () {
                                  final conversationId = conversation['id']
                                      ?.toString();
                                  if (conversationId == null) return;
                                  Get.back();
                                  unawaited(
                                    _forwardMessageToConversation(
                                      message,
                                      conversationId,
                                    ),
                                  );
                                },
                              );
                            }),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
      ).whenComplete(() {
        debounce?.cancel();
        searchController.dispose();
      }),
    );
  }

  InputDecoration _dialogFieldDecoration(String hint) {
    return InputDecoration(
      hintText: tr(hint),
      hintStyle: TextStyle(color: AppColors.appTextSecondary),
      filled: true,
      fillColor: AppColors.appSurfaceAlt,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.appBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.appBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.primaryColor),
      ),
    );
  }

  Future<List<String>?> _showTextInputDialog({
    required String title,
    required List<String> fields,
    String action = 'Send',
  }) async {
    if (!mounted) return null;
    final controllers = fields.map((_) => TextEditingController()).toList();
    try {
      return await showDialog<List<String>>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: AppColors.appSurface,
          title: Text(
            tr(title),
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var index = 0; index < fields.length; index += 1) ...[
                TextField(
                  controller: controllers[index],
                  autofocus: index == 0,
                  minLines: 1,
                  maxLines: fields.length == 1 ? 4 : 1,
                  style: TextStyle(color: AppColors.appTextPrimary),
                  decoration: _dialogFieldDecoration(fields[index]),
                ),
                if (index < fields.length - 1) const SizedBox(height: 10),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(tr('Cancel')),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(
                controllers
                    .map((controller) => controller.text.trim())
                    .toList(),
              ),
              child: Text(tr(action)),
            ),
          ],
        ),
      );
    } finally {
      for (final controller in controllers) {
        controller.dispose();
      }
    }
  }

  Future<void> _shareLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showError('Turn on location services to share your location.');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showError('Location permission is required to share location.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      final latitude = position.latitude;
      final longitude = position.longitude;
      final mapsUrl = 'https://maps.google.com/?q=$latitude,$longitude';

      await _sendStructuredMessage(
        messageType: 'location',
        body: 'Shared location',
        location: {
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': position.accuracy,
          'mapsUrl': mapsUrl,
        },
        metadata: {'sharedFrom': 'mobile-chat'},
      );
    } catch (error) {
      _showError(error.toString());
    }
  }

  Future<void> _shareContact() async {
    final values = await _showTextInputDialog(
      title: 'Share Contact',
      fields: ['Contact name', 'Phone number', 'Email address'],
    );
    if (values == null) return;
    final name = values.isNotEmpty ? values[0] : '';
    final phone = values.length > 1 ? values[1] : '';
    final email = values.length > 2 ? values[2] : '';
    if (name.isEmpty && phone.isEmpty && email.isEmpty) return;

    await _sendStructuredMessage(
      messageType: 'text',
      body: [
        if (name.isNotEmpty) 'Contact: $name',
        if (phone.isNotEmpty) 'Phone: $phone',
        if (email.isNotEmpty) 'Email: $email',
      ].join('\n'),
      metadata: {
        'contactCard': true,
        'name': name,
        'phone': phone,
        'email': email,
      },
    );
  }

  Future<void> _createPoll() async {
    final values = await _showTextInputDialog(
      title: 'Create Poll',
      fields: ['Question', 'Option 1', 'Option 2'],
      action: 'Create',
    );
    if (values == null) return;
    final question = values.isNotEmpty ? values[0] : '';
    final options = [
      values.length > 1 ? values[1] : '',
      values.length > 2 ? values[2] : '',
    ].where((value) => value.isNotEmpty).toList();
    if (question.isEmpty || options.length < 2) {
      _showError('Add a question and at least two poll options.');
      return;
    }

    await _sendStructuredMessage(
      messageType: 'text',
      body:
          'Poll: $question\n${options.map((option) => '- $option').join('\n')}',
      metadata: {
        'poll': true,
        'question': question,
        'options': options,
        'createdAt': DateTime.now().toIso8601String(),
      },
    );
  }

  Future<void> _shareEvent() async {
    final values = await _showTextInputDialog(
      title: 'Event',
      fields: ['Event title'],
      action: 'Next',
    );
    if (values == null) return;
    final title = values.first.trim();
    if (title.isEmpty) return;

    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF7DDDEC),
            surface: Color(0xFF101827),
          ),
        ),
        child: child ?? const SizedBox.shrink(),
      ),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(hours: 1))),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF7DDDEC),
            surface: Color(0xFF101827),
          ),
        ),
        child: child ?? const SizedBox.shrink(),
      ),
    );
    if (time == null) return;

    final startsAt = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    final label = DateFormat('MMM d, yyyy h:mm a').format(startsAt);
    await _sendStructuredMessage(
      messageType: 'text',
      body: 'Event: $title\n$label',
      metadata: {
        'event': true,
        'title': title,
        'startsAt': startsAt.toIso8601String(),
      },
    );
  }

  Future<void> _askAi() async {
    final values = await _showTextInputDialog(
      title: 'AI',
      fields: ['Ask AI to help with this chat'],
      action: 'Send',
    );
    final prompt = values?.first.trim() ?? '';
    if (prompt.isEmpty) return;
    await _sendStructuredMessage(
      messageType: 'text',
      body: 'AI request: $prompt',
      metadata: {
        'aiRequest': true,
        'prompt': prompt,
        'createdAt': DateTime.now().toIso8601String(),
      },
    );
  }

  Future<void> _startRealtimeVoiceCall() => _startRealtimeCall();

  Future<void> _startRealtimeVideoCall() => _startRealtimeCall(video: true);

  Future<void> _startRealtimeCall({bool video = false}) async {
    final conversation = _selectedConversation;
    final other = _otherParticipant(_selectedConversation);
    final conversationId = conversation?['id']?.toString();
    final targetUserId = other?['id']?.toString();
    final mode = video ? 'video' : 'voice';

    if (conversationId == null ||
        conversationId.isEmpty ||
        targetUserId == null ||
        targetUserId.isEmpty) {
      _showError('Select a chat user before starting a Premium Chat call.');
      return;
    }

    if (_activeCall != null) {
      _showError('Another chat call is already active.');
      return;
    }

    final connected = await _connectRealtime();
    if (!connected) {
      await _notifyChatCallPush(conversationId, const Uuid().v4(), mode: mode);
      _showError(
        'Realtime chat is reconnecting. I sent a mobile call notification instead.',
      );
      return;
    }

    final callId = const Uuid().v4();
    final call = <String, dynamic>{
      'callId': callId,
      'conversationId': conversationId,
      'mode': mode,
      'status': 'outgoing',
      'remoteUserId': targetUserId,
      'remoteName': _displayName(other),
      'targetUserIds': [targetUserId],
    };

    try {
      await _prepareLocalStream(video: video);
      if (!mounted) return;
      setState(() {
        _activeCall = call;
        _callStatus = video ? 'Video ringing' : 'Ringing';
      });
      _startCallTimeout(callId);
      _chatSocket?.emit('chat:call:invite', {
        'callId': callId,
        'conversationId': conversationId,
        'mode': mode,
        'targetUserIds': [targetUserId],
      });
    } catch (error) {
      _finishCall(notifyRemote: false);
      _showError(
        video
            ? 'Allow camera and microphone access to start the video chat call.'
            : 'Allow microphone access to start the chat call.',
      );
    }
  }

  Future<void> _notifyChatCallPush(
    String conversationId,
    String callId, {
    String mode = 'voice',
  }) async {
    try {
      await _api.post(
        'chat/conversations/$conversationId/call-request',
        data: {'mode': mode, 'callId': callId},
      );
    } catch (_) {
      // Text chat remains available even if the call notification cannot be sent.
    }
  }

  Future<void> _sendCallLink() async {
    final conversationId = _selectedConversationId;
    if (conversationId == null || conversationId.isEmpty || _sending) return;

    final link =
        'https://g5esim.mobile/account/chat?conversationId=$conversationId';
    setState(() => _sending = true);
    try {
      final response = await _api.post(
        'chat/conversations/$conversationId/messages',
        data: {
          'messageType': 'text',
          'body': 'Premium Chat call link: $link',
          'metadata': {
            'chatCallLink': true,
            'createdAt': DateTime.now().toIso8601String(),
          },
        },
      );
      final message = _dataMap(response);
      if (message.isNotEmpty) _appendMessage(message);
      _showNotice('Call link sent.');
      unawaited(_refreshConversations(force: true));
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _scheduleCall() async {
    final conversationId = _selectedConversationId;
    if (conversationId == null || conversationId.isEmpty || _sending) return;

    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF7DDDEC),
            surface: Color(0xFF101827),
          ),
        ),
        child: child ?? const SizedBox.shrink(),
      ),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now.add(const Duration(hours: 1))),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF7DDDEC),
            surface: Color(0xFF101827),
          ),
        ),
        child: child ?? const SizedBox.shrink(),
      ),
    );
    if (time == null) return;

    final scheduled = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    final label = DateFormat('MMM d, yyyy h:mm a').format(scheduled);

    setState(() => _sending = true);
    try {
      final response = await _api.post(
        'chat/conversations/$conversationId/messages',
        data: {
          'messageType': 'text',
          'body': 'Scheduled call: $label',
          'metadata': {
            'scheduledChatCall': true,
            'scheduledAt': scheduled.toIso8601String(),
          },
        },
      );
      final message = _dataMap(response);
      if (message.isNotEmpty) _appendMessage(message);
      _showNotice('Call scheduled.');
      unawaited(_refreshConversations(force: true));
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAndSendMedia(
    ImageSource source, {
    required bool video,
  }) async {
    final conversationId = _selectedConversationId;
    if (conversationId == null || _uploading) return;

    try {
      final picked = video
          ? await _imagePicker.pickVideo(source: source)
          : await _imagePicker.pickImage(source: source, imageQuality: 92);
      if (picked == null) return;
      await _uploadAndSendFiles([
        picked,
      ], messageType: video ? 'video' : 'image');
    } catch (error) {
      _showError(error.toString());
    }
  }

  Future<List<Map<String, dynamic>>> _uploadChatFiles(
    List<XFile> pickedFiles,
  ) async {
    final formData = dio.FormData();
    for (final file in pickedFiles) {
      formData.files.add(
        MapEntry(
          'files',
          await dio.MultipartFile.fromFile(file.path, filename: file.name),
        ),
      );
    }

    final uploadResponse = await _api.postForm('chat/uploads', data: formData);
    final uploadData = _dataMap(uploadResponse);
    return _mapList(uploadData['files']);
  }

  Future<void> _uploadAndSendFiles(
    List<XFile> pickedFiles, {
    String? messageType,
    String? body,
    Map<String, dynamic>? metadata,
  }) async {
    final conversationId = _selectedConversationId;
    if (conversationId == null || pickedFiles.isEmpty || _uploading) return;

    setState(() => _uploading = true);
    try {
      final files = await _uploadChatFiles(pickedFiles);
      if (files.isEmpty) {
        _showError('No chat files uploaded');
        return;
      }

      final kind = messageType ?? _attachmentKind(files);
      final response = await _api.post(
        'chat/conversations/$conversationId/messages',
        data: {
          'messageType': kind,
          'body': body ?? '',
          'attachments': files,
          ...?(metadata == null ? null : {'metadata': metadata}),
        },
      );
      final message = _dataMap(response);
      if (message.isNotEmpty) {
        _appendMessage(message);
      } else {
        await _loadMessages(conversationId);
      }
      unawaited(_refreshConversations(force: true));
    } catch (error) {
      _showError(error.toString());
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _toggleVoiceRecording() async {
    if (_recording) {
      await _stopRecordingAndSend();
      return;
    }

    if (_selectedConversationId == null || _uploading || _sending) return;

    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        _showError('Microphone permission is required.');
        return;
      }

      final directory = await getTemporaryDirectory();
      final path =
          '${directory.path}/premium-chat-${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );
      if (!mounted) return;
      setState(() {
        _recording = true;
        _recordingPath = path;
      });
    } catch (error) {
      _showError(error.toString());
    }
  }

  Future<void> _stopRecordingAndSend() async {
    try {
      final path = await _recorder.stop() ?? _recordingPath;
      if (mounted) setState(() => _recording = false);
      if (path == null || !File(path).existsSync()) {
        _showError('No voice recording found.');
        return;
      }

      await _uploadAndSendFiles(
        [XFile(path, name: 'voice-message.m4a')],
        messageType: 'audio',
        body: 'Voice recording',
        metadata: {
          'chatRecording': true,
          'chatRecordingKind': 'audio',
          'savedAt': DateTime.now().toIso8601String(),
        },
      );
    } catch (error) {
      if (mounted) setState(() => _recording = false);
      _showError(error.toString());
    }
  }

  Future<void> _playAttachment(Map<String, dynamic> file) async {
    final url = file['url']?.toString();
    final type = file['type']?.toString() ?? '';
    if (url == null || url.isEmpty || !type.startsWith('audio/')) return;

    try {
      await _audioPlayer.stop();
      await _audioPlayer.play(UrlSource(_absoluteFileUrl(url)));
    } catch (error) {
      _showError(error.toString());
    }
  }

  Map<String, dynamic> _eventMap(dynamic data) {
    if (data is Map) return Map<String, dynamic>.from(data);
    if (data is List && data.isNotEmpty && data.first is Map) {
      return Map<String, dynamic>.from(data.first as Map);
    }
    return <String, dynamic>{};
  }

  List<String> _stringList(dynamic value) {
    if (value is List) {
      return value
          .map((item) => item?.toString().trim() ?? '')
          .where((item) => item.isNotEmpty)
          .toList();
    }
    return <String>[];
  }

  Future<bool> _connectRealtime() async {
    if (_chatSocket?.connected == true) return true;

    try {
      if (_chatSocket == null) {
        final response = await _api.get('chat/realtime-token');
        final token = _dataMap(response)['token']?.toString();
        if (token == null || token.isEmpty) return false;

        final socket = socket_io.io(
          socketbaseUrl,
          socket_io.OptionBuilder()
              .setTransports(['websocket', 'polling'])
              .setAuth({'token': token})
              .enableReconnection()
              .disableAutoConnect()
              .build(),
        );
        _chatSocket = socket;
        _bindRealtimeSocket(socket);
        socket.connect();
      } else {
        _chatSocket!.connect();
      }

      for (var attempt = 0; attempt < 20; attempt += 1) {
        if (_chatSocket?.connected == true) return true;
        await Future<void>.delayed(const Duration(milliseconds: 150));
      }
    } catch (_) {
      return false;
    }

    return _chatSocket?.connected == true;
  }

  void _bindRealtimeSocket(socket_io.Socket socket) {
    socket.onConnect((_) {
      if (!mounted) return;
      socket.emit('chat:ready');
      _startPresenceTimer();
      _joinSelectedConversation();
      _resumePendingCallFromNotification();
    });

    socket.onDisconnect((_) {
      _presenceTimer?.cancel();
    });

    socket.on(
      'chat:message:new',
      (data) => _handleRealtimeMessage(_eventMap(data)),
    );
    socket.on('chat:message:read', (data) {
      final payload = _eventMap(data);
      final conversationId = payload['conversationId']?.toString();
      if (conversationId != null && conversationId == _selectedConversationId) {
        unawaited(_loadMessages(conversationId, silent: true, force: true));
      }
      unawaited(_refreshConversations(force: true));
    });
    socket.on('chat:conversation:updated', (data) {
      final payload = _eventMap(data);
      final conversationId = payload['conversationId']?.toString();
      if (conversationId != null && conversationId != _selectedConversationId) {
        _playMessageTone();
        _showNotice('New Premium Chat activity.');
      }
      unawaited(_refreshConversations(force: true));
    });
    socket.on(
      'chat:call:incoming',
      (data) => _handleIncomingCall(_eventMap(data)),
    );
    socket.on(
      'chat:call:accepted',
      (data) => unawaited(_handleCallAccepted(_eventMap(data))),
    );
    socket.on(
      'chat:call:offer',
      (data) => unawaited(_handleRemoteOffer(_eventMap(data))),
    );
    socket.on(
      'chat:call:answer',
      (data) => unawaited(_handleRemoteAnswer(_eventMap(data))),
    );
    socket.on(
      'chat:call:ice-candidate',
      (data) => unawaited(_handleRemoteIce(_eventMap(data))),
    );
    socket.on(
      'chat:call:rejected',
      (data) => _handleCallEnded(_eventMap(data), rejected: true),
    );
    socket.on('chat:call:ended', (data) => _handleCallEnded(_eventMap(data)));
    socket.on('chat:call:error', (data) => _handleCallError(_eventMap(data)));
    socket.on('chat:call:mobile-notified', (data) {
      final payload = _eventMap(data);
      if (_callMatches(payload)) {
        setState(() => _callStatus = 'Waiting for mobile');
      }
    });
    socket.on('chat:call:mobile-opened', (data) {
      final payload = _eventMap(data);
      if (_callMatches(payload)) {
        setState(() => _callStatus = 'Ringing on mobile');
      }
    });
  }

  void _startPresenceTimer() {
    _presenceTimer?.cancel();
    _presenceTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _chatSocket?.emit('chat:presence:ping');
    });
  }

  void _joinSelectedConversation() {
    final conversationId = _selectedConversationId;
    if (conversationId == null || _chatSocket?.connected != true) return;
    _chatSocket?.emit('chat:conversation:join', {
      'conversationId': conversationId,
    });
  }

  void _resumePendingCallFromNotification() {
    final pending = _pendingCall;
    if (pending == null || _chatSocket?.connected != true) return;

    final conversationId = pending['conversationId']?.toString();
    if (conversationId != null && conversationId.isNotEmpty) {
      if (_selectedConversationId != conversationId) {
        setState(() => _selectedConversationId = conversationId);
        unawaited(_loadMessages(conversationId));
      }
      _chatSocket?.emit('chat:conversation:join', {
        'conversationId': conversationId,
      });
    }

    final callId = pending['callId']?.toString();
    if (callId != null && callId.isNotEmpty) {
      _chatSocket?.emit('chat:call:resume', {'callId': callId});
      _pendingCall = null;
    }
  }

  void _appendMessage(Map<String, dynamic> message) {
    final messageId = message['id']?.toString();
    if (messageId != null &&
        _messages.any((item) => item['id']?.toString() == messageId)) {
      return;
    }

    if (!mounted) return;
    setState(() => _messages = [..._messages, message]);
    _scrollToBottom();
  }

  void _handleRealtimeMessage(Map<String, dynamic> message) {
    final conversationId = message['conversationId']?.toString();
    final fromMe =
        message['senderId']?.toString() == _currentUser?['id']?.toString();
    if (conversationId == null || conversationId != _selectedConversationId) {
      if (!fromMe) {
        _playMessageTone();
      }
      unawaited(_refreshConversations());
      return;
    }

    _appendMessage(message);
    if (!fromMe) {
      _playMessageTone();
      final sender = message['senderName']?.toString().trim().isNotEmpty == true
          ? message['senderName'].toString()
          : tr('Premium Chat');
      _showNotice('$sender: ${_messagePreview(message)}');
    }
    unawaited(_refreshConversations(force: true));
  }

  bool _callMatches(Map<String, dynamic> payload) {
    final callId = payload['callId']?.toString();
    return callId != null &&
        callId.isNotEmpty &&
        callId == _activeCall?['callId']?.toString();
  }

  void _startCallTimeout(String callId) {
    _callTimeoutTimer?.cancel();
    _callTimeoutTimer = Timer(const Duration(seconds: 60), () {
      final active = _activeCall;
      if (!mounted ||
          active == null ||
          active['callId']?.toString() != callId ||
          active['status']?.toString() == 'active' ||
          _callStatus.toLowerCase() == 'connected') {
        return;
      }
      final conversationId = active['conversationId']?.toString();
      if (conversationId != null && conversationId.isNotEmpty) {
        unawaited(
          _notifyChatCallPush(
            conversationId,
            callId,
            mode: active['mode']?.toString() ?? 'voice',
          ),
        );
      }
      _showNotice('No answer. Call ended.');
      _finishCall();
    });
  }

  void _cancelCallTimeout() {
    _callTimeoutTimer?.cancel();
    _callTimeoutTimer = null;
  }

  Future<Map<String, dynamic>> _rtcConfiguration() async {
    try {
      final response = await _api.get('chat/rtc-config');
      final data = _dataMap(response);
      final iceServers = data['iceServers'];
      if (iceServers is List && iceServers.isNotEmpty) {
        return {'iceServers': iceServers};
      }
    } catch (_) {
      // Fall back to public STUN if the backend config cannot be loaded.
    }
    return {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
      ],
    };
  }

  Future<MediaStream> _prepareLocalStream({required bool video}) async {
    final existing = _localStream;
    if (existing != null) {
      if (!video || existing.getVideoTracks().isNotEmpty) return existing;
      _stopLocalStream();
    }

    final stream = await navigator.mediaDevices.getUserMedia({
      'audio': {
        'echoCancellation': true,
        'noiseSuppression': true,
        'autoGainControl': true,
      },
      'video': video
          ? {
              'facingMode': 'user',
              'width': {'ideal': 1280},
              'height': {'ideal': 720},
            }
          : false,
    });

    _localStream = stream;
    if (_renderersReady) _localVideoRenderer.srcObject = stream;
    return stream;
  }

  Future<void> _switchCallCamera() async {
    final videoTracks = _localStream?.getVideoTracks() ?? [];
    if (videoTracks.isEmpty) {
      _showError('Camera is not active for this call.');
      return;
    }

    try {
      await Helper.switchCamera(videoTracks.first);
    } catch (error) {
      _showError('Could not switch camera.');
    }
  }

  String _friendlyPeerState(dynamic state) {
    final raw = state.toString().toLowerCase();
    if (raw.contains('connected')) return 'Connected';
    if (raw.contains('connecting')) return 'Connecting';
    if (raw.contains('failed')) return 'Connection failed';
    if (raw.contains('disconnected')) return 'Reconnecting';
    if (raw.contains('closed')) return 'Call ended';
    if (raw.contains('new')) return 'Connecting';
    return 'Connecting';
  }

  Future<RTCPeerConnection> _createPeerConnection(String remoteUserId) async {
    _closePeerConnection();
    final configuration = await _rtcConfiguration();
    final peerConnection = await createPeerConnection(configuration);
    _peerConnection = peerConnection;

    peerConnection.onIceCandidate = (candidate) {
      final call = _activeCall;
      if (call == null) return;
      _chatSocket?.emit('chat:call:ice-candidate', {
        'callId': call['callId'],
        'conversationId': call['conversationId'],
        'toUserId': remoteUserId,
        'candidate': {
          'candidate': candidate.candidate,
          'sdpMid': candidate.sdpMid,
          'sdpMLineIndex': candidate.sdpMLineIndex,
        },
      });
    };

    peerConnection.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams.first;
        if (_renderersReady) _remoteVideoRenderer.srcObject = _remoteStream;
      }
      _cancelCallTimeout();
      if (mounted) {
        setState(() {
          _activeCall = {...?_activeCall, 'status': 'active'};
          _callStatus = 'Connected';
        });
      }
    };

    peerConnection.onConnectionState = (state) {
      if (!mounted) return;
      final friendly = _friendlyPeerState(state);
      if (friendly == 'Connected') _cancelCallTimeout();
      setState(() {
        if (friendly == 'Connected') {
          _activeCall = {...?_activeCall, 'status': 'active'};
        }
        _callStatus = friendly;
      });
    };

    final stream = await _prepareLocalStream(
      video: _activeCall?['mode'] == 'video',
    );
    for (final track in stream.getTracks()) {
      await peerConnection.addTrack(track, stream);
    }

    for (final candidate in _queuedIceCandidates) {
      await peerConnection.addCandidate(candidate).catchError((_) {});
    }
    _queuedIceCandidates.clear();

    return peerConnection;
  }

  RTCSessionDescription? _descriptionFromPayload(Map<String, dynamic> payload) {
    final description = payload['description'];
    if (description is! Map) return null;
    final sdp = description['sdp']?.toString();
    final type = description['type']?.toString();
    if (sdp == null || type == null) return null;
    return RTCSessionDescription(sdp, type);
  }

  RTCIceCandidate? _candidateFromPayload(Map<String, dynamic> payload) {
    final candidateMap = payload['candidate'];
    if (candidateMap is! Map) return null;
    final candidate = candidateMap['candidate']?.toString();
    if (candidate == null || candidate.isEmpty) return null;
    return RTCIceCandidate(
      candidate,
      candidateMap['sdpMid']?.toString(),
      int.tryParse(candidateMap['sdpMLineIndex']?.toString() ?? ''),
    );
  }

  Map<String, dynamic>? _localDescriptionMap(
    RTCSessionDescription? description,
  ) {
    if (description == null) return null;
    return {'sdp': description.sdp, 'type': description.type};
  }

  void _handleIncomingCall(Map<String, dynamic> payload) {
    final callId = payload['callId']?.toString();
    final fromUserId = payload['fromUserId']?.toString();
    final conversationId = payload['conversationId']?.toString();
    if (callId == null || fromUserId == null || conversationId == null) return;
    if (fromUserId == _currentUser?['id']?.toString()) return;

    if (_activeCall != null && _activeCall?['callId'] != callId) {
      _chatSocket?.emit('chat:call:reject', {
        'callId': callId,
        'conversationId': conversationId,
        'toUserId': fromUserId,
        'reason': 'busy',
      });
      return;
    }

    final fromUser = payload['fromUser'] is Map
        ? Map<String, dynamic>.from(payload['fromUser'])
        : <String, dynamic>{
            'id': fromUserId,
            'name': payload['fromName'],
            'email': payload['fromEmail'],
          };

    if (!mounted) return;
    setState(() {
      _selectedConversationId = conversationId;
      _activeCall = {
        'callId': callId,
        'conversationId': conversationId,
        'mode': payload['mode']?.toString() == 'video' ? 'video' : 'voice',
        'status': 'incoming',
        'remoteUserId': fromUserId,
        'remoteName': _displayName(fromUser),
        'targetUserIds': [fromUserId],
      };
      _callStatus = 'Incoming';
    });
    _startCallTimeout(callId);
    _joinSelectedConversation();
    unawaited(_loadMessages(conversationId, silent: true));
    _playRingtone();
  }

  Future<void> _answerCall() async {
    final call = _activeCall;
    if (call == null || call['status'] != 'incoming') return;

    try {
      _stopRingtone();
      await _prepareLocalStream(video: call['mode'] == 'video');
      if (!mounted) return;
      setState(() {
        _activeCall = {...call, 'status': 'connecting'};
        _callStatus = 'Connecting';
      });
      _cancelCallTimeout();
      _chatSocket?.emit('chat:call:accept', {
        'callId': call['callId'],
        'conversationId': call['conversationId'],
        'toUserId': call['remoteUserId'],
      });
    } catch (_) {
      _declineCall(reason: 'media-denied');
      _showError('Allow microphone access to answer the chat call.');
    }
  }

  Future<void> _handleCallAccepted(Map<String, dynamic> payload) async {
    final call = _activeCall;
    if (call == null || !_callMatches(payload)) return;

    final remoteUserId = payload['fromUserId']?.toString();
    if (remoteUserId == null || remoteUserId.isEmpty) return;

    try {
      final connectedCall = {
        ...call,
        'status': 'connecting',
        'remoteUserId': remoteUserId,
        'targetUserIds': [remoteUserId],
      };
      if (mounted) {
        _cancelCallTimeout();
        setState(() {
          _activeCall = connectedCall;
          _callStatus = 'Connecting media';
        });
      }

      await _prepareLocalStream(video: call['mode'] == 'video');
      final peerConnection = await _createPeerConnection(remoteUserId);
      final offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      final localDescription = await peerConnection.getLocalDescription();

      _chatSocket?.emit('chat:call:offer', {
        'callId': call['callId'],
        'conversationId': call['conversationId'],
        'toUserId': remoteUserId,
        'description': _localDescriptionMap(localDescription),
      });
      unawaited(_sendCallConnectedMessage(call));
    } catch (_) {
      _finishCall();
      _showError('Could not start chat call media.');
    }
  }

  Future<void> _handleRemoteOffer(Map<String, dynamic> payload) async {
    final call = _activeCall;
    final description = _descriptionFromPayload(payload);
    final fromUserId = payload['fromUserId']?.toString();
    if (call == null ||
        !_callMatches(payload) ||
        description == null ||
        fromUserId == null) {
      return;
    }

    try {
      await _prepareLocalStream(video: call['mode'] == 'video');
      final peerConnection = await _createPeerConnection(fromUserId);
      await peerConnection.setRemoteDescription(description);
      final answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      final localDescription = await peerConnection.getLocalDescription();

      _chatSocket?.emit('chat:call:answer', {
        'callId': call['callId'],
        'conversationId': call['conversationId'],
        'toUserId': fromUserId,
        'description': _localDescriptionMap(localDescription),
      });
      if (mounted) {
        _cancelCallTimeout();
        setState(() {
          _activeCall = {...call, 'status': 'active'};
          _callStatus = 'Connected';
        });
      }
    } catch (_) {
      _finishCall();
      _showError('Could not answer chat call media.');
    }
  }

  Future<void> _handleRemoteAnswer(Map<String, dynamic> payload) async {
    final call = _activeCall;
    final description = _descriptionFromPayload(payload);
    if (call == null ||
        !_callMatches(payload) ||
        description == null ||
        _peerConnection == null) {
      return;
    }

    try {
      await _peerConnection!.setRemoteDescription(description);
      if (mounted) {
        _cancelCallTimeout();
        setState(() {
          _activeCall = {...call, 'status': 'active'};
          _callStatus = 'Connected';
        });
      }
    } catch (_) {
      _showError('Could not complete the chat call.');
    }
  }

  Future<void> _handleRemoteIce(Map<String, dynamic> payload) async {
    if (!_callMatches(payload)) return;
    final candidate = _candidateFromPayload(payload);
    if (candidate == null) return;

    final peerConnection = _peerConnection;
    if (peerConnection == null) {
      _queuedIceCandidates.add(candidate);
      return;
    }

    await peerConnection.addCandidate(candidate).catchError((_) {});
  }

  void _handleCallEnded(Map<String, dynamic> payload, {bool rejected = false}) {
    if (!_callMatches(payload)) return;
    _showNotice(
      rejected ? 'The chat call was declined.' : 'The chat call ended.',
    );
    _finishCall(notifyRemote: false);
  }

  void _handleCallError(Map<String, dynamic> payload) {
    if (payload['callId'] != null && !_callMatches(payload)) return;
    _showError(payload['message']?.toString() ?? 'Realtime chat call failed.');
    _finishCall(notifyRemote: false);
  }

  Future<void> _sendCallConnectedMessage(Map<String, dynamic> call) async {
    final conversationId = call['conversationId']?.toString();
    if (conversationId == null || conversationId.isEmpty) return;
    _cancelCallTimeout();
    try {
      final response = await _api.post(
        'chat/conversations/$conversationId/messages',
        data: {
          'messageType': call['mode'] == 'video' ? 'video_call' : 'voice_call',
          'body': call['mode'] == 'video'
              ? 'Video call connected'
              : 'Voice call connected',
          'call': {
            'kind': call['mode'] ?? 'voice',
            'status': 'connected',
            'platform': 'mobile',
            'requestedAt': DateTime.now().toIso8601String(),
          },
        },
      );
      final message = _dataMap(response);
      if (message.isNotEmpty) _appendMessage(message);
      unawaited(_refreshConversations(force: true));
    } catch (_) {}
  }

  void _declineCall({String reason = 'rejected'}) {
    final call = _activeCall;
    if (call != null) {
      _chatSocket?.emit('chat:call:reject', {
        'callId': call['callId'],
        'conversationId': call['conversationId'],
        'toUserId': call['remoteUserId'],
        'reason': reason,
      });
    }
    _finishCall(notifyRemote: false);
  }

  void _finishCall({bool notifyRemote = true}) {
    final call = _activeCall;
    if (notifyRemote && call != null) {
      _chatSocket?.emit('chat:call:end', {
        'callId': call['callId'],
        'conversationId': call['conversationId'],
        'targetUserIds': _stringList(call['targetUserIds']),
        'toUserId': call['remoteUserId'],
      });
    }
    _stopRingtone();
    _cancelCallTimeout();
    _closePeerConnection();
    _stopLocalStream();
    _queuedIceCandidates.clear();
    if (mounted) {
      setState(() {
        _activeCall = null;
        _callStatus = 'Idle';
        _muted = false;
      });
    }
  }

  void _closePeerConnection() {
    final peerConnection = _peerConnection;
    _peerConnection = null;
    unawaited(peerConnection?.close() ?? Future<void>.value());
    unawaited(peerConnection?.dispose() ?? Future<void>.value());
    _remoteStream = null;
    if (_renderersReady) _remoteVideoRenderer.srcObject = null;
  }

  void _stopLocalStream() {
    _localStream?.getTracks().forEach((track) => track.stop());
    _localStream = null;
    if (_renderersReady) _localVideoRenderer.srcObject = null;
  }

  void _toggleMute() {
    final nextMuted = !_muted;
    _localStream?.getAudioTracks().forEach(
      (track) => track.enabled = !nextMuted,
    );
    setState(() => _muted = nextMuted);
  }

  void _playRingtone() {
    _ringtoneTimer?.cancel();
    unawaited(
      _voiceChannel.invokeMethod('playChatRingtone').catchError((_) {
        SystemSound.play(SystemSoundType.alert);
        _ringtoneTimer = Timer.periodic(const Duration(seconds: 2), (_) {
          SystemSound.play(SystemSoundType.alert);
        });
        return null;
      }),
    );
  }

  void _stopRingtone() {
    _ringtoneTimer?.cancel();
    _ringtoneTimer = null;
    unawaited(
      _voiceChannel.invokeMethod('stopChatRingtone').catchError((_) => null),
    );
  }

  void _playMessageTone() {
    unawaited(HapticFeedback.selectionClick());
    unawaited(
      _voiceChannel.invokeMethod('playChatNotificationTone').catchError((_) {
        SystemSound.play(SystemSoundType.click);
        return null;
      }),
    );
  }

  Map<String, dynamic>? get _selectedConversation {
    final id = _selectedConversationId;
    if (id == null) return null;
    for (final conversation in _conversations) {
      if (conversation['id'] == id) return conversation;
    }
    return null;
  }

  String _displayName(Map<String, dynamic>? user) {
    if (user == null) return 'Unknown';
    final name = user['name']?.toString().trim();
    if (name != null && name.isNotEmpty) return name;
    final email = user['email']?.toString().trim();
    if (email != null && email.isNotEmpty) return email;
    final phone = user['phone']?.toString().trim();
    if (phone != null && phone.isNotEmpty) return phone;
    return 'Unknown';
  }

  Map<String, dynamic>? _otherParticipant(Map<String, dynamic>? conversation) {
    final currentId = _currentUser?['id']?.toString();
    final participants = conversation?['participants'];
    if (participants is! List) return null;
    for (final participant in participants.whereType<Map>()) {
      final user = participant['user'];
      if (user is Map && user['id']?.toString() != currentId) {
        return Map<String, dynamic>.from(user);
      }
    }
    if (participants.isNotEmpty) {
      final first = participants.first;
      if (first is Map && first['user'] is Map) {
        return Map<String, dynamic>.from(first['user']);
      }
    }
    return null;
  }

  String _conversationTitle(Map<String, dynamic>? conversation) {
    if (conversation == null) return 'Chat';
    final title = conversation['title']?.toString().trim();
    if (title != null && title.isNotEmpty) return title;
    final type = conversation['type']?.toString();
    if (type == 'group') return 'Group Chat';
    if (type == 'broadcast') return 'Broadcast List';
    return _displayName(_otherParticipant(conversation));
  }

  String _presenceText(Map<String, dynamic>? user) {
    if (user == null || user['chatPresenceHidden'] == true) return '';
    if (user['chatOnline'] == true) return 'Online';
    final lastSeen = DateTime.tryParse(
      user['chatLastSeenAt']?.toString() ?? '',
    )?.toLocal();
    if (lastSeen == null) return 'Offline';
    return 'Last seen ${DateFormat('MMM d, h:mm a').format(lastSeen)}';
  }

  bool _isOnline(Map<String, dynamic>? user) {
    return user != null &&
        user['chatPresenceHidden'] != true &&
        user['chatOnline'] == true;
  }

  String _userUidLabel(Map<String, dynamic>? user) {
    final uid = user?['displayUserId']?.toString();
    if (uid != null && uid.trim().isNotEmpty) return 'UID$uid';
    final id = user?['id']?.toString();
    if (id != null && id.trim().isNotEmpty) return id;
    return '';
  }

  String? _profileImageUrl(Map<String, dynamic>? user) {
    final value = user?['imagePath']?.toString().trim();
    if (value == null || value.isEmpty) return null;
    return _absoluteFileUrl(value);
  }

  String _messageReceiptState(Map<String, dynamic> message) {
    final currentId = _currentUser?['id']?.toString();
    if (message['senderId']?.toString() != currentId) return 'none';
    final receipts = message['receipts'];
    if (receipts is! Map) return 'sent';
    final recipientCount =
        int.tryParse(receipts['recipientCount']?.toString() ?? '') ?? 0;
    final readCount =
        int.tryParse(receipts['readCount']?.toString() ?? '') ?? 0;
    final deliveredCount =
        int.tryParse(receipts['deliveredCount']?.toString() ?? '') ?? 0;
    if (recipientCount > 0 && readCount >= recipientCount) return 'read';
    if (recipientCount > 0 && deliveredCount >= recipientCount) {
      return 'delivered';
    }
    return 'sent';
  }

  String _messagePreview(Map<String, dynamic>? message) {
    if (message == null) return 'No messages yet';
    final body = message['body']?.toString().trim();
    final type = message['messageType']?.toString() ?? '';
    if (type == 'emoji') return 'Emoji';
    if (type.contains('call')) {
      return body?.isNotEmpty == true ? body! : 'Call invite';
    }
    if (body != null && body.isNotEmpty) return body;
    final attachments = _mapList(message['attachments']);
    if (attachments.isNotEmpty) {
      return attachments.first['name']?.toString() ?? 'Attachment';
    }
    if (type == 'image') return 'Image';
    if (type == 'video') return 'Video';
    if (type == 'audio') return 'Voice message';
    if (type == 'location') return 'Location';
    return 'Message';
  }

  String _initials(String value) {
    final parts = value.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return '${parts.first.characters.first}${parts.last.characters.first}'
        .toUpperCase();
  }

  String _time(dynamic value) {
    final date = DateTime.tryParse(value?.toString() ?? '')?.toLocal();
    if (date == null) return '';
    final now = DateTime.now();
    final sameDay =
        date.year == now.year && date.month == now.month && date.day == now.day;
    return DateFormat(sameDay ? 'h:mm a' : 'MMM d').format(date);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_messagesController.hasClients) return;
      _messagesController.animateTo(
        _messagesController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  void _showError(String message) {
    if (!mounted) return;
    Get.snackbar(
      'Chat',
      message.replaceFirst('Exception: ', ''),
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: AppColors.appSurface,
      colorText: AppColors.appTextPrimary,
      margin: const EdgeInsets.all(12),
    );
  }

  void _showNotice(String message) {
    if (!mounted) return;
    Get.snackbar(
      'Chat',
      tr(message),
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: AppColors.appSurface,
      colorText: AppColors.appTextPrimary,
      margin: const EdgeInsets.all(12),
    );
  }

  void _showAttachmentSheet() {
    if (_selectedConversationId == null) return;
    Get.bottomSheet(
      Container(
        padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.2.h),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          border: Border(top: BorderSide(color: AppColors.appBorder)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 12.w,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.appBorder,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              SizedBox(height: 1.8.h),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                runSpacing: 18,
                children: [
                  _ShareAction(
                    icon: Icons.image_outlined,
                    label: 'Photo',
                    color: const Color(0xFF67E8F9),
                    onTap: () {
                      Get.back();
                      _pickAndSendMedia(ImageSource.gallery, video: false);
                    },
                  ),
                  _ShareAction(
                    icon: Icons.movie_creation_outlined,
                    label: 'Video',
                    color: const Color(0xFF93C5FD),
                    onTap: () {
                      Get.back();
                      _pickAndSendMedia(ImageSource.gallery, video: true);
                    },
                  ),
                  _ShareAction(
                    icon: Icons.photo_camera_outlined,
                    label: 'Camera',
                    color: const Color(0xFFA7F3D0),
                    onTap: () {
                      Get.back();
                      _pickAndSendMedia(ImageSource.camera, video: false);
                    },
                  ),
                  _ShareAction(
                    icon: Icons.video_camera_back_outlined,
                    label: 'Record Video',
                    color: const Color(0xFFF0ABFC),
                    onTap: () {
                      Get.back();
                      _pickAndSendMedia(ImageSource.camera, video: true);
                    },
                  ),
                  _ShareAction(
                    icon: Icons.location_on_outlined,
                    label: 'Location',
                    color: const Color(0xFFFCA5A5),
                    onTap: () {
                      Get.back();
                      unawaited(_shareLocation());
                    },
                  ),
                  _ShareAction(
                    icon: Icons.contact_phone_outlined,
                    label: 'Contact',
                    color: const Color(0xFFFDE68A),
                    onTap: () {
                      Get.back();
                      unawaited(_shareContact());
                    },
                  ),
                  _ShareAction(
                    icon: Icons.poll_outlined,
                    label: 'Poll',
                    color: const Color(0xFFC4B5FD),
                    onTap: () {
                      Get.back();
                      unawaited(_createPoll());
                    },
                  ),
                  _ShareAction(
                    icon: Icons.event_outlined,
                    label: 'Event',
                    color: const Color(0xFF86EFAC),
                    onTap: () {
                      Get.back();
                      unawaited(_shareEvent());
                    },
                  ),
                  _ShareAction(
                    icon: Icons.auto_awesome_outlined,
                    label: 'AI',
                    color: const Color(0xFF7DDDEC),
                    onTap: () {
                      Get.back();
                      unawaited(_askAi());
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
    );
  }

  String _fileSizeLabel(num? bytes) {
    final value = (bytes ?? 0).toDouble();
    if (value <= 0) return 'Unknown size';
    if (value >= 1024 * 1024 * 1024) {
      return '${(value / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
    }
    if (value >= 1024 * 1024) {
      return '${(value / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (value >= 1024) return '${(value / 1024).toStringAsFixed(1)} KB';
    return '${value.toStringAsFixed(0)} B';
  }

  Widget _sheetHandle() {
    return Center(
      child: Container(
        width: 12.w,
        height: 4,
        decoration: BoxDecoration(
          color: AppColors.appBorder,
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }

  Widget _sheetTitle(IconData icon, String title, {String? subtitle}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: const Color(0xFF7DDDEC).withOpacity(0.12),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: const Color(0xFF7DDDEC)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                tr(title),
                style: TextStyle(
                  color: AppColors.appTextPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 3),
                Text(
                  tr(subtitle),
                  style: TextStyle(
                    color: AppColors.appTextSecondary,
                    fontSize: 12.5,
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _profileAvatarPreview(
    XFile? selectedImage,
    Map<String, dynamic>? user,
  ) {
    final imageUrl = selectedImage == null ? _profileImageUrl(user) : null;
    final name = selectedImage?.name ?? _displayName(user);
    return ClipOval(
      child: SizedBox(
        width: 92,
        height: 92,
        child: selectedImage != null
            ? Image.file(File(selectedImage.path), fit: BoxFit.cover)
            : imageUrl != null
            ? Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _profileInitials(name),
              )
            : _profileInitials(name),
      ),
    );
  }

  Widget _profileInitials(String name) {
    return Container(
      color: AppColors.appSurfaceSoft,
      alignment: Alignment.center,
      child: Text(
        _initials(name),
        style: TextStyle(
          color: AppColors.appTextPrimary,
          fontSize: 24,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Future<void> _openProfileSettings() async {
    final nameController = TextEditingController(
      text: _currentUser?['name']?.toString() ?? '',
    );
    final aboutController = TextEditingController(
      text: _currentUser?['chatProfileAbout']?.toString() ?? '',
    );
    XFile? selectedImage;
    var saving = false;

    await Get.bottomSheet<void>(
      StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            constraints: BoxConstraints(maxHeight: 88.h),
            padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.2.h),
            decoration: BoxDecoration(
              color: AppColors.appSurface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(22),
              ),
              border: Border(top: BorderSide(color: AppColors.appBorder)),
            ),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _sheetHandle(),
                    SizedBox(height: 1.6.h),
                    _sheetTitle(
                      Icons.person_rounded,
                      'Profile',
                      subtitle:
                          'Change your Premium Chat name, about, and photo.',
                    ),
                    SizedBox(height: 2.h),
                    Center(
                      child: Stack(
                        children: [
                          _profileAvatarPreview(selectedImage, _currentUser),
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: IconButton.filled(
                              onPressed: saving
                                  ? null
                                  : () async {
                                      final image = await _imagePicker
                                          .pickImage(
                                            source: ImageSource.gallery,
                                            imageQuality: 88,
                                          );
                                      if (image != null) {
                                        setSheetState(
                                          () => selectedImage = image,
                                        );
                                      }
                                    },
                              style: IconButton.styleFrom(
                                backgroundColor: const Color(0xFF7DDDEC),
                                foregroundColor: const Color(0xFF06101F),
                              ),
                              icon: const Icon(Icons.photo_camera_rounded),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 2.h),
                    TextField(
                      controller: nameController,
                      style: TextStyle(color: AppColors.appTextPrimary),
                      decoration: _dialogFieldDecoration('Name'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: aboutController,
                      minLines: 2,
                      maxLines: 4,
                      style: TextStyle(color: AppColors.appTextPrimary),
                      decoration: _dialogFieldDecoration('About'),
                    ),
                    SizedBox(height: 2.h),
                    FilledButton.icon(
                      onPressed: saving
                          ? null
                          : () async {
                              final name = nameController.text.trim();
                              if (name.isEmpty) {
                                _showError('Name is required.');
                                return;
                              }

                              setSheetState(() => saving = true);
                              try {
                                final formData = dio.FormData.fromMap({
                                  'name': name,
                                  'about': aboutController.text.trim(),
                                });
                                if (selectedImage != null) {
                                  formData.files.add(
                                    MapEntry(
                                      'profileImage',
                                      await dio.MultipartFile.fromFile(
                                        selectedImage!.path,
                                        filename: selectedImage!.name,
                                      ),
                                    ),
                                  );
                                }

                                final response = await _api.put(
                                  'chat/profile',
                                  data: formData,
                                );
                                final updatedUser = _dataMap(response);
                                if (mounted && updatedUser.isNotEmpty) {
                                  setState(() => _currentUser = updatedUser);
                                }
                                _showNotice('Profile updated.');
                                unawaited(_refreshConversations(force: true));
                                Get.back();
                              } catch (error) {
                                _showError(error.toString());
                              } finally {
                                if (mounted) {
                                  setSheetState(() => saving = false);
                                }
                              }
                            },
                      icon: saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save_rounded),
                      label: Text(tr('Save Profile')),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
    );

    nameController.dispose();
    aboutController.dispose();
  }

  Future<void> _showChangePasswordDialog() async {
    final currentController = TextEditingController();
    final newController = TextEditingController();
    final confirmController = TextEditingController();
    var saving = false;

    await showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: AppColors.appSurface,
            title: Text(
              tr('Security'),
              style: TextStyle(
                color: AppColors.appTextPrimary,
                fontWeight: FontWeight.w900,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: currentController,
                  obscureText: true,
                  style: TextStyle(color: AppColors.appTextPrimary),
                  decoration: _dialogFieldDecoration('Current password'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: newController,
                  obscureText: true,
                  style: TextStyle(color: AppColors.appTextPrimary),
                  decoration: _dialogFieldDecoration('New password'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: confirmController,
                  obscureText: true,
                  style: TextStyle(color: AppColors.appTextPrimary),
                  decoration: _dialogFieldDecoration('Confirm password'),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: saving ? null : () => Navigator.of(context).pop(),
                child: Text(tr('Cancel')),
              ),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        setDialogState(() => saving = true);
                        try {
                          await _api.post(
                            'auth/change-password',
                            data: {
                              'currentPassword': currentController.text,
                              'newPassword': newController.text,
                              'confirmPassword': confirmController.text,
                            },
                          );
                          _showNotice('Password changed.');
                          Navigator.of(context).pop();
                        } catch (error) {
                          _showError(error.toString());
                        } finally {
                          if (mounted) {
                            setDialogState(() => saving = false);
                          }
                        }
                      },
                child: Text(tr('Save')),
              ),
            ],
          );
        },
      ),
    );

    currentController.dispose();
    newController.dispose();
    confirmController.dispose();
  }

  Future<Map<String, dynamic>> _loadSecuritySettings() async {
    final response = await _api.get('security');
    final data = _dataMap(response);
    return data['settings'] is Map
        ? Map<String, dynamic>.from(data['settings'])
        : <String, dynamic>{};
  }

  void _openTwoFactorSheet() {
    final codeController = TextEditingController();
    Map<String, dynamic> settings = {};
    String? qrCodeDataUrl;
    String? secret;
    var loading = true;
    var saving = false;
    var requested = false;

    Future<void> load(void Function(void Function()) setSheetState) async {
      try {
        final loaded = await _loadSecuritySettings();
        setSheetState(() {
          settings = loaded;
          loading = false;
        });
      } catch (error) {
        setSheetState(() => loading = false);
        _showError(error.toString());
      }
    }

    Get.bottomSheet<void>(
      StatefulBuilder(
        builder: (context, setSheetState) {
          if (!requested) {
            requested = true;
            unawaited(load(setSheetState));
          }

          final enabled = settings['twoFactorEnabled'] == true;
          final configured = settings['authenticatorConfigured'] == true;
          final qrPayload = qrCodeDataUrl?.contains(',') == true
              ? qrCodeDataUrl!.split(',').last
              : null;

          return Container(
            constraints: BoxConstraints(maxHeight: 86.h),
            padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.2.h),
            decoration: BoxDecoration(
              color: AppColors.appSurface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(22),
              ),
              border: Border(top: BorderSide(color: AppColors.appBorder)),
            ),
            child: SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _sheetHandle(),
                    SizedBox(height: 1.6.h),
                    _sheetTitle(
                      Icons.verified_user_rounded,
                      '2FA',
                      subtitle: enabled
                          ? 'Authenticator verification is enabled.'
                          : 'Use an authenticator app to protect sign in.',
                    ),
                    SizedBox(height: 1.6.h),
                    if (loading)
                      const Center(child: CircularProgressIndicator())
                    else ...[
                      _StatusPill(
                        icon: enabled
                            ? Icons.lock_rounded
                            : Icons.lock_open_rounded,
                        label: enabled
                            ? 'Enabled'
                            : configured
                            ? 'Configured but disabled'
                            : 'Not enabled',
                        color: enabled
                            ? const Color(0xFF22C55E)
                            : AppColors.appTextSecondary,
                      ),
                      const SizedBox(height: 14),
                      if (qrPayload != null)
                        Center(
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Image.memory(
                              base64Decode(qrPayload),
                              width: 180,
                              height: 180,
                            ),
                          ),
                        ),
                      if (secret != null) ...[
                        const SizedBox(height: 12),
                        SelectableText(
                          secret!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.appTextPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                      if (!enabled) ...[
                        const SizedBox(height: 14),
                        if (secret == null)
                          OutlinedButton.icon(
                            onPressed: saving
                                ? null
                                : () async {
                                    setSheetState(() => saving = true);
                                    try {
                                      final response = await _api.post(
                                        'security/totp/setup',
                                      );
                                      final data = _dataMap(response);
                                      setSheetState(() {
                                        secret = data['secret']?.toString();
                                        qrCodeDataUrl = data['qrCodeDataUrl']
                                            ?.toString();
                                      });
                                    } catch (error) {
                                      _showError(error.toString());
                                    } finally {
                                      if (mounted) {
                                        setSheetState(() => saving = false);
                                      }
                                    }
                                  },
                            icon: const Icon(Icons.qr_code_rounded),
                            label: Text(tr('Setup Authenticator')),
                          ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: codeController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: AppColors.appTextPrimary),
                          decoration: _dialogFieldDecoration(
                            'Authenticator code',
                          ),
                        ),
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: saving
                              ? null
                              : () async {
                                  setSheetState(() => saving = true);
                                  try {
                                    await _api.post(
                                      'security/totp/verify',
                                      data: {
                                        'code': codeController.text.trim(),
                                      },
                                    );
                                    final loaded =
                                        await _loadSecuritySettings();
                                    setSheetState(() {
                                      settings = loaded;
                                      secret = null;
                                      qrCodeDataUrl = null;
                                    });
                                    _showNotice('2FA enabled.');
                                  } catch (error) {
                                    _showError(error.toString());
                                  } finally {
                                    if (mounted) {
                                      setSheetState(() => saving = false);
                                    }
                                  }
                                },
                          icon: const Icon(Icons.check_circle_rounded),
                          label: Text(tr('Verify And Enable')),
                        ),
                      ] else ...[
                        const SizedBox(height: 14),
                        OutlinedButton.icon(
                          onPressed: saving
                              ? null
                              : () async {
                                  setSheetState(() => saving = true);
                                  try {
                                    await _api.post('security/totp/disable');
                                    final loaded =
                                        await _loadSecuritySettings();
                                    setSheetState(() => settings = loaded);
                                    _showNotice('2FA disabled.');
                                  } catch (error) {
                                    _showError(error.toString());
                                  } finally {
                                    if (mounted) {
                                      setSheetState(() => saving = false);
                                    }
                                  }
                                },
                          icon: const Icon(Icons.lock_open_rounded),
                          label: Text(tr('Disable 2FA')),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
    ).whenComplete(codeController.dispose);
  }

  void _openAccountSettings() {
    final email = _currentUser?['email']?.toString() ?? '';
    Get.bottomSheet<void>(
      Container(
        constraints: BoxConstraints(maxHeight: 82.h),
        padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.2.h),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
          border: Border(top: BorderSide(color: AppColors.appBorder)),
        ),
        child: SafeArea(
          top: false,
          child: ListView(
            shrinkWrap: true,
            children: [
              _sheetHandle(),
              SizedBox(height: 1.6.h),
              _sheetTitle(
                Icons.account_circle_rounded,
                'Account',
                subtitle: 'Manage sign in and account protection.',
              ),
              SizedBox(height: 1.6.h),
              _SettingsRow(
                icon: Icons.email_rounded,
                label: email.isEmpty ? 'Email' : email,
                onTap: email.isEmpty
                    ? () {}
                    : () async {
                        await Clipboard.setData(ClipboardData(text: email));
                        _showNotice('Email copied.');
                      },
              ),
              _SettingsRow(
                icon: Icons.security_rounded,
                label: 'Security',
                onTap: () => unawaited(_showChangePasswordDialog()),
              ),
              _SettingsRow(
                icon: Icons.key_rounded,
                label: 'Passkeys',
                onTap: () => _showNotice(
                  'Passkeys are visible here, but server passkey registration is not configured yet.',
                ),
              ),
              _SettingsRow(
                icon: Icons.verified_user_rounded,
                label: '2FA',
                onTap: _openTwoFactorSheet,
              ),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
    );
  }

  void _openStorageSettings() {
    var loading = true;
    var requested = false;
    var mediaMessages = <Map<String, dynamic>>[];
    final deleting = <String>{};

    List<Map<String, dynamic>> mediaFiles(Map<String, dynamic> message) {
      return _mapList(message['attachments']).where((file) {
        final type = file['type']?.toString() ?? '';
        return type.startsWith('image/') || type.startsWith('video/');
      }).toList();
    }

    Future<void> load(void Function(void Function()) setSheetState) async {
      try {
        final response = await _api.get('chat/storage');
        final data = response is Map ? response['data'] : response;
        setSheetState(() {
          mediaMessages = _mapList(data);
          loading = false;
        });
      } catch (error) {
        setSheetState(() => loading = false);
        _showError(error.toString());
      }
    }

    Get.bottomSheet<void>(
      StatefulBuilder(
        builder: (context, setSheetState) {
          if (!requested) {
            requested = true;
            unawaited(load(setSheetState));
          }

          final files = mediaMessages
              .expand(
                (message) => mediaFiles(
                  message,
                ).map((file) => {'message': message, 'file': file}),
              )
              .toList();
          final totalBytes = files.fold<num>(0, (sum, item) {
            final file = item['file'] as Map<String, dynamic>;
            return sum + (num.tryParse(file['size']?.toString() ?? '') ?? 0);
          });

          return Container(
            constraints: BoxConstraints(maxHeight: 88.h),
            padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.2.h),
            decoration: BoxDecoration(
              color: AppColors.appSurface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(22),
              ),
              border: Border(top: BorderSide(color: AppColors.appBorder)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _sheetHandle(),
                  SizedBox(height: 1.6.h),
                  _sheetTitle(
                    Icons.storage_rounded,
                    'Storage',
                    subtitle:
                        '${files.length} media files using ${_fileSizeLabel(totalBytes)}',
                  ),
                  SizedBox(height: 1.4.h),
                  Expanded(
                    child: loading
                        ? const Center(child: CircularProgressIndicator())
                        : files.isEmpty
                        ? _emptyState(
                            icon: Icons.photo_library_outlined,
                            title: 'No media stored',
                            subtitle:
                                'Images and videos from Premium Chat will appear here.',
                          )
                        : ListView.builder(
                            itemCount: files.length,
                            itemBuilder: (context, index) {
                              final message =
                                  files[index]['message']
                                      as Map<String, dynamic>;
                              final file =
                                  files[index]['file'] as Map<String, dynamic>;
                              final messageId = message['id']?.toString() ?? '';
                              final own =
                                  message['senderId']?.toString() ==
                                  _currentUser?['id']?.toString();
                              final type = file['type']?.toString() ?? '';
                              final url = file['url']?.toString();
                              final isImage =
                                  type.startsWith('image/') && url != null;
                              final title =
                                  file['name']?.toString() ??
                                  (type.startsWith('video/')
                                      ? 'Video'
                                      : 'Image');

                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.appSurfaceAlt,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: AppColors.appBorder,
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  leading: ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: SizedBox(
                                      width: 54,
                                      height: 54,
                                      child: isImage
                                          ? Image.network(
                                              _absoluteFileUrl(url),
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  Icon(
                                                    Icons.image_rounded,
                                                    color:
                                                        AppColors.primaryColor,
                                                  ),
                                            )
                                          : Container(
                                              color: AppColors.appSurfaceSoft,
                                              child: Icon(
                                                Icons.videocam_rounded,
                                                color: AppColors.primaryColor,
                                              ),
                                            ),
                                    ),
                                  ),
                                  title: Text(
                                    title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: AppColors.appTextPrimary,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${message['senderName'] ?? 'User'} - ${_fileSizeLabel(num.tryParse(file['size']?.toString() ?? ''))}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: AppColors.appTextSecondary,
                                    ),
                                  ),
                                  trailing: own
                                      ? IconButton(
                                          onPressed:
                                              deleting.contains(messageId)
                                              ? null
                                              : () async {
                                                  setSheetState(
                                                    () =>
                                                        deleting.add(messageId),
                                                  );
                                                  try {
                                                    await _api.delete(
                                                      'chat/storage/messages/$messageId',
                                                    );
                                                    setSheetState(
                                                      () => mediaMessages
                                                          .removeWhere(
                                                            (item) =>
                                                                item['id']
                                                                    ?.toString() ==
                                                                messageId,
                                                          ),
                                                    );
                                                    if (mounted) {
                                                      setState(
                                                        () => _messages.removeWhere(
                                                          (item) =>
                                                              item['id']
                                                                  ?.toString() ==
                                                              messageId,
                                                        ),
                                                      );
                                                    }
                                                    _showNotice(
                                                      'Media deleted.',
                                                    );
                                                    unawaited(
                                                      _refreshConversations(
                                                        force: true,
                                                      ),
                                                    );
                                                  } catch (error) {
                                                    _showError(
                                                      error.toString(),
                                                    );
                                                  } finally {
                                                    setSheetState(
                                                      () => deleting.remove(
                                                        messageId,
                                                      ),
                                                    );
                                                  }
                                                },
                                          icon: Icon(
                                            Icons.delete_outline_rounded,
                                            color: const Color(0xFFFCA5A5),
                                          ),
                                        )
                                      : Icon(
                                          Icons.lock_outline_rounded,
                                          color: AppColors.appTextSecondary,
                                        ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
    );
  }

  void _openBroadcastBuilder() {
    final titleController = TextEditingController();
    final messageController = TextEditingController();
    final linkController = TextEditingController();
    final searchController = TextEditingController();
    final selectedUsers = <Map<String, dynamic>>[];
    var results = <Map<String, dynamic>>[];
    var searching = false;
    var sending = false;
    var mediaIsVideo = false;
    XFile? mediaFile;
    Timer? debounce;

    Future<void> runSearch(
      String value,
      void Function(void Function()) setSheetState,
    ) async {
      debounce?.cancel();
      final query = value.trim();
      if (query.length < 3) {
        setSheetState(() => results = []);
        return;
      }

      debounce = Timer(const Duration(milliseconds: 320), () async {
        setSheetState(() => searching = true);
        try {
          final response = await _api.get(
            'chat/users',
            query: {'search': query},
          );
          final data = response is Map ? response['data'] : null;
          setSheetState(() => results = _mapList(data));
        } catch (error) {
          _showError(error.toString());
        } finally {
          if (mounted) setSheetState(() => searching = false);
        }
      });
    }

    Future<void> sendBroadcast(
      void Function(void Function()) setSheetState,
    ) async {
      final participantIds = selectedUsers
          .map((user) => user['id']?.toString() ?? '')
          .where((id) => id.isNotEmpty)
          .toList();
      final title = titleController.text.trim();
      final message = messageController.text.trim();
      final link = linkController.text.trim();

      if (participantIds.isEmpty) {
        _showError('Add at least one contact.');
        return;
      }
      if (title.isEmpty &&
          message.isEmpty &&
          link.isEmpty &&
          mediaFile == null) {
        _showError('Add ad text, a link, or media.');
        return;
      }

      setSheetState(() => sending = true);
      try {
        final createResponse = await _api.post(
          'chat/conversations',
          data: {
            'type': 'broadcast',
            'title': title.isEmpty ? 'Broadcast Ad' : title,
            'participantIds': participantIds,
          },
        );
        final data = _dataMap(createResponse);
        final conversationId = data['conversationId']?.toString();
        final conversations = _mapList(data['conversations']);
        if (conversationId == null || conversationId.isEmpty) {
          _showError('Could not create broadcast.');
          return;
        }

        final files = mediaFile == null
            ? <Map<String, dynamic>>[]
            : await _uploadChatFiles([mediaFile!]);
        final body = [
          if (title.isNotEmpty) title,
          if (message.isNotEmpty) message,
          if (link.isNotEmpty) 'Link: $link',
        ].join('\n');

        await _api.post(
          'chat/conversations/$conversationId/messages',
          data: {
            'messageType': files.isEmpty ? 'broadcast' : _attachmentKind(files),
            'body': body,
            if (files.isNotEmpty) 'attachments': files,
            'metadata': {
              'broadcastAd': true,
              'adTitle': title,
              'adLink': link,
              'mediaKind': mediaFile == null
                  ? null
                  : mediaIsVideo
                  ? 'video'
                  : 'image',
              'recipientCount': participantIds.length,
            },
          },
        );

        if (mounted && conversations.isNotEmpty) {
          setState(() {
            _conversations = conversations;
            _homeTab = _PremiumChatTab.chats;
          });
        }
        _showNotice('Broadcast ad sent.');
        Get.back();
      } catch (error) {
        _showError(error.toString());
      } finally {
        if (mounted) setSheetState(() => sending = false);
      }
    }

    Get.bottomSheet<void>(
      StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            constraints: BoxConstraints(maxHeight: 92.h),
            padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 2.2.h),
            decoration: BoxDecoration(
              color: AppColors.appSurface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(22),
              ),
              border: Border(top: BorderSide(color: AppColors.appBorder)),
            ),
            child: SafeArea(
              top: false,
              child: ListView(
                children: [
                  _sheetHandle(),
                  SizedBox(height: 1.6.h),
                  _sheetTitle(
                    Icons.cell_tower_rounded,
                    'Broadcast',
                    subtitle:
                        'Send one-click product ads, links, images, or videos to selected contacts.',
                  ),
                  SizedBox(height: 1.4.h),
                  TextField(
                    controller: titleController,
                    style: TextStyle(color: AppColors.appTextPrimary),
                    decoration: _dialogFieldDecoration('Product or ad title'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: messageController,
                    minLines: 2,
                    maxLines: 4,
                    style: TextStyle(color: AppColors.appTextPrimary),
                    decoration: _dialogFieldDecoration('Advertising message'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: linkController,
                    keyboardType: TextInputType.url,
                    style: TextStyle(color: AppColors.appTextPrimary),
                    decoration: _dialogFieldDecoration('Product link'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: sending
                              ? null
                              : () async {
                                  final picked = await _imagePicker.pickImage(
                                    source: ImageSource.gallery,
                                    imageQuality: 90,
                                  );
                                  if (picked != null) {
                                    setSheetState(() {
                                      mediaFile = picked;
                                      mediaIsVideo = false;
                                    });
                                  }
                                },
                          icon: const Icon(Icons.image_rounded),
                          label: Text(tr('Image Ad')),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: sending
                              ? null
                              : () async {
                                  final picked = await _imagePicker.pickVideo(
                                    source: ImageSource.gallery,
                                  );
                                  if (picked != null) {
                                    setSheetState(() {
                                      mediaFile = picked;
                                      mediaIsVideo = true;
                                    });
                                  }
                                },
                          icon: const Icon(Icons.videocam_rounded),
                          label: Text(tr('Video Ad')),
                        ),
                      ),
                    ],
                  ),
                  if (mediaFile != null) ...[
                    const SizedBox(height: 8),
                    _StatusPill(
                      icon: mediaIsVideo
                          ? Icons.videocam_rounded
                          : Icons.image_rounded,
                      label: mediaFile!.name,
                      color: const Color(0xFF7DDDEC),
                    ),
                  ],
                  const SizedBox(height: 14),
                  TextField(
                    controller: searchController,
                    onChanged: (value) => runSearch(value, setSheetState),
                    style: TextStyle(color: AppColors.appTextPrimary),
                    decoration:
                        _dialogFieldDecoration(
                          'Search contacts by email, phone, name, or UID',
                        ).copyWith(
                          prefixIcon: Icon(
                            Icons.search_rounded,
                            color: AppColors.appTextSecondary,
                          ),
                        ),
                  ),
                  if (selectedUsers.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: selectedUsers
                          .map(
                            (user) => Chip(
                              backgroundColor: AppColors.appSurfaceAlt,
                              side: BorderSide(color: AppColors.appBorder),
                              label: Text(
                                _displayName(user),
                                style: TextStyle(
                                  color: AppColors.appTextPrimary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              deleteIconColor: AppColors.appTextSecondary,
                              onDeleted: () => setSheetState(
                                () => selectedUsers.removeWhere(
                                  (item) =>
                                      item['id']?.toString() ==
                                      user['id']?.toString(),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                  if (searching)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  if (results.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    ...results.map((user) {
                      final alreadySelected = selectedUsers.any(
                        (item) =>
                            item['id']?.toString() == user['id']?.toString(),
                      );
                      return _ForwardTargetTile(
                        title: _displayName(user),
                        subtitle: user['email']?.toString() ?? '',
                        initials: _initials(_displayName(user)),
                        onTap: alreadySelected
                            ? () {}
                            : () => setSheetState(() {
                                selectedUsers.add(user);
                                searchController.clear();
                                results = [];
                              }),
                      );
                    }),
                  ],
                  SizedBox(height: 1.8.h),
                  FilledButton.icon(
                    onPressed: sending
                        ? null
                        : () => unawaited(sendBroadcast(setSheetState)),
                    icon: sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.campaign_rounded),
                    label: Text(tr('Send Broadcast Ad')),
                  ),
                ],
              ),
            ),
          );
        },
      ),
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
    ).whenComplete(() {
      debounce?.cancel();
      titleController.dispose();
      messageController.dispose();
      linkController.dispose();
      searchController.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    final selectedConversation = _selectedConversation;
    final selectedOther = _otherParticipant(selectedConversation);
    return WillPopScope(
      onWillPop: () async {
        if (_selectedConversationId != null) {
          setState(() {
            _selectedConversationId = null;
            _messages = [];
          });
          return false;
        }
        return true;
      },
      child: Scaffold(
        backgroundColor: AppColors.appBackground,
        appBar: AppBar(
          backgroundColor: AppColors.appBackground,
          foregroundColor: AppColors.appTextPrimary,
          elevation: 0,
          titleSpacing: 0,
          leading: _selectedConversationId == null
              ? null
              : IconButton(
                  onPressed: () {
                    setState(() {
                      _selectedConversationId = null;
                      _messages = [];
                    });
                  },
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
          title: _selectedConversationId == null
              ? Text(tr('Chat'))
              : _ChatTitle(
                  title: _conversationTitle(selectedConversation),
                  userIdLabel: _userUidLabel(selectedOther),
                  statusText: _presenceText(selectedOther).isNotEmpty
                      ? _presenceText(selectedOther)
                      : 'Offline',
                  online: _isOnline(selectedOther),
                  initials: _initials(_conversationTitle(selectedConversation)),
                  imageUrl: _profileImageUrl(selectedOther),
                ),
          actions: [
            IconButton(
              onPressed: _loading
                  ? null
                  : () {
                      if (_selectedConversationId == null) {
                        _loadBootstrap();
                      } else {
                        _loadMessages(_selectedConversationId!);
                      }
                    },
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: Stack(
          children: [
            Positioned.fill(
              child: _loading && _conversations.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _selectedConversationId == null
                  ? _chatHome()
                  : _chatPane(),
            ),
            if (_activeCall != null) _callOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _chatHome() {
    return Column(
      children: [
        Expanded(child: _homeTabContent()),
        _mainTabBar(),
      ],
    );
  }

  Widget _mainTabBar() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(2.w, 0.7.h, 2.w, 0.8.h),
      decoration: BoxDecoration(
        color: AppColors.appBackground,
        border: Border(top: BorderSide(color: AppColors.appBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: _HomeTabButton(
                selected: _homeTab == _PremiumChatTab.calls,
                icon: Icons.call_rounded,
                label: 'Calls',
                onTap: () {
                  setState(() => _homeTab = _PremiumChatTab.calls);
                  unawaited(_loadCallHistory(silent: true));
                },
              ),
            ),
            Expanded(
              child: _HomeTabButton(
                selected: _homeTab == _PremiumChatTab.chats,
                icon: Icons.chat_bubble_rounded,
                label: 'Chats',
                onTap: () => setState(() => _homeTab = _PremiumChatTab.chats),
              ),
            ),
            Expanded(
              child: _HomeTabButton(
                selected: _homeTab == _PremiumChatTab.communities,
                icon: Icons.groups_rounded,
                label: 'Communities',
                onTap: () =>
                    setState(() => _homeTab = _PremiumChatTab.communities),
              ),
            ),
            Expanded(
              child: _HomeTabButton(
                selected: _homeTab == _PremiumChatTab.updates,
                icon: Icons.campaign_rounded,
                label: 'Updates',
                onTap: () => setState(() => _homeTab = _PremiumChatTab.updates),
              ),
            ),
            Expanded(
              child: _HomeTabButton(
                selected: _homeTab == _PremiumChatTab.you,
                icon: Icons.person_rounded,
                label: 'You',
                onTap: () => setState(() => _homeTab = _PremiumChatTab.you),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _homeTabContent() {
    switch (_homeTab) {
      case _PremiumChatTab.calls:
        return _callsList();
      case _PremiumChatTab.communities:
        return _placeholderList(
          icon: Icons.groups_rounded,
          title: 'Communities',
          subtitle: 'Community chats will appear here.',
        );
      case _PremiumChatTab.updates:
        return _placeholderList(
          icon: Icons.campaign_rounded,
          title: 'Updates',
          subtitle: 'Status and channels will appear here.',
        );
      case _PremiumChatTab.you:
        return _youList();
      case _PremiumChatTab.chats:
        return _conversationList();
    }
  }

  Widget _callsList() {
    return RefreshIndicator(
      onRefresh: () async {
        await _loadBootstrap(keepSelection: false);
        await _loadCallHistory();
      },
      child: ListView(
        padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 3.h),
        children: [
          _sectionLabel('Calls'),
          if (_loadingCallHistory && _callHistory.isEmpty)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 4.h),
              child: const Center(child: CircularProgressIndicator()),
            )
          else if (_callHistory.isEmpty)
            _emptyState(
              icon: Icons.call_rounded,
              title: 'No calls yet',
              subtitle:
                  'Outgoing, incoming, and missed calls will appear here.',
            )
          else
            ..._callHistory.map(_callHistoryTile),
        ],
      ),
    );
  }

  Widget _callHistoryTile(Map<String, dynamic> event) {
    final conversationId = event['conversationId']?.toString();
    final senderId = event['senderId']?.toString();
    final currentId = _currentUser?['id']?.toString();
    final fromMe = senderId != null && senderId == currentId;
    final otherUser = event['otherUser'] is Map
        ? Map<String, dynamic>.from(event['otherUser'])
        : null;
    final sender = <String, dynamic>{
      'name': event['senderName'],
      'email': event['senderEmail'],
      'imagePath': event['senderImagePath'],
      'displayUserId': event['senderDisplayUserId'],
    };
    final person = fromMe ? otherUser : sender;
    final title = _displayName(person);
    final type = event['messageType']?.toString() ?? 'voice_call';
    final metadata = event['metadata'] is Map
        ? Map<String, dynamic>.from(event['metadata'])
        : <String, dynamic>{};
    final call = event['call'] is Map
        ? Map<String, dynamic>.from(event['call'])
        : <String, dynamic>{};
    final status = (call['status'] ?? metadata['callStatus'] ?? '')
        .toString()
        .toLowerCase();
    final icon = type == 'video_call'
        ? Icons.videocam_rounded
        : type == 'group_call'
        ? Icons.groups_rounded
        : Icons.call_rounded;
    final direction = fromMe ? 'Outgoing' : 'Incoming';
    final label = status == 'missed'
        ? (fromMe ? 'No answer' : 'Missed call')
        : status == 'connected'
        ? 'Completed call'
        : event['body']?.toString() ?? 'Call';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: ListTile(
        onTap: conversationId == null
            ? null
            : () {
                setState(() => _selectedConversationId = conversationId);
                _joinSelectedConversation();
                _loadMessages(conversationId);
              },
        leading: CircleAvatar(
          backgroundColor: status == 'missed'
              ? const Color(0xFFEF4444).withOpacity(0.18)
              : AppColors.appSurfaceSoft,
          child: Icon(
            icon,
            color: status == 'missed'
                ? const Color(0xFFFCA5A5)
                : const Color(0xFF7DDDEC),
          ),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: AppColors.appTextPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          '$direction - $label',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: AppColors.appTextSecondary),
        ),
        trailing: Text(
          _time(event['createdAt']),
          style: TextStyle(color: AppColors.appTextSecondary, fontSize: 11),
        ),
      ),
    );
  }

  Widget _placeholderList({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return ListView(
      padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 3.h),
      children: [_emptyState(icon: icon, title: title, subtitle: subtitle)],
    );
  }

  Widget _youList() {
    final List<(IconData, String, VoidCallback)> items = [
      (
        Icons.person_rounded,
        'Profile',
        () => unawaited(_openProfileSettings()),
      ),
      (Icons.account_circle_rounded, 'Account', _openAccountSettings),
      (Icons.cell_tower_rounded, 'Broadcast', _openBroadcastBuilder),
      (Icons.storage_rounded, 'Storage', _openStorageSettings),
      (
        Icons.notifications_rounded,
        'Notifications',
        () => _showNotice('Notifications settings are coming soon.'),
      ),
      (
        Icons.chat_rounded,
        'Chats',
        () => setState(() => _homeTab = _PremiumChatTab.chats),
      ),
      (
        Icons.lock_rounded,
        'Privacy',
        () => _showNotice('Privacy settings are coming soon.'),
      ),
      (
        Icons.settings_rounded,
        'Settings',
        () => _showNotice('Settings are coming soon.'),
      ),
    ];
    final name = _displayName(_currentUser);
    final about = _currentUser?['chatProfileAbout']?.toString().trim() ?? '';
    final imageUrl = _profileImageUrl(_currentUser);

    return ListView(
      padding: EdgeInsets.fromLTRB(4.w, 1.5.h, 4.w, 3.h),
      children: [
        _sectionLabel('You'),
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.appSurface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.appBorder),
          ),
          child: ListTile(
            onTap: () => unawaited(_openProfileSettings()),
            contentPadding: const EdgeInsets.all(14),
            leading: CircleAvatar(
              radius: 28,
              backgroundColor: AppColors.appSurfaceSoft,
              backgroundImage: imageUrl == null ? null : NetworkImage(imageUrl),
              child: imageUrl == null
                  ? Text(
                      _initials(name),
                      style: TextStyle(
                        color: AppColors.appTextPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    )
                  : null,
            ),
            title: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppColors.appTextPrimary,
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
            subtitle: Text(
              about.isEmpty ? tr('Tap to add About') : about,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: AppColors.appTextSecondary),
            ),
            trailing: Icon(
              Icons.edit_rounded,
              color: AppColors.appTextSecondary,
            ),
          ),
        ),
        ...items.map(
          (item) => _SettingsRow(icon: item.$1, label: item.$2, onTap: item.$3),
        ),
      ],
    );
  }

  Widget _conversationList() {
    return RefreshIndicator(
      onRefresh: () => _loadBootstrap(keepSelection: false),
      child: ListView(
        padding: EdgeInsets.fromLTRB(4.w, 1.h, 4.w, 3.h),
        children: [
          _searchBox(),
          if (_searching)
            Padding(
              padding: EdgeInsets.symmetric(vertical: 2.h),
              child: const Center(child: CircularProgressIndicator()),
            ),
          if (_searchResults.isNotEmpty) ...[
            SizedBox(height: 1.5.h),
            _sectionLabel('Start chat'),
            ..._searchResults.map(_userTile),
            Divider(color: AppColors.appBorder, height: 3.h),
          ],
          _sectionLabel('Conversations'),
          if (_conversations.isEmpty)
            _emptyState(
              icon: Icons.chat_bubble_outline_rounded,
              title: 'No chats yet',
              subtitle: 'Search by email, phone, name, or UID.',
            )
          else
            ..._conversations.map(_conversationTile),
        ],
      ),
    );
  }

  Widget _searchBox() {
    return TextField(
      controller: _searchController,
      onChanged: _onSearchChanged,
      style: TextStyle(color: AppColors.appTextPrimary, fontSize: 12.5.sp),
      decoration: InputDecoration(
        hintText: tr('Search by email, phone, name, or UID'),
        hintStyle: TextStyle(color: AppColors.appTextSecondary),
        prefixIcon: Icon(
          Icons.search_rounded,
          color: AppColors.appTextSecondary,
        ),
        suffixIcon: _searchController.text.isEmpty
            ? null
            : IconButton(
                onPressed: () {
                  _searchController.clear();
                  setState(() => _searchResults = []);
                },
                icon: const Icon(Icons.close_rounded),
              ),
        filled: true,
        fillColor: AppColors.appSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.appBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.appBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.primaryColor),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        tr(text),
        style: TextStyle(
          color: AppColors.appTextSecondary,
          fontSize: 11.sp,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _userTile(Map<String, dynamic> user) {
    final title = _displayName(user);
    return _ChatListTile(
      title: title,
      subtitle: user['email']?.toString() ?? '',
      trailing: Icons.add_comment_rounded,
      initials: _initials(title),
      onTap: () => _startDirectChat(user),
    );
  }

  Widget _conversationTile(Map<String, dynamic> conversation) {
    final title = _conversationTitle(conversation);
    final lastMessage = conversation['lastMessage'] is Map
        ? Map<String, dynamic>.from(conversation['lastMessage'])
        : null;
    final unreadCount =
        int.tryParse((conversation['unreadCount'] ?? 0).toString()) ?? 0;
    final unread = NumberFormat.compact().format(unreadCount);

    return _ChatListTile(
      title: title,
      subtitle: _messagePreview(lastMessage),
      time: _time(conversation['updatedAt']),
      initials: _initials(title),
      unreadLabel: unreadCount > 0 ? unread : null,
      onTap: () {
        setState(
          () => _selectedConversationId = conversation['id']?.toString(),
        );
        if (_selectedConversationId != null) {
          _joinSelectedConversation();
          _loadMessages(_selectedConversationId!);
        }
      },
    );
  }

  Widget _emptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      margin: EdgeInsets.only(top: 4.h),
      padding: EdgeInsets.all(6.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primaryColor, size: 36.sp),
          SizedBox(height: 1.5.h),
          Text(
            tr(title),
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
            ),
          ),
          SizedBox(height: 0.8.h),
          Text(
            tr(subtitle),
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.appTextSecondary),
          ),
        ],
      ),
    );
  }

  Widget _chatPane() {
    final visibleMessages = _visibleMessages;
    return Column(
      children: [
        _mediaToolbar(),
        Expanded(
          child: _loadingMessages
              ? const Center(child: CircularProgressIndicator())
              : visibleMessages.isEmpty
              ? _emptyState(
                  icon: _mediaFilter == _ChatMediaFilter.all
                      ? Icons.forum_rounded
                      : Icons.filter_alt_rounded,
                  title: _mediaFilter == _ChatMediaFilter.all
                      ? 'No messages yet'
                      : 'Nothing here',
                  subtitle: _emptyFilterText(),
                )
              : ListView.builder(
                  controller: _messagesController,
                  padding: EdgeInsets.fromLTRB(4.w, 1.h, 4.w, 2.h),
                  itemCount: visibleMessages.length,
                  itemBuilder: (context, index) =>
                      _messageBubble(visibleMessages[index]),
                ),
        ),
        _composer(),
      ],
    );
  }

  Widget _callOverlay() {
    final call = _activeCall;
    if (call == null) return const SizedBox.shrink();

    final incoming = call['status'] == 'incoming';
    final video = call['mode'] == 'video';
    final remoteName = call['remoteName']?.toString() ?? 'Chat user';

    if (video) {
      final hasRemoteVideo = _remoteStream?.getVideoTracks().isNotEmpty == true;
      final hasLocalVideo = _localStream?.getVideoTracks().isNotEmpty == true;

      return Positioned.fill(
        child: Container(
          color: Colors.black,
          child: Stack(
            children: [
              Positioned.fill(
                child: _renderersReady && (hasRemoteVideo || hasLocalVideo)
                    ? RTCVideoView(
                        hasRemoteVideo
                            ? _remoteVideoRenderer
                            : _localVideoRenderer,
                        mirror: !hasRemoteVideo,
                        objectFit:
                            RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      )
                    : Center(
                        child: CircleAvatar(
                          radius: 54,
                          backgroundColor: AppColors.primaryColor,
                          child: Text(
                            _initials(remoteName),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 34,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
              ),
              Positioned(
                left: 18,
                right: 18,
                top: 12,
                child: SafeArea(
                  bottom: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.38),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.primaryColor,
                          child: Text(
                            _initials(remoteName),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                remoteName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                incoming ? 'Incoming video call' : _callStatus,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.78),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (_renderersReady && hasRemoteVideo && hasLocalVideo)
                Positioned(
                  right: 18,
                  top: 118,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      width: 122,
                      height: 168,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border.all(
                          color: Colors.white.withOpacity(0.35),
                        ),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: RTCVideoView(
                        _localVideoRenderer,
                        mirror: true,
                        objectFit:
                            RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      ),
                    ),
                  ),
                ),
              Positioned(
                left: 18,
                right: 18,
                bottom: 20,
                child: SafeArea(
                  top: false,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (!incoming)
                        _CallActionButton(
                          icon: _muted
                              ? Icons.mic_off_rounded
                              : Icons.mic_rounded,
                          label: _muted ? 'Muted' : 'Mute',
                          color: AppColors.appSurfaceSoft,
                          onTap: _toggleMute,
                        ),
                      if (!incoming) const SizedBox(width: 18),
                      if (!incoming && hasLocalVideo)
                        _CallActionButton(
                          icon: Icons.flip_camera_android_rounded,
                          label: 'Camera',
                          color: AppColors.appSurfaceSoft,
                          onTap: () => unawaited(_switchCallCamera()),
                        ),
                      if (!incoming) const SizedBox(width: 18),
                      if (incoming)
                        _CallActionButton(
                          icon: Icons.call_end_rounded,
                          label: 'Decline',
                          color: const Color(0xFFEF4444),
                          onTap: () => _declineCall(),
                        ),
                      if (incoming) const SizedBox(width: 24),
                      _CallActionButton(
                        icon: incoming
                            ? Icons.phone_rounded
                            : Icons.call_end_rounded,
                        label: incoming ? 'Answer' : 'End',
                        color: incoming
                            ? const Color(0xFF22C55E)
                            : const Color(0xFFEF4444),
                        onTap: incoming
                            ? () => unawaited(_answerCall())
                            : () => _finishCall(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Positioned.fill(
      child: Container(
        color: Colors.black.withOpacity(0.78),
        padding: EdgeInsets.fromLTRB(5.w, 8.h, 5.w, 5.h),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(),
              CircleAvatar(
                radius: 42,
                backgroundColor: AppColors.primaryColor,
                child: Text(
                  _initials(remoteName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                remoteName,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                incoming ? 'Incoming Premium Chat call' : _callStatus,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.72),
                  fontSize: 15,
                ),
              ),
              if (video && _renderersReady) ...[
                const SizedBox(height: 22),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: RTCVideoView(
                      _remoteVideoRenderer,
                      objectFit:
                          RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: SizedBox(
                    width: 110,
                    height: 150,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: RTCVideoView(
                        _localVideoRenderer,
                        mirror: true,
                        objectFit:
                            RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      ),
                    ),
                  ),
                ),
              ] else
                const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (!incoming)
                    _CallActionButton(
                      icon: _muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      label: _muted ? 'Muted' : 'Mute',
                      color: AppColors.appSurfaceSoft,
                      onTap: _toggleMute,
                    ),
                  if (!incoming) const SizedBox(width: 18),
                  if (incoming)
                    _CallActionButton(
                      icon: Icons.call_end_rounded,
                      label: 'Decline',
                      color: const Color(0xFFEF4444),
                      onTap: () => _declineCall(),
                    ),
                  if (incoming) const SizedBox(width: 26),
                  _CallActionButton(
                    icon: incoming
                        ? Icons.phone_rounded
                        : Icons.call_end_rounded,
                    label: incoming ? 'Answer' : 'End',
                    color: incoming
                        ? const Color(0xFF22C55E)
                        : const Color(0xFFEF4444),
                    onTap: incoming
                        ? () => unawaited(_answerCall())
                        : () => _finishCall(),
                  ),
                ],
              ),
              SizedBox(height: 3.h),
            ],
          ),
        ),
      ),
    );
  }

  Widget _mediaToolbar() {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(3.w, 1.h, 3.w, 1.h),
      decoration: BoxDecoration(
        color: AppColors.appBackground,
        border: Border(bottom: BorderSide(color: AppColors.appBorder)),
      ),
      child: Row(
        children: [
          PopupMenuButton<_ChatMediaFilter>(
            tooltip: tr('Media filter'),
            color: AppColors.appSurface,
            position: PopupMenuPosition.under,
            onSelected: (filter) => setState(() => _mediaFilter = filter),
            itemBuilder: (context) => _ChatMediaFilter.values
                .map(
                  (filter) => PopupMenuItem<_ChatMediaFilter>(
                    value: filter,
                    child: Row(
                      children: [
                        Icon(
                          _mediaFilterIcon(filter),
                          size: 18,
                          color: filter == _mediaFilter
                              ? const Color(0xFF7DDDEC)
                              : AppColors.appTextSecondary,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          tr(_mediaFilterLabel(filter)),
                          style: TextStyle(color: AppColors.appTextPrimary),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
            child: _ToolbarDropdownButton(
              icon: _mediaFilterIcon(_mediaFilter),
              label: _mediaFilterLabel(_mediaFilter),
            ),
          ),
          const Spacer(),
          PopupMenuButton<String>(
            tooltip: tr('Call actions'),
            color: AppColors.appSurface,
            position: PopupMenuPosition.under,
            onSelected: (action) {
              switch (action) {
                case 'voice':
                  unawaited(_startRealtimeVoiceCall());
                  break;
                case 'video':
                  unawaited(_startRealtimeVideoCall());
                  break;
                case 'link':
                  unawaited(_sendCallLink());
                  break;
                case 'schedule':
                  unawaited(_scheduleCall());
                  break;
              }
            },
            itemBuilder: (context) => [
              _callMenuItem('voice', Icons.phone_rounded, 'Voice Call'),
              _callMenuItem('video', Icons.videocam_rounded, 'Video Call'),
              _callMenuItem('link', Icons.link_rounded, 'Send Call Link'),
              _callMenuItem(
                'schedule',
                Icons.event_available_rounded,
                'Schedule Call',
              ),
            ],
            child: const _ToolbarDropdownButton(
              icon: Icons.phone_rounded,
              label: 'Call',
            ),
          ),
        ],
      ),
    );
  }

  PopupMenuItem<String> _callMenuItem(
    String value,
    IconData icon,
    String label,
  ) {
    return PopupMenuItem<String>(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.appTextSecondary),
          const SizedBox(width: 10),
          Text(tr(label), style: TextStyle(color: AppColors.appTextPrimary)),
        ],
      ),
    );
  }

  Widget _messageBubble(Map<String, dynamic> message) {
    final currentId = _currentUser?['id']?.toString();
    final own = message['senderId']?.toString() == currentId;
    final body = message['body']?.toString() ?? '';
    final sender = message['senderName']?.toString().trim().isNotEmpty == true
        ? message['senderName'].toString()
        : message['senderEmail']?.toString() ?? 'User';
    final attachments = _mapList(message['attachments']);
    final emoji = message['emoji'] is Map
        ? Map<String, dynamic>.from(message['emoji'])
        : null;
    final call = message['call'] is Map
        ? Map<String, dynamic>.from(message['call'])
        : null;
    final location = message['location'] is Map
        ? Map<String, dynamic>.from(message['location'])
        : null;
    final forwardable = _canForwardMessage(message);

    return Align(
      alignment: own ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: forwardable ? () => _showForwardSheet(message) : null,
        child: Container(
          constraints: BoxConstraints(maxWidth: 78.w),
          margin: const EdgeInsets.symmetric(vertical: 5),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: own ? AppColors.primaryColor : AppColors.appSurface,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(own ? 18 : 4),
              bottomRight: Radius.circular(own ? 4 : 18),
            ),
            border: own ? null : Border.all(color: AppColors.appBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!own)
                Padding(
                  padding: const EdgeInsets.only(bottom: 5),
                  child: Text(
                    sender,
                    style: TextStyle(
                      color: AppColors.appTextSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              if (call != null) _callSummary(message, own),
              if (emoji != null) _emojiSummary(emoji, body, own),
              if (location != null) _locationSummary(location, body, own),
              if (body.isNotEmpty &&
                  call == null &&
                  emoji == null &&
                  location == null)
                Text(
                  body,
                  style: TextStyle(
                    color: own ? Colors.white : AppColors.appTextPrimary,
                    fontSize: 18,
                    height: 1.42,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              if (attachments.isNotEmpty) ...[
                if (body.isNotEmpty || call != null || emoji != null)
                  const SizedBox(height: 8),
                ...attachments.map((file) => _attachmentPreview(file, own)),
              ],
              const SizedBox(height: 5),
              Align(
                alignment: Alignment.bottomRight,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (forwardable) ...[
                      InkWell(
                        onTap: () => _showForwardSheet(message),
                        borderRadius: BorderRadius.circular(999),
                        child: Padding(
                          padding: const EdgeInsets.all(3),
                          child: Icon(
                            Icons.shortcut_rounded,
                            size: 17,
                            color: own
                                ? Colors.white70
                                : AppColors.appTextSecondary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 5),
                    ],
                    Text(
                      _time(message['createdAt']),
                      style: TextStyle(
                        color: own
                            ? Colors.white70
                            : AppColors.appTextSecondary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (own) ...[
                      const SizedBox(width: 4),
                      _messageReceiptIcon(message),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _locationSummary(
    Map<String, dynamic> location,
    String body,
    bool own,
  ) {
    final latitude = double.tryParse(location['latitude']?.toString() ?? '');
    final longitude = double.tryParse(location['longitude']?.toString() ?? '');
    final mapsUrl =
        location['mapsUrl']?.toString() ??
        (latitude != null && longitude != null
            ? 'https://maps.google.com/?q=$latitude,$longitude'
            : '');
    final coordinates = latitude != null && longitude != null
        ? '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}'
        : 'Location';

    return InkWell(
      onTap: mapsUrl.isEmpty
          ? null
          : () async {
              await Clipboard.setData(ClipboardData(text: mapsUrl));
              _showNotice('Map link copied.');
            },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(own ? 0.16 : 0.06),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.location_on_rounded,
              color: own ? Colors.white : const Color(0xFFFCA5A5),
              size: 24,
            ),
            const SizedBox(width: 9),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    body.isNotEmpty ? body : 'Shared location',
                    style: TextStyle(
                      color: own ? Colors.white : AppColors.appTextPrimary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    coordinates,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: own ? Colors.white70 : AppColors.appTextSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageReceiptIcon(Map<String, dynamic> message) {
    final state = _messageReceiptState(message);
    if (state == 'none') return const SizedBox.shrink();
    return Icon(
      state == 'sent' ? Icons.done_rounded : Icons.done_all_rounded,
      size: 24,
      color: state == 'read' ? const Color(0xFF53BDEB) : Colors.white70,
    );
  }

  Widget _emojiSummary(Map<String, dynamic> emoji, String body, bool own) {
    final symbol =
        emoji['symbol']?.toString() ?? (body.trim().isEmpty ? '😀' : body);
    final label = emoji['category']?.toString() ?? emoji['name']?.toString();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(symbol, style: const TextStyle(fontSize: 34, height: 1)),
        if (label != null && label.isNotEmpty) ...[
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: own ? Colors.white70 : AppColors.appTextSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ],
    );
  }

  Widget _callSummary(Map<String, dynamic> message, bool own) {
    final type = message['messageType']?.toString() ?? 'voice_call';
    final icon = type == 'video_call'
        ? Icons.videocam_rounded
        : type == 'group_call'
        ? Icons.groups_rounded
        : Icons.phone_rounded;
    final label = message['body']?.toString().trim().isNotEmpty == true
        ? message['body'].toString()
        : 'Call invite';

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(own ? 0.18 : 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            size: 18,
            color: own ? Colors.white : AppColors.primaryColor,
          ),
        ),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            label,
            style: TextStyle(
              color: own ? Colors.white : AppColors.appTextPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  Widget _attachmentPreview(Map<String, dynamic> file, bool own) {
    final type = file['type']?.toString() ?? '';
    final name = file['name']?.toString() ?? 'Attachment';
    final url = file['url']?.toString();
    final isImage = type.startsWith('image/') && url != null;
    final icon = type.startsWith('video/')
        ? Icons.videocam_rounded
        : type.startsWith('audio/')
        ? Icons.mic_rounded
        : type.startsWith('image/')
        ? Icons.image_rounded
        : Icons.attach_file_rounded;

    if (isImage) {
      final imageUrl = _absoluteFileUrl(url);
      return Container(
        margin: const EdgeInsets.only(top: 4),
        constraints: BoxConstraints(maxWidth: 70.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: () => _openImageViewer(imageUrl, name),
              borderRadius: BorderRadius.circular(12),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  imageUrl,
                  height: 170,
                  width: 70.w,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _attachmentRow(file, own, icon),
                ),
              ),
            ),
            const SizedBox(height: 5),
            Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: own ? Colors.white70 : AppColors.appTextSecondary,
                fontSize: 10.5.sp,
              ),
            ),
          ],
        ),
      );
    }

    return _attachmentRow(file, own, icon);
  }

  void _openImageViewer(String imageUrl, String name) {
    Get.dialog(
      Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: Stack(
          children: [
            Positioned.fill(
              child: InteractiveViewer(
                minScale: 0.75,
                maxScale: 4,
                child: Center(
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, loading) {
                      if (loading == null) return child;
                      return const CircularProgressIndicator();
                    },
                    errorBuilder: (_, __, ___) => Icon(
                      Icons.broken_image_rounded,
                      color: Colors.white70,
                      size: 48.sp,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 12,
              right: 12,
              top: 0,
              child: SafeArea(
                bottom: false,
                child: Row(
                  children: [
                    IconButton.filled(
                      onPressed: () => Get.back(),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.black54,
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.close_rounded),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _attachmentRow(Map<String, dynamic> file, bool own, IconData icon) {
    final type = file['type']?.toString() ?? '';
    final playable = type.startsWith('audio/');

    return InkWell(
      onTap: playable ? () => _playAttachment(file) : null,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(top: 4),
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(own ? 0.16 : 0.06),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              playable ? Icons.play_arrow_rounded : icon,
              size: 18,
              color: own ? Colors.white : AppColors.primaryColor,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                playable
                    ? 'Play voice message'
                    : file['name']?.toString() ?? 'Attachment',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: own ? Colors.white : AppColors.appTextPrimary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _composer() {
    final busy = _sending || _uploading;
    final typing = _typingMessage;
    return SafeArea(
      top: false,
      child: Container(
        padding: EdgeInsets.fromLTRB(3.w, 1.h, 3.w, 1.5.h),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          border: Border(top: BorderSide(color: AppColors.appBorder)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_recording)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF22C55E).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF22C55E).withOpacity(0.35),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.mic_rounded, color: Color(0xFF86EFAC)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        tr('Recording voice message'),
                        style: const TextStyle(
                          color: Color(0xFFDCFCE7),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _toggleVoiceRecording,
                      child: Text(tr('Stop And Send')),
                    ),
                  ],
                ),
              ),
            Row(
              children: [
                if (!typing) ...[
                  _ComposerIconButton(
                    icon: Icons.add_rounded,
                    tooltip: 'Share',
                    onTap: busy ? null : _showAttachmentSheet,
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    minLines: 1,
                    maxLines: 4,
                    style: TextStyle(
                      color: AppColors.appTextPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                    decoration: InputDecoration(
                      hintText: tr('Type a message'),
                      hintStyle: TextStyle(color: AppColors.appTextSecondary),
                      filled: true,
                      fillColor: AppColors.appSurfaceAlt,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: AppColors.appBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: AppColors.appBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: AppColors.primaryColor),
                      ),
                    ),
                  ),
                ),
                if (!typing) ...[
                  const SizedBox(width: 8),
                  _ComposerIconButton(
                    icon: Icons.photo_camera_rounded,
                    tooltip: 'Camera',
                    onTap: busy
                        ? null
                        : () => _pickAndSendMedia(
                            ImageSource.camera,
                            video: true,
                          ),
                  ),
                  const SizedBox(width: 8),
                  _ComposerIconButton(
                    icon: _recording ? Icons.stop_rounded : Icons.mic_rounded,
                    tooltip: _recording ? 'Stop recording' : 'Voice message',
                    highlighted: _recording,
                    onTap: busy && !_recording ? null : _toggleVoiceRecording,
                  ),
                ] else ...[
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: busy ? null : _sendMessage,
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF7DDDEC),
                      foregroundColor: const Color(0xFF06101F),
                      disabledBackgroundColor: AppColors.appSurfaceSoft,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      fixedSize: const Size(52, 52),
                    ),
                    icon: busy
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded, size: 32),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatTitle extends StatelessWidget {
  const _ChatTitle({
    required this.title,
    required this.userIdLabel,
    required this.statusText,
    required this.online,
    required this.initials,
    this.imageUrl,
  });

  final String title;
  final String userIdLabel;
  final String statusText;
  final bool online;
  final String initials;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: AppColors.appSurfaceSoft,
          backgroundImage: imageUrl == null ? null : NetworkImage(imageUrl!),
          child: imageUrl == null
              ? Text(
                  initials,
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                )
              : null,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: AppColors.appTextPrimary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (userIdLabel.isNotEmpty)
                Text(
                  userIdLabel,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFC7D2FE),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.circle,
                    size: 8,
                    color: online
                        ? const Color(0xFF22C55E)
                        : AppColors.appTextSecondary,
                  ),
                  const SizedBox(width: 5),
                  Flexible(
                    child: Text(
                      statusText,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: online
                            ? const Color(0xFF86EFAC)
                            : AppColors.appTextSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChatListTile extends StatelessWidget {
  const _ChatListTile({
    required this.title,
    required this.subtitle,
    required this.initials,
    required this.onTap,
    this.time,
    this.trailing,
    this.unreadLabel,
  });

  final String title;
  final String subtitle;
  final String initials;
  final VoidCallback onTap;
  final String? time;
  final IconData? trailing;
  final String? unreadLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: AppColors.appSurfaceSoft,
          child: Text(
            initials,
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: AppColors.appTextPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(
          subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: AppColors.appTextSecondary),
        ),
        trailing: trailing != null
            ? Icon(trailing, color: AppColors.primaryColor)
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (time?.isNotEmpty == true)
                    Text(
                      time!,
                      style: TextStyle(
                        color: AppColors.appTextSecondary,
                        fontSize: 11,
                      ),
                    ),
                  if (unreadLabel != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        unreadLabel!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}

class _ForwardTargetTile extends StatelessWidget {
  const _ForwardTargetTile({
    required this.title,
    required this.subtitle,
    required this.initials,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String initials;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.appSurfaceAlt,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: AppColors.appSurfaceSoft,
          child: Text(
            initials,
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        title: Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: AppColors.appTextPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: AppColors.appTextSecondary),
        ),
        trailing: Icon(Icons.send_rounded, color: const Color(0xFF7DDDEC)),
      ),
    );
  }
}

class _ToolbarDropdownButton extends StatelessWidget {
  const _ToolbarDropdownButton({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 13),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: AppColors.appTextPrimary),
          const SizedBox(width: 8),
          Text(
            tr(label),
            style: TextStyle(
              color: AppColors.appTextPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(width: 6),
          Icon(
            Icons.keyboard_arrow_down_rounded,
            size: 18,
            color: AppColors.appTextSecondary,
          ),
        ],
      ),
    );
  }
}

class _HomeTabButton extends StatelessWidget {
  const _HomeTabButton({
    required this.selected,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        height: 58,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.appSurface : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: selected ? Border.all(color: AppColors.appBorder) : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 25,
              color: selected
                  ? const Color(0xFF7DDDEC)
                  : AppColors.appTextSecondary,
            ),
            const SizedBox(height: 3),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                tr(label),
                maxLines: 1,
                style: TextStyle(
                  color: selected
                      ? AppColors.appTextPrimary
                      : AppColors.appTextSecondary,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.appBorder),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: const Color(0xFF7DDDEC)),
        title: Text(
          tr(label),
          style: TextStyle(
            color: AppColors.appTextPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: AppColors.appTextSecondary,
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.38)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              tr(label),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: AppColors.appTextPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ComposerIconButton extends StatelessWidget {
  const _ComposerIconButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.highlighted = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tr(tooltip),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: highlighted
                ? const Color(0xFF22C55E).withOpacity(0.2)
                : AppColors.appSurfaceAlt,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: highlighted
                  ? const Color(0xFF86EFAC)
                  : AppColors.appBorder,
            ),
          ),
          child: Icon(
            icon,
            size: 24,
            color: highlighted
                ? const Color(0xFF86EFAC)
                : AppColors.appTextPrimary,
          ),
        ),
      ),
    );
  }
}

class _CallActionButton extends StatelessWidget {
  const _CallActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton.filled(
          onPressed: onTap,
          style: IconButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            fixedSize: const Size(64, 64),
            shape: const CircleBorder(),
          ),
          icon: Icon(icon, size: 28),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _ShareAction extends StatelessWidget {
  const _ShareAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 22.w,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 31),
              const SizedBox(height: 6),
              Text(
                tr(label),
                maxLines: 1,
                textAlign: TextAlign.center,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: AppColors.appTextPrimary,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/utills/services/ApiService.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:sizer/sizer.dart';

class ChatGPTConciergeScreen extends StatefulWidget {
  const ChatGPTConciergeScreen({
    super.key,
    this.title = 'Premium Chat',
    this.lockedTitle = 'Premium Chat is locked',
    this.lockedSubtitle =
        'Activate the Chat premium service on this SIP user before using chat.',
    this.startButtonText = 'Start Premium Chat',
    this.teamName = 'Premium Team',
  });

  final String title;
  final String lockedTitle;
  final String lockedSubtitle;
  final String startButtonText;
  final String teamName;

  @override
  State<ChatGPTConciergeScreen> createState() => _ChatGPTConciergeScreenState();
}

class _ChatGPTConciergeScreenState extends State<ChatGPTConciergeScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();

  Map<String, dynamic> _thread = <String, dynamic>{};
  List<Map<String, dynamic>> _messages = <Map<String, dynamic>>[];
  bool _loading = true;
  bool _sending = false;
  bool _recording = false;
  bool _speaking = false;
  String? _recordingPath;

  @override
  void initState() {
    super.initState();
    _loadThread();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _recorder.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  Map<String, dynamic> _dataMap(dynamic response) {
    if (response is Map<String, dynamic>) {
      final data = response['data'];
      if (data is Map<String, dynamic>) return data;
      return response;
    }
    return <String, dynamic>{};
  }

  List<Map<String, dynamic>> _messageList(dynamic value) {
    if (value is List) {
      return value
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }
    return <Map<String, dynamic>>[];
  }

  bool _parseBool(dynamic value) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    final text = value?.toString().toLowerCase().trim();
    return text == 'true' || text == '1' || text == 'yes' || text == 'active';
  }

  bool get _hasAccess => _parseBool(_thread['hasAccess']);

  bool get _aiReady {
    final aiBot = _thread['aiBot'];
    if (aiBot is Map) return _parseBool(aiBot['ready']);
    return true;
  }

  String get _botName {
    final aiBot = _thread['aiBot'];
    if (aiBot is Map && aiBot['name'] != null) {
      final name = aiBot['name'].toString().trim();
      if (name.isNotEmpty && !name.toLowerCase().contains('concierge')) {
        return name;
      }
    }
    return widget.title;
  }

  Future<void> _loadThread() async {
    setState(() => _loading = true);
    try {
      final response = await _apiService.get('concierge/thread');
      final data = _dataMap(response);
      if (!mounted) return;
      setState(() {
        _thread = data;
        _messages = _messageList(data['messages']);
      });
      _scrollToBottom();
    } catch (e) {
      global.showToastMessage(message: e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startThread() async {
    if (_sending) return;
    setState(() => _sending = true);
    try {
      final response = await _apiService.post('concierge/thread/start');
      final data = _dataMap(response);
      if (!mounted) return;
      setState(() {
        _thread = data;
        _messages = _messageList(data['messages']);
      });
      _scrollToBottom();
    } catch (e) {
      global.showToastMessage(message: e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _sending) return;

    final optimistic = <String, dynamic>{
      'id': 'local_${DateTime.now().millisecondsSinceEpoch}',
      'senderType': 'user',
      'senderName': 'You',
      'message': text,
      'createdAt': DateTime.now().toIso8601String(),
    };

    setState(() {
      _sending = true;
      _messages.add(optimistic);
    });
    _messageController.clear();
    _scrollToBottom();

    try {
      final response = await _apiService.post(
        'concierge/thread/message',
        data: {'message': text},
      );
      final data = _dataMap(response);
      if (!mounted) return;
      setState(() {
        _thread = data;
        _messages = _messageList(data['messages']);
      });
      _scrollToBottom();
    } catch (e) {
      global.showToastMessage(message: e.toString());
      setState(() => _messages.remove(optimistic));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      await _stopRecordingAndSend();
      return;
    }

    if (!_hasAccess || !_aiReady || _sending) return;

    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        global.showToastMessage(
          message: tr('Microphone permission is required.'),
        );
        return;
      }

      final directory = await getTemporaryDirectory();
      final path =
          '${directory.path}/concierge_${DateTime.now().millisecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );
      setState(() {
        _recording = true;
        _recordingPath = path;
      });
    } catch (e) {
      global.showToastMessage(message: e.toString());
    }
  }

  Future<void> _stopRecordingAndSend() async {
    try {
      final path = await _recorder.stop() ?? _recordingPath;
      setState(() => _recording = false);
      if (path == null || !File(path).existsSync()) {
        global.showToastMessage(message: tr('No voice recording found.'));
        return;
      }

      setState(() => _sending = true);
      final response = await _apiService.postForm(
        'concierge/thread/voice',
        data: FormData.fromMap({
          'audio': await MultipartFile.fromFile(
            path,
            filename: 'concierge-voice.m4a',
          ),
        }),
      );

      final data = _dataMap(response);
      final thread = data['thread'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(data['thread'])
          : data;
      if (!mounted) return;
      setState(() {
        _thread = thread;
        _messages = _messageList(thread['messages']);
      });
      final transcript = data['transcript']?.toString().trim();
      if (transcript != null && transcript.isNotEmpty) {
        global.showToastMessage(message: '${tr('Voice sent')}: $transcript');
      }
      _scrollToBottom();
    } catch (e) {
      global.showToastMessage(message: e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _playLatestAiReply() async {
    if (_speaking) return;

    final latestAi = _messages.reversed.firstWhere(
      (message) => message['senderType']?.toString().toLowerCase() == 'ai',
      orElse: () => <String, dynamic>{},
    );
    final text = latestAi['message']?.toString().trim() ?? '';
    if (text.isEmpty) {
      global.showToastMessage(message: tr('No chat reply to play yet.'));
      return;
    }

    setState(() => _speaking = true);
    try {
      final bytes = await _apiService.postBytes(
        'concierge/voice/speak',
        data: {'text': text},
      );
      if (bytes.isEmpty) {
        global.showToastMessage(message: tr('Voice reply is empty.'));
        return;
      }

      final directory = await getTemporaryDirectory();
      final file = File(
        '${directory.path}/concierge_reply_${DateTime.now().millisecondsSinceEpoch}.mp3',
      );
      await file.writeAsBytes(bytes, flush: true);
      await _audioPlayer.stop();
      await _audioPlayer.play(DeviceFileSource(file.path));
    } catch (e) {
      global.showToastMessage(message: e.toString());
    } finally {
      if (mounted) setState(() => _speaking = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  String _formatTime(dynamic value) {
    final text = value?.toString() ?? '';
    final date = DateTime.tryParse(text);
    if (date == null) return '';
    return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(
          title: Text(_botName),
          actions: [
            IconButton(
              onPressed: _loading ? null : _loadThread,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  _statusCard(),
                  Expanded(child: _messagesView()),
                  _composer(),
                ],
              ),
      ),
    );
  }

  Widget _statusCard() {
    final locked = !_hasAccess;
    final color = locked
        ? Colors.orange
        : _aiReady
        ? Colors.green
        : Colors.redAccent;
    final title = locked
        ? widget.lockedTitle
        : _aiReady
        ? 'Premium Chat is ready'
        : 'Premium Chat is not connected';
    final subtitle = locked
        ? widget.lockedSubtitle
        : _aiReady
        ? 'Ask about packages, prices, setup, travel data, and account help.'
        : 'Ask the admin to verify the OpenAI API key.';

    return Container(
      width: double.infinity,
      margin: EdgeInsets.all(4.w),
      padding: EdgeInsets.all(4.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.45)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: color.withOpacity(0.14),
            child: Icon(
              locked ? Icons.lock_outline : Icons.smart_toy_rounded,
              color: color,
            ),
          ),
          SizedBox(width: 3.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr(title),
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  tr(subtitle),
                  style: TextStyle(
                    color: AppColors.appTextSecondary,
                    fontSize: 12.5.sp,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _messagesView() {
    if (_messages.isEmpty) {
      return Center(
        child: Padding(
          padding: EdgeInsets.all(8.w),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.auto_awesome_rounded,
                size: 42.sp,
                color: AppColors.primaryColor,
              ),
              SizedBox(height: 2.h),
              Text(
                tr('Ask anything'),
                style: TextStyle(
                  color: AppColors.appTextPrimary,
                  fontSize: 18.sp,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: 1.h),
              Text(
                tr(
                  'I can compare eSIM package prices, recommend better value plans, and help with setup.',
                ),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.appTextSecondary,
                  fontSize: 13.sp,
                ),
              ),
              SizedBox(height: 2.h),
              ElevatedButton.icon(
                onPressed: _hasAccess && !_sending ? _startThread : null,
                icon: const Icon(Icons.chat_bubble_outline_rounded),
                label: Text(tr(widget.startButtonText)),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 1.h),
      itemCount: _messages.length + (_sending ? 1 : 0),
      itemBuilder: (context, index) {
        if (_sending && index == _messages.length) return _typingBubble();
        return _messageBubble(_messages[index]);
      },
    );
  }

  Widget _messageBubble(Map<String, dynamic> message) {
    final senderType = message['senderType']?.toString().toLowerCase() ?? '';
    final isUser = senderType == 'user';
    final isAi = senderType == 'ai';
    final color = isUser ? AppColors.primaryColor : AppColors.appSurface;
    final textColor = isUser ? Colors.white : AppColors.appTextPrimary;

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(maxWidth: 78.w),
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          border: isUser ? null : Border.all(color: AppColors.appBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isUser ? tr('You') : (isAi ? _botName : tr(widget.teamName)),
              style: TextStyle(
                color: isUser ? Colors.white70 : AppColors.appTextSecondary,
                fontSize: 11.sp,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              message['message']?.toString() ?? '',
              style: TextStyle(color: textColor, fontSize: 14.sp, height: 1.35),
            ),
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.bottomRight,
              child: Text(
                _formatTime(message['createdAt']),
                style: TextStyle(
                  color: isUser ? Colors.white70 : AppColors.appTextSecondary,
                  fontSize: 10.sp,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _typingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.appSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.appBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primaryColor,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              tr('Thinking...'),
              style: TextStyle(color: AppColors.appTextSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _composer() {
    final disabled = !_hasAccess || !_aiReady || _sending;
    return Container(
      padding: EdgeInsets.fromLTRB(4.w, 2.w, 4.w, 4.w),
      decoration: BoxDecoration(
        color: AppColors.appSurface,
        border: Border(top: BorderSide(color: AppColors.appBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _messageController,
                enabled: !disabled,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.newline,
                decoration: InputDecoration(
                  hintText: disabled
                      ? tr('Premium Chat is unavailable')
                      : tr('Type your message...'),
                  filled: true,
                  fillColor: AppColors.appSurfaceAlt,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(color: AppColors.appBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(color: AppColors.appBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide(color: AppColors.primaryColor),
                  ),
                ),
              ),
            ),
            SizedBox(width: 2.w),
            IconButton(
              onPressed: disabled ? null : _playLatestAiReply,
              icon: _speaking
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.primaryColor,
                      ),
                    )
                  : const Icon(Icons.volume_up_rounded),
              tooltip: tr('Play voice reply'),
            ),
            IconButton.filledTonal(
              onPressed: disabled ? null : _toggleRecording,
              icon: Icon(_recording ? Icons.stop_rounded : Icons.mic_rounded),
              tooltip: tr(_recording ? 'Stop recording' : 'Talk'),
            ),
            IconButton.filled(
              onPressed: disabled ? null : _sendMessage,
              icon: const Icon(Icons.send_rounded),
            ),
          ],
        ),
      ),
    );
  }
}

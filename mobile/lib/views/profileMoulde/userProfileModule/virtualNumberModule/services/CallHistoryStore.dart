import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CallHistoryEntry {
  final String id;
  final String number;
  final String direction;
  final String backend;
  final String status;
  final DateTime startedAt;
  final DateTime? endedAt;
  final String? callId;
  final String? errorMessage;
  final bool isInternal;

  const CallHistoryEntry({
    required this.id,
    required this.number,
    required this.direction,
    required this.backend,
    required this.status,
    required this.startedAt,
    this.endedAt,
    this.callId,
    this.errorMessage,
    this.isInternal = false,
  });

  int? get durationSeconds {
    final ended = endedAt;
    if (ended == null) return null;
    final seconds = ended.difference(startedAt).inSeconds;
    return seconds < 0 ? 0 : seconds;
  }

  CallHistoryEntry copyWith({
    String? status,
    DateTime? endedAt,
    String? callId,
    String? errorMessage,
  }) {
    return CallHistoryEntry(
      id: id,
      number: number,
      direction: direction,
      backend: backend,
      status: status ?? this.status,
      startedAt: startedAt,
      endedAt: endedAt ?? this.endedAt,
      callId: callId ?? this.callId,
      errorMessage: errorMessage ?? this.errorMessage,
      isInternal: isInternal,
    );
  }

  factory CallHistoryEntry.fromJson(Map<String, dynamic> json) {
    return CallHistoryEntry(
      id: json['id']?.toString() ?? '',
      number: json['number']?.toString() ?? '',
      direction: json['direction']?.toString() ?? 'outbound',
      backend: json['backend']?.toString() ?? 'eROAMING',
      status: json['status']?.toString() ?? 'dialing',
      startedAt:
          DateTime.tryParse(json['startedAt']?.toString() ?? '') ??
          DateTime.now(),
      endedAt: DateTime.tryParse(json['endedAt']?.toString() ?? ''),
      callId: json['callId']?.toString(),
      errorMessage: json['errorMessage']?.toString(),
      isInternal: json['isInternal'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'number': number,
      'direction': direction,
      'backend': backend,
      'status': status,
      'startedAt': startedAt.toIso8601String(),
      if (endedAt != null) 'endedAt': endedAt!.toIso8601String(),
      if (callId != null && callId!.isNotEmpty) 'callId': callId,
      if (errorMessage != null && errorMessage!.isNotEmpty)
        'errorMessage': errorMessage,
      'isInternal': isInternal,
    };
  }
}

class CallHistoryStore {
  static const _storageKey = 'e_roaming_call_history';
  static const _maxEntries = 100;

  Future<List<CallHistoryEntry>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null || raw.trim().isEmpty) return <CallHistoryEntry>[];

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return <CallHistoryEntry>[];
      return decoded
          .whereType<Map>()
          .map(
            (item) => CallHistoryEntry.fromJson(item.cast<String, dynamic>()),
          )
          .where((entry) => entry.id.isNotEmpty && entry.number.isNotEmpty)
          .toList();
    } catch (_) {
      return <CallHistoryEntry>[];
    }
  }

  Future<CallHistoryEntry> add({
    required String number,
    required String status,
    required bool isInternal,
    String? callId,
    String? errorMessage,
  }) async {
    final now = DateTime.now();
    final entry = CallHistoryEntry(
      id: now.microsecondsSinceEpoch.toString(),
      number: number,
      direction: 'outbound',
      backend: 'eROAMING',
      status: status,
      startedAt: now,
      endedAt: _isFinalStatus(status) ? now : null,
      callId: callId,
      errorMessage: errorMessage,
      isInternal: isInternal,
    );
    final entries = await load();
    entries.insert(0, entry);
    await _save(entries.take(_maxEntries).toList());
    return entry;
  }

  Future<void> update(
    String id, {
    String? status,
    DateTime? endedAt,
    String? callId,
    String? errorMessage,
  }) async {
    final entries = await load();
    final index = entries.indexWhere((entry) => entry.id == id);
    if (index == -1) return;
    entries[index] = entries[index].copyWith(
      status: status,
      endedAt: endedAt,
      callId: callId,
      errorMessage: errorMessage,
    );
    await _save(entries);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }

  Future<void> _save(List<CallHistoryEntry> entries) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      jsonEncode(entries.map((entry) => entry.toJson()).toList()),
    );
  }

  bool _isFinalStatus(String status) {
    final normalized = status.toLowerCase();
    return normalized == 'ended' ||
        normalized == 'failed' ||
        normalized == 'declined';
  }
}

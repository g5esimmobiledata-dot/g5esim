import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/virtualNumberModule/services/CallHistoryStore.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class CallHistoryScreen extends StatefulWidget {
  const CallHistoryScreen({super.key});

  @override
  State<CallHistoryScreen> createState() => _CallHistoryScreenState();
}

class _CallHistoryScreenState extends State<CallHistoryScreen> {
  final CallHistoryStore _store = CallHistoryStore();
  late Future<List<CallHistoryEntry>> _historyFuture;

  @override
  void initState() {
    super.initState();
    _historyFuture = _store.load();
  }

  Future<void> _reload() async {
    setState(() {
      _historyFuture = _store.load();
    });
  }

  Future<void> _clearHistory() async {
    await _store.clear();
    await _reload();
    if (!mounted) return;
    Get.snackbar(
      tr('Call History'),
      tr('Call history cleared'),
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  @override
  Widget build(BuildContext context) {
    AppColors.applyTheme(Theme.of(context).brightness == Brightness.dark);

    return SafeArea(
      child: Scaffold(
        backgroundColor: AppColors.scaffoldbackgroudColor,
        appBar: AppBar(
          title: const Text('Call History').tr(),
          actions: [
            FutureBuilder<List<CallHistoryEntry>>(
              future: _historyFuture,
              builder: (context, snapshot) {
                final hasHistory = snapshot.data?.isNotEmpty == true;
                return IconButton(
                  onPressed: hasHistory ? _clearHistory : null,
                  icon: const Icon(Icons.delete_sweep_outlined),
                  tooltip: tr('Clear history'),
                );
              },
            ),
          ],
        ),
        body: FutureBuilder<List<CallHistoryEntry>>(
          future: _historyFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final history = snapshot.data ?? <CallHistoryEntry>[];
            if (history.isEmpty) {
              return _emptyState(context);
            }

            return RefreshIndicator(
              onRefresh: _reload,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                itemBuilder: (context, index) => _historyItem(history[index]),
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 10),
                itemCount: history.length,
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _emptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.history_rounded,
              size: 54,
              color: AppColors.appTextSecondary,
            ),
            const SizedBox(height: 14),
            Text(
              'No calls yet',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.appTextPrimary,
                fontWeight: FontWeight.w700,
              ),
            ).tr(),
            const SizedBox(height: 8),
            Text(
              'Your recent eRoaming calls will appear here.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.appTextSecondary,
              ),
            ).tr(),
          ],
        ),
      ),
    );
  }

  Widget _historyItem(CallHistoryEntry entry) {
    final isFailed = entry.status.toLowerCase() == 'failed';
    final statusColor = isFailed ? Colors.red.shade400 : Colors.green.shade500;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.scaffoldbackgroudColor,
        border: Border.all(color: AppColors.appBorder),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isFailed ? Icons.call_missed_outgoing : Icons.call_made_rounded,
              color: statusColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.number,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.appTextPrimary,
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  '${tr(_statusLabel(entry.status))} • ${_formatStartedAt(entry.startedAt)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.appTextSecondary,
                    fontSize: 11.sp,
                  ),
                ),
                if (entry.durationSeconds != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    '${tr('Duration')}: ${_formatDuration(entry.durationSeconds!)}',
                    style: TextStyle(
                      color: AppColors.appTextSecondary,
                      fontSize: 10.sp,
                    ),
                  ),
                ],
              ],
            ),
          ),
          IconButton(
            onPressed: () => Get.back(result: entry.number),
            icon: const Icon(Icons.call_rounded),
            color: Colors.green.shade500,
            tooltip: tr('Call again'),
          ),
        ],
      ),
    );
  }

  String _statusLabel(String status) {
    final normalized = status.toLowerCase();
    if (normalized == 'active') return 'Connected';
    if (normalized == 'dialing' || normalized == 'calling') return 'Dialing';
    if (normalized == 'ringing') return 'Ringing';
    if (normalized == 'ended') return 'Ended';
    if (normalized == 'failed') return 'Failed';
    return status;
  }

  String _formatStartedAt(DateTime value) {
    final now = DateTime.now();
    final local = value.toLocal();
    final time = DateFormat('HH:mm').format(local);
    if (now.year == local.year &&
        now.month == local.month &&
        now.day == local.day) {
      return '${tr('Today')} $time';
    }
    return DateFormat('MMM d, HH:mm').format(local);
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    if (minutes == 0) return '${remainingSeconds}s';
    return '${minutes}m ${remainingSeconds.toString().padLeft(2, '0')}s';
  }
}

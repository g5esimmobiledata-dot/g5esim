import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class MessageBubble extends StatelessWidget {
  final String messages;
  final String sendertype;
  final String senderName;
  final String? timestamp; // Add this

  const MessageBubble({
    super.key,
    required this.messages,
    required this.sendertype,
    required this.senderName,
    this.timestamp,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = sendertype == 'user';
    return Align(
      alignment: isUser ? Alignment.centerLeft : Alignment.centerRight,
      child: Column(
        crossAxisAlignment: isUser
            ? CrossAxisAlignment.start
            : CrossAxisAlignment.end,
        children: [
          // Sender Name
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 4.w, vertical: 0.1),
            child: Text(
              senderName,
              style: TextStyle(
                fontSize: 13.sp,
                color: Colors.grey,
                fontWeight: FontWeight.normal,
              ),
            ),
          ),

          // Message Bubble
          Container(
            constraints: BoxConstraints(
              maxWidth: 70.w, // Limit width for better readability
            ),
            margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            decoration: BoxDecoration(
              color: isUser ? Colors.deepPurple.shade100 : Colors.grey.shade200,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(isUser ? 3.w : 0.w),
                bottomLeft: Radius.circular(3.w),
                topRight: Radius.circular(3.w),
                bottomRight: Radius.circular(isUser ? 0.w : 3.w),
              ),
              gradient: isUser
                  ? null
                  : const LinearGradient(
                      colors: [Color(0xFFE3F2FD), Color(0xFFFFF3E0)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Message Text
                Text(
                  messages,
                  style: TextStyle(
                    fontSize: 14.sp,
                    color: isUser ? Colors.deepPurple.shade900 : Colors.black87,
                  ),
                ),

                // Timestamp if available
                if (timestamp != null && timestamp!.isNotEmpty) ...[
                  SizedBox(height: 4),
                  Align(
                    alignment: Alignment.bottomRight,
                    child: Text(
                      _formatTimestamp(timestamp!),
                      style: TextStyle(
                        fontSize: 10.sp,
                        color: isUser
                            ? Colors.deepPurple.shade600
                            : Colors.grey.shade600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Or you can place timestamp below the bubble (alternative):
          // if (timestamp != null && timestamp!.isNotEmpty)
          //   Padding(
          //     padding: EdgeInsets.symmetric(horizontal: 4.w),
          //     child: Text(
          //       _formatTimestamp(timestamp!),
          //       style: TextStyle(
          //         fontSize: 10.sp,
          //         color: Colors.grey.shade500,
          //       ),
          //     ),
          //   ),
        ],
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    try {
      final date = DateTime.parse(timestamp);
      // Format as "HH:MM"
      return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';

      // Alternative formats:
      // return '${date.hour}:${date.minute.toString().padLeft(2, '0')}:${date.second.toString().padLeft(2, '0')}'; // HH:MM:SS
      // return '${date.day}/${date.month} ${date.hour}:${date.minute.toString().padLeft(2, '0')}'; // DD/MM HH:MM
      // return DateFormat('hh:mm a').format(date); // 12-hour format with AM/PM
    } catch (e) {
      // If parsing fails, try alternative formats or return original
      try {
        // Try different date formats
        final date = DateTime.tryParse(timestamp);
        if (date != null) {
          return '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
        }
      } catch (e2) {
        // If still fails, return empty or original
        return timestamp;
      }
      return '';
    }
  }

  // Optional: Format full date if needed
  String _formatDate(String timestamp) {
    try {
      final date = DateTime.parse(timestamp);
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final yesterday = today.subtract(const Duration(days: 1));
      final messageDate = DateTime(date.year, date.month, date.day);

      if (messageDate == today) {
        return 'Today ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
      } else if (messageDate == yesterday) {
        return 'Yesterday ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
      } else {
        return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
      }
    } catch (e) {
      return '';
    }
  }
}

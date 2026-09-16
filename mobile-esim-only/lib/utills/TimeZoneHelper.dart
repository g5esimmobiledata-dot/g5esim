import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:intl/intl.dart';

class TimeZoneHelper {
  /// Call this once in main() before using the helper
  static void initialize() {
    tz.initializeTimeZones();
  }

  /// Convert IST datetime into another timezone
  String formatUtcToLocal(DateTime utcDateTime) {
    final localDateTime = utcDateTime
        .toLocal(); // convert UTC → device timezone
    return DateFormat('dd MMM yyyy, hh:mm a').format(localDateTime);
  }

  static String convertISTtoLocal(
    String istDateTimeStr, {
    String format = "yyyy-MM-dd hh:mm a",
  }) {
    // Load IST location
    final ist = tz.getLocation('Asia/Kolkata');

    // Parse IST datetime
    final istTime = tz.TZDateTime.parse(ist, istDateTimeStr);

    // Convert IST → UTC
    final utcTime = istTime.toUtc();

    // Convert UTC → local timezone
    final localTime = utcTime.toLocal();

    // Format for display
    return DateFormat(format).format(localTime);
  }
}

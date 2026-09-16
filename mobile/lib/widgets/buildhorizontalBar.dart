import 'package:flutter/material.dart';

PreferredSizeWidget buildHorizontalBar() {
  return PreferredSize(
    preferredSize: Size.fromHeight(1.0),
    child: Container(height: 1.0, color: Colors.grey.shade300),
  );
}

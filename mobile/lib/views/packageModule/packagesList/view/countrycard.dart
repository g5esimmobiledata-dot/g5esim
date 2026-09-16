import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class _CountryCard extends StatelessWidget {
  final String title;
  final String plans;
  final Color color;
  const _CountryCard({
    required this.title,
    required this.plans,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(color: color, fontWeight: FontWeight.normal),
          ).tr(),
          const SizedBox(height: 6),
          Text(plans, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

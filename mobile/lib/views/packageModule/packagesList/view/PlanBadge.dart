import 'package:flutter/material.dart';

class PlanBadge {
  final String label;
  final Color color;
  final IconData icon;

  PlanBadge(this.label, this.color, this.icon);
}

PlanBadge? getPlanBadge(dynamic p) {
  if (p.isRecommended == true) {
    return PlanBadge("Recommended", Colors.blue, Icons.thumb_up);
  }
  if (p.isPopular == true) {
    return PlanBadge("Popular", Colors.purple, Icons.trending_up);
  }
  if (p.isUnlimited == true) {
    return PlanBadge("Unlimited", Colors.redAccent, Icons.all_inclusive);
  }
  return null;
}

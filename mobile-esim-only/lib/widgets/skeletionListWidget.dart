import 'package:flutter/material.dart';
import 'package:skeletonizer/skeletonizer.dart';

class SkeletonListScreen extends StatelessWidget {
  final bool isLoading;
  const SkeletonListScreen({super.key, required this.isLoading});

  @override
  Widget build(BuildContext context) {
    return Skeletonizer(
      enabled: isLoading,
      child: ListView.builder(
        itemCount: 10,
        padding: const EdgeInsets.all(12),
        itemBuilder: (context, index) {
          return Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            child: ListTile(
              leading: CircleAvatar(
                radius: 24,
                backgroundColor: Colors.grey.shade300,
              ),
              title: Text(isLoading ? '' : 'Title $index'),
              subtitle: Text(isLoading ? '' : 'Subtitle $index'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            ),
          );
        },
      ),
    );
  }
}

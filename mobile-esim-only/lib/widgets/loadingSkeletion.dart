import 'package:flutter/material.dart';

class ScrollViewSkeletion extends StatelessWidget {
  const ScrollViewSkeletion({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: <Widget>[
        SliverAppBar(
          backgroundColor: Colors.grey[300],
          pinned: true,
          expandedHeight: 250,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              color: Colors.grey[300],
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    width: 150,
                    height: 150,
                    decoration: BoxDecoration(
                      color: Colors.grey[400],
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ),

        // --- "Choose Data Plans" header skeleton ---
        SliverToBoxAdapter(
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: 16.0,
              vertical: 20.0,
            ),
            child: Container(height: 20, width: 150, color: Colors.grey[300]),
          ),
        ),

        // --- Data plan card list skeleton ---
        SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            return Padding(
              padding: const EdgeInsets.all(8.0),
              child: Container(
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            );
          }, childCount: 5),
        ),
      ],
    );
  }
}

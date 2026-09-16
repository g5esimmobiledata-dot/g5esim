// Custom Rating Bar Widget
import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';

class RatingBarWidget extends StatefulWidget {
  final double initialRating;
  final ValueChanged<double> onRatingChanged;

  const RatingBarWidget({
    Key? key,
    required this.initialRating,
    required this.onRatingChanged,
  }) : super(key: key);

  @override
  _RatingBarWidgetState createState() => _RatingBarWidgetState();
}

class _RatingBarWidgetState extends State<RatingBarWidget> {
  late double _currentRating;

  @override
  void initState() {
    super.initState();
    _currentRating = widget.initialRating;
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 37.w,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(5, (index) {
          return GestureDetector(
            onTap: () {
              setState(() {
                _currentRating = (index + 1).toDouble();
              });
              widget.onRatingChanged(_currentRating);
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.0),
              child: Icon(
                index < _currentRating.floor()
                    ? Icons.star
                    : (index < _currentRating
                          ? Icons.star_half
                          : Icons.star_border),
                size: 20.sp,
                color: Colors.amber,
              ),
            ),
          );
        }),
      ),
    );
  }
}

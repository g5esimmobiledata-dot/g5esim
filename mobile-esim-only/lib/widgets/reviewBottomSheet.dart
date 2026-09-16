import 'dart:developer';

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

import '../core/bloc/api_state.dart';
import '../views/reviewModule/review_blocs/submitReviewbloc.dart';
import '../views/reviewModule/review_models/submitReviewModel.dart';

class ReviewBottomSheet extends StatefulWidget {
  final String orderId;
  final bool hasUserReviewed;
  final String? initialTitle;
  final String? initialDescription;
  final int? initialStars;
  final Function(Map<String, dynamic>) onSubmit;
  final Function(Map<String, dynamic>) onEdit;

  const ReviewBottomSheet({
    Key? key,
    required this.orderId,
    required this.hasUserReviewed,
    this.initialTitle,
    this.initialDescription,
    this.initialStars,
    required this.onSubmit,
    required this.onEdit,
  }) : super(key: key);

  @override
  _ReviewBottomSheetState createState() => _ReviewBottomSheetState();
}

class _ReviewBottomSheetState extends State<ReviewBottomSheet> {
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late int _selectedStars;
  final FocusNode _titleFocus = FocusNode();
  final FocusNode _descriptionFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialTitle ?? '');
    _descriptionController = TextEditingController(
      text: widget.initialDescription ?? '',
    );
    _selectedStars = widget.initialStars ?? 0;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _titleFocus.dispose();
    _descriptionFocus.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    final reviewData = {
      'orderId': widget.orderId,
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'stars': _selectedStars,
    };

    if (widget.hasUserReviewed) {
      widget.onEdit(reviewData);
    } else {
      widget.onSubmit(reviewData);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool canSubmit =
        _titleController.text.trim().isNotEmpty && _selectedStars > 0;

    return AnimatedPadding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      duration: const Duration(milliseconds: 100),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.only(
          left: 24,
          right: 24,
          top: 16,
          bottom: 24,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(28),
            topRight: Radius.circular(28),
          ),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Header with order ID
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Review Order',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.normal,
                      color: Colors.grey[800],
                    ),
                  ).tr(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Get.theme.primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '#${widget.orderId}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.normal,
                        color: Colors.blue,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Share your experience with this order',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ).tr(),
              const SizedBox(height: 24),

              // Star Rating Section
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'How would you rate this order?',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.normal,
                      color: Colors.grey[800],
                    ),
                  ).tr(),
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.grey.shade50,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(5, (index) {
                          final starNumber = index + 1;
                          return GestureDetector(
                            onTap: () {
                              if (widget.hasUserReviewed) {
                                print("allready rated");
                              } else {
                                setState(() {
                                  _selectedStars = starNumber;
                                });
                              }
                            },
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              child: Icon(
                                starNumber <= _selectedStars
                                    ? Icons.star_rounded
                                    : Icons.star_outline_rounded,
                                color: starNumber <= _selectedStars
                                    ? const Color(0xFFFFC107)
                                    : Colors.grey[400],
                                size: 42,
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                  ),
                  if (_selectedStars > 0) ...[
                    const SizedBox(height: 8),
                    Center(
                      child: Text(
                        _getRatingText(_selectedStars),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.normal,
                          color: _getRatingColor(_selectedStars),
                        ),
                      ).tr(),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 28),

              // Title Field
              Text(
                'Review Title',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.normal,
                  color: Colors.grey[800],
                ),
              ).tr(),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _titleController,
                  focusNode: _titleFocus,
                  style: const TextStyle(fontSize: 16),
                  readOnly: widget.hasUserReviewed ? true : false,
                  decoration: InputDecoration(
                    hintText: tr('e.g., Great product, excellent service'),
                    hintStyle: TextStyle(color: Colors.grey[400]),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 18,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(
                        color: Colors.blue,
                        width: 2,
                      ),
                    ),
                  ),
                  onChanged: (value) => setState(() {}),
                ),
              ),
              const SizedBox(height: 20),

              // Description Field
              Text(
                'Detailed Review',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.normal,
                  color: Colors.grey[800],
                ),
              ).tr(),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  readOnly: widget.hasUserReviewed ? true : false,
                  controller: _descriptionController,
                  focusNode: _descriptionFocus,
                  style: const TextStyle(fontSize: 16),
                  maxLines: 5,
                  decoration: InputDecoration(
                    hintText: tr('Share more details about your experience...'),
                    hintStyle: TextStyle(color: Colors.grey[400]),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 18,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(
                        color: Colors.blue,
                        width: 2,
                      ),
                    ),
                    alignLabelWithHint: true,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Submit Button
              widget.hasUserReviewed
                  ? SizedBox()
                  : BlocListener<Submitreviewbloc, ApiState<SubmitReviewModel>>(
                      listener: (context, state) async {
                        if (state is ApiLoading) {
                          log("api loadingg");
                        } else if (state is ApiSuccess) {
                          // API call here
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Your review was submitted successfully.',
                              ).tr(),
                              backgroundColor: Colors.green,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        } else if (state is ApiFailure) {
                          log("error:- ${state.error}");
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${state.error}').tr(),
                              backgroundColor: Colors.red,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                      },
                      child: SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: canSubmit ? _handleSubmit : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: canSubmit
                                ? AppColors.primaryColor
                                : Colors.grey[300],
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                            shadowColor: Colors.transparent,
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                widget.hasUserReviewed
                                    ? Icons.edit_rounded
                                    : Icons.send_rounded,
                                size: 20,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                widget.hasUserReviewed
                                    ? 'Update Review'
                                    : 'Submit Review',
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.normal,
                                ),
                              ).tr(),
                            ],
                          ),
                        ),
                      ),
                    ),
              SizedBox(height: 7.h),
            ],
          ),
        ),
      ),
    );
  }

  String _getRatingText(int stars) {
    switch (stars) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return '';
    }
  }

  Color _getRatingColor(int stars) {
    switch (stars) {
      case 1:
        return Colors.red;
      case 2:
        return Colors.orange;
      case 3:
        return Colors.yellow[700]!;
      case 4:
        return Colors.lightGreen;
      case 5:
        return Colors.green;
      default:
        return Colors.grey;
    }
  }
}

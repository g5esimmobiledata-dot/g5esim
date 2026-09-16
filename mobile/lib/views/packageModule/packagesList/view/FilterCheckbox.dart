import 'package:flutter/material.dart';

class FilterCheckbox extends StatefulWidget {
  final String label;
  final bool initialValue;
  final ValueChanged<bool> onChanged;

  const FilterCheckbox({
    super.key,
    required this.label,
    required this.initialValue,
    required this.onChanged,
  });

  @override
  __FilterCheckboxState createState() => __FilterCheckboxState();
}

class __FilterCheckboxState extends State<FilterCheckbox> {
  late bool _isChecked;

  @override
  void initState() {
    super.initState();
    _isChecked = widget.initialValue;
  }

  @override
  Widget build(BuildContext context) {
    return CheckboxListTile(
      title: Text(widget.label),
      value: _isChecked,
      onChanged: (bool? newValue) {
        setState(() {
          _isChecked = newValue ?? false;
        });
        widget.onChanged(_isChecked);
      },
    );
  }
}

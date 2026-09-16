import 'package:flutter/material.dart';

class CommonDropDown extends StatelessWidget {
  final Widget? hint;
  final VoidCallback? voidCallback;
  final void Function()? onTap;
  final List<dynamic>? list;
  final void Function(dynamic)? onChanged;
  final dynamic type;
  final dynamic val;
  final double? height;
  final double? width;
  final bool isEditable;

  const CommonDropDown({
    super.key,
    this.voidCallback,
    this.type,
    this.onChanged,
    this.hint,
    this.onTap,
    this.val,
    this.list,
    this.height,
    this.width,
    this.isEditable = true,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField(
      icon: isEditable
          ? Icon(Icons.arrow_drop_down, color: Theme.of(context).primaryColor)
          : null,
      style: const TextStyle(
        fontWeight: FontWeight.normal,
        letterSpacing: 2.5,
        color: Colors.black,
        overflow: TextOverflow.visible,
      ),
      items: list!.map<DropdownMenuItem>((dynamic value) {
        return DropdownMenuItem<dynamic>(
          value: value,
          child: Text(
            value.toString(),
            style: TextStyle(
              fontSize: 14,
              letterSpacing: 2.5,
              fontWeight: FontWeight.normal,
              overflow: TextOverflow.visible,
            ),
          ),
        );
      }).toList(),
      value: val,
      hint: hint,
      onTap: isEditable ? onTap : null,
      onChanged: isEditable ? onChanged : null,
      isExpanded: true,
      decoration: InputDecoration(
        fillColor: isEditable ? Colors.white : Colors.grey.shade200,
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(
            color: isEditable ? Colors.grey.shade200 : Colors.grey,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        border: OutlineInputBorder(
          borderSide: BorderSide(
            color: isEditable ? Colors.grey.shade200 : Colors.grey,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(
            color: isEditable ? Colors.grey.shade200 : Colors.grey,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}

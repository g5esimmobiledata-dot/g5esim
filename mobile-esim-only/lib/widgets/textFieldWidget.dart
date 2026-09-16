import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sizer/sizer.dart';
import 'package:esimconnect/utills/appColors.dart';

class TextFieldWidget extends StatefulWidget {
  const TextFieldWidget({
    super.key,
    this.labelText,
    this.textEditingController,
    this.onEditingComplete,
    this.obscureText,
    this.readOnly,
    this.suffixIcon,
    this.onTap,
    this.keyboardType,
    this.focusNode,
    this.onFieldSubmitted,
    this.maxLines,
    this.enabledBorder,
    this.prefix,
    this.onChanged,
    this.textCapitalization,
    this.formatter,
    this.maxLength,
    this.counterText,
    this.contentPadding,
    this.validator,
    this.showPasswordToggle = false, // New parameter for password toggle
  });

  final String? labelText;
  final TextEditingController? textEditingController;
  final Function()? onEditingComplete;
  final bool? obscureText;
  final bool? readOnly;
  final IconData? suffixIcon;
  final TextInputType? keyboardType;
  final FocusNode? focusNode;
  final String? Function(String?)? validator;
  final void Function()? onTap;
  final void Function(String)? onFieldSubmitted;
  final int? maxLines;
  final int? maxLength;
  final dynamic counterText;
  final InputBorder? enabledBorder;
  final Widget? prefix;
  final void Function(String)? onChanged;
  final TextCapitalization? textCapitalization;
  final List<TextInputFormatter>? formatter;
  final EdgeInsetsGeometry? contentPadding;
  final bool showPasswordToggle; // Controls whether to show password toggle

  @override
  State<TextFieldWidget> createState() => _TextFieldWidgetState();
}

class _TextFieldWidgetState extends State<TextFieldWidget> {
  bool _obscureText = true;

  @override
  void initState() {
    super.initState();
    // Initialize obscureText based on widget.obscureText
    _obscureText = widget.obscureText ?? true;
  }

  void _togglePasswordVisibility() {
    setState(() {
      _obscureText = !_obscureText;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Determine whether to use widget's obscureText or our internal _obscureText
    final shouldShowPasswordToggle =
        widget.showPasswordToggle &&
        (widget.obscureText == true ||
            (widget.obscureText == null && widget.showPasswordToggle));
    final isObscureText = shouldShowPasswordToggle
        ? _obscureText
        : (widget.obscureText ?? false);

    return TextFormField(
      controller: widget.textEditingController,
      onEditingComplete: widget.onEditingComplete,
      focusNode: widget.focusNode,
      maxLength: widget.maxLength,
      textCapitalization: widget.textCapitalization ?? TextCapitalization.none,
      maxLines: widget.maxLines,
      validator: widget.validator,
      onFieldSubmitted: widget.onFieldSubmitted,
      obscureText: isObscureText,
      readOnly: widget.readOnly ?? false,
      onTap: widget.readOnly == true ? null : widget.onTap,
      cursorColor: const Color(0xFF757575),
      style: Theme.of(context).textTheme.bodyMedium!.copyWith(
        fontSize: 17.sp,
        fontWeight: FontWeight.w400,
        color: AppColors.appTextPrimary,
      ),
      keyboardType: widget.keyboardType ?? TextInputType.text,
      inputFormatters: widget.formatter,
      onChanged: widget.onChanged,
      decoration: InputDecoration(
        isDense: true,
        border: OutlineInputBorder(
          borderSide: BorderSide(color: AppColors.appBorder),
          borderRadius: BorderRadius.circular(3.w),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: AppColors.primaryColor),
          borderRadius: BorderRadius.circular(3.w),
        ),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: AppColors.appBorder),
          borderRadius: BorderRadius.circular(3.w),
        ),
        filled: true,
        fillColor: widget.readOnly == true
            ? AppColors.appSurfaceSoft
            : AppColors.appSurface,
        contentPadding: widget.contentPadding,
        counterText: widget.counterText,
        labelText: widget.labelText,
        labelStyle: Theme.of(context).textTheme.bodyMedium!.copyWith(
          fontSize: 15.sp,
          fontWeight: FontWeight.w400,
          color: AppColors.textGreyColor,
        ),
        floatingLabelStyle: Theme.of(context).textTheme.bodyMedium!.copyWith(
          fontSize: 15.sp,
          fontWeight: FontWeight.normal,
          color: AppColors.primaryColor,
        ),
        prefixIcon: widget.prefix,
        suffixIcon: _buildSuffixIcon(context, shouldShowPasswordToggle),
      ),
    );
  }

  Widget? _buildSuffixIcon(
    BuildContext context,
    bool shouldShowPasswordToggle,
  ) {
    if (shouldShowPasswordToggle) {
      // Show password visibility toggle
      return GestureDetector(
        onTap: _togglePasswordVisibility,
        child: Padding(
          padding: const EdgeInsets.only(right: 12.0),
          child: Icon(
            _obscureText ? Icons.visibility_off : Icons.visibility,
            size: 25,
            color: AppColors.primaryColor,
          ),
        ),
      );
    } else if (widget.suffixIcon != null) {
      // Show custom suffix icon
      return Padding(
        padding: const EdgeInsets.only(right: 12.0),
        child: Icon(
          widget.suffixIcon,
          size: 25,
          color: Theme.of(context).primaryColor,
        ),
      );
    }
    return null;
  }
}

import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/views/profileMoulde/giftCardModule/views/viewGiftCardHistory.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_paypal/flutter_paypal.dart';
import 'package:get/get_core/src/get_main.dart';
import 'package:get/get_navigation/src/extension_navigation.dart';

import '../../../../core/bloc/api_state.dart';
import '../../../../utills/UserService.dart';
import '../../../../utills/config.dart';
import '../../../navbarModule/views/bottomNavBarScreen.dart';
import '../../../packageModule/packagesList/bloc/order_bloc/gatewayEnablecheck.dart';
import '../../../packageModule/packagesList/bloc/order_bloc/gatewayEvent.dart';
import '../../../packageModule/packagesList/model/GatewayListModel.dart';
import '../../../packageModule/packagesList/view/GatewaySelectionDialog.dart';
import '../../../packageModule/packagesList/view/PaymentScreen.dart';
import '../../../paypalscreens/giftcardpurchase/initGiftCardModel.dart';
import '../../../paypalscreens/giftcardpurchase/initgiftcardblog.dart';
import '../../../paypalscreens/giftcardpurchase/initgiftcardevent.dart';
import '../../../paypalscreens/successScreen.dart';
import '../bloc/GiftCardHistoryevent.dart';
import '../bloc/GiftHistoryBloc.dart';
import 'package:esimconnect/utills/global.dart' as global;

class CreateGiftCardScreen extends StatefulWidget {
  const CreateGiftCardScreen({super.key});

  @override
  State<CreateGiftCardScreen> createState() => _CreateGiftCardScreenState();
}

class _CreateGiftCardScreenState extends State<CreateGiftCardScreen>
    with TickerProviderStateMixin {
  int? selectedAmount;
  bool isCustom = false;
  bool isSent = false;
  bool isLoading = false;

  final TextEditingController customAmountCtrl = TextEditingController();
  final TextEditingController recipientNameCtrl = TextEditingController();
  final TextEditingController recipientEmailCtrl = TextEditingController();
  final TextEditingController messageCtrl = TextEditingController();

  late AnimationController _cardAnimController;
  late AnimationController _buttonAnimController;
  late Animation<double> _cardAnimation;
  late Animation<double> _buttonScaleAnim;

  final List<int> amounts = [50, 100, 200, 500];

  // ── Color Palette ────────────────────────────────────────────────────────────
  static const Color primary = Color(0xFF48AB90);
  static const Color primaryLight = Color(0xFF6EC4AE);
  static const Color primaryBg = Color(0xFFEDF7F4);
  static const Color whiteBg = Color(0xFFFFFFFF);
  static const Color surfaceBg = Color(0xFFF5F7F6);
  static const Color borderColor = Color(0xFFE0EBEA);
  static const Color textDark = Color(0xFF1A2E2A);
  static const Color textMuted = Color(0xFF7A9E97);
  static const Color textLight = Color(0xFFAAC4BE);
  List<GatewayItem> _availableGateways = [];
  final _userService = UserService.to;
  @override
  void initState() {
    super.initState();
    _loadGateways();
    _cardAnimController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _cardAnimation = CurvedAnimation(
      parent: _cardAnimController,
      curve: Curves.easeOutBack,
    );
    _cardAnimController.forward();

    _buttonAnimController = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    _buttonScaleAnim = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _buttonAnimController, curve: Curves.easeInOut),
    );

    customAmountCtrl.addListener(() => setState(() {}));
    recipientNameCtrl.addListener(() => setState(() {}));
    recipientEmailCtrl.addListener(() => setState(() {}));
  }

  void _loadGateways() {
    context.read<GatewayEnableBloc>().add(GatewayEvent());
  }

  @override
  void dispose() {
    _cardAnimController.dispose();
    _buttonAnimController.dispose();
    customAmountCtrl.dispose();
    recipientNameCtrl.dispose();
    recipientEmailCtrl.dispose();
    messageCtrl.dispose();
    super.dispose();
  }

  int? get finalAmount {
    if (isCustom) return int.tryParse(customAmountCtrl.text);
    return selectedAmount;
  }

  bool get isValid =>
      finalAmount != null &&
      recipientNameCtrl.text.trim().isNotEmpty &&
      recipientEmailCtrl.text.trim().isNotEmpty;

  void _showGatewaySelectionDialog(BuildContext dialogContext) {
    showDialog(
      context: context,
      builder: (dialogContext) => GatewaySelectionDialog(
        gateways: _availableGateways,
        onSelected: (gateway) async {
          String amount = isCustom == false
              ? selectedAmount.toString()
              : customAmountCtrl.text;

          final uri = Uri.parse('$imageBaseUrl/gift-card-payment').replace(
            queryParameters: {
              'amount': amount,
              'currency': global.activeCurrencyname ?? 'USD',
              'email': _userService.currentUserData?.data?.email ?? '',
              'name': 'user',
              'recipientName': recipientNameCtrl.text,
              'gatewayId': gateway.id.toString(),
              'recipientEmail': recipientEmailCtrl.text,
              'message': messageCtrl.text,
              'guestAccessToken': 'karan',
            },
          );
          final url = uri.toString();
          print("name:- ${global.activeCurrencyname.toString()}");
          print("URL:- $url");
          print('provider:- ${gateway.provider}');
          if (gateway.provider == "paypal") {
            context.read<InitGitCardBloc>().add(
              Initgiftcardevent(
                amount: amount,
                currency: global.activeCurrencyname ?? "USD",
                email: _userService.currentUserData?.data?.email ?? "",
                gatewayId: gateway.id.toString(),
                message: messageCtrl.text,
                name: '',
                recipientEmail: recipientEmailCtrl.text,
                recipientName: recipientNameCtrl.text,
              ),
            );
            // _startPayment(gateway);
          } else {
            Get.to(
              () => PaymentScreen(
                url: url,
                paymentMethod: '${gateway.provider}',
                fromGiftPurchase: true,
              ),
            );
          }
        },
        isLoading: false,
      ),
    );
  }

  void handleSend() async {
    if (!isValid) return;
    // HapticFeedback.mediumImpact();
    // await _buttonAnimController.forward();
    // await _buttonAnimController.reverse();
    // setState(() => isLoading = true);

    // await Future.delayed(const Duration(milliseconds: 2000));
    _showGatewaySelectionDialog(context);

    ///

    ///
    // setState(() {
    //   isLoading = false;
    //   isSent = true;
    // });
    // HapticFeedback.heavyImpact();
  }

  void resetForm() {
    setState(() {
      selectedAmount = null;
      isCustom = false;
      isSent = false;
      customAmountCtrl.clear();
      recipientNameCtrl.clear();
      recipientEmailCtrl.clear();
      messageCtrl.clear();
    });
    _cardAnimController.reset();
    _cardAnimController.forward();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: whiteBg,
      body: isSent ? _buildSuccessScreen() : _buildFormScreen(),
    );
  }

  // ─── SUCCESS SCREEN ──────────────────────────────────────────────────────────

  Widget _buildSuccessScreen() {
    return Container(
      color: whiteBg,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [primary, primaryLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: primary.withOpacity(0.3),
                      blurRadius: 40,
                      spreadRadius: 8,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text('🎁', style: TextStyle(fontSize: 46)),
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'Gift Sent!',
                style: TextStyle(
                  color: textDark,
                  fontSize: 34,
                  fontWeight: FontWeight.normal,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Your ₹${finalAmount} gift card has been\ndelivered to ${recipientEmailCtrl.text}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: textMuted,
                  fontSize: 15,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 40),
              GestureDetector(
                onTap: resetForm,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 36,
                    vertical: 15,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [primary, primaryLight],
                    ),
                    borderRadius: BorderRadius.circular(50),
                    boxShadow: [
                      BoxShadow(
                        color: primary.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Text(
                    'Send Another',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.normal,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── MAIN FORM SCREEN ────────────────────────────────────────────────────────

  Widget _buildFormScreen() {
    return Container(
      color: whiteBg,
      child: SafeArea(
        child: MultiBlocListener(
          listeners: [
            BlocListener<GatewayEnableBloc, ApiState<GatewayListModel>>(
              listener: (context, state) {
                if (state is ApiLoading) {
                  // setState(() => _isLoadingGateways = true);
                } else if (state is ApiSuccess<GatewayListModel>) {
                  setState(() {
                    // _isLoadingGateways = false;
                    // gatewaysLoaded = true;

                    /// remove paypal from gateway list
                    _availableGateways = state.data.data!;
                    // isInAppBillingAvailable = state.data.inAppPurchase ?? false;
                    // log('🔹 InAppBilling API: $isInAppBillingAvailable');

                    // if (isInAppBillingAvailable) {
                    //   _availableGateways.add(
                    //     GatewayItem(
                    //       id: 'GpayInAppPurchase',
                    //       displayName: 'Google Pay / In-App Purchase',
                    //     ),
                    //   );
                    // }
                  });
                } else if (state is ApiFailure) {
                  setState(() {
                    // _isLoadingGateways = false;
                    // gatewaysLoaded = true;
                  });
                }
              },
            ),
          ],
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),
                      _buildHeader(),
                      const SizedBox(height: 24),
                      _buildGiftCardPreview(),
                      const SizedBox(height: 28),
                      _buildAmountSection(),
                      const SizedBox(height: 28),
                      _buildRecipientSection(),
                      const SizedBox(height: 28),
                      _buildMessageSection(),
                      const SizedBox(height: 24),
                      if (isValid) _buildSummaryRow(),
                      if (isValid) const SizedBox(height: 16),
                      _buildSendButton(),
                      const SizedBox(height: 12),
                      Center(
                        child: Text(
                          'Delivered instantly to recipient\'s email',
                          style: TextStyle(color: textLight, fontSize: 12),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── HEADER ─────────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            GestureDetector(
              onTap: () => Navigator.maybePop(context),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: surfaceBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor),
                ),
                child: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: textDark,
                  size: 16,
                ),
              ),
            ),
            const Spacer(),
            InkWell(
              onTap: () {
                context.read<GiftHistoryBloc>().add(GiftHistoryevent());
                Get.to(() => Viewgiftcardhistory());
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: primaryBg,
                  borderRadius: BorderRadius.circular(50),
                  border: Border.all(color: primary.withOpacity(0.2)),
                ),
                child: Row(
                  children: const [
                    Text(
                      'History',
                      style: TextStyle(
                        color: primary,
                        fontSize: 11,
                        fontWeight: FontWeight.normal,
                        letterSpacing: 0.1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        RichText(
          text: const TextSpan(
            style: TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.normal,
              color: textDark,
              height: 1.15,
              letterSpacing: -0.5,
            ),
            children: [
              TextSpan(text: 'Send a '),
              TextSpan(
                text: 'Gift',
                style: TextStyle(color: primary, fontStyle: FontStyle.italic),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Share the joy of connectivity with\nsomeone special',
          style: TextStyle(color: textMuted, fontSize: 15, height: 1.6),
        ),
      ],
    );
  }

  // ─── GIFT CARD PREVIEW ───────────────────────────────────────────────────────

  Widget _buildGiftCardPreview() {
    return ScaleTransition(
      scale: _cardAnimation,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [primary, Color(0xFF3A9880), primaryLight],
          ),
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: primary.withOpacity(0.35),
              blurRadius: 28,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative circles
            Positioned(
              top: -30,
              right: -30,
              child: Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.08),
                ),
              ),
            ),
            Positioned(
              bottom: -20,
              left: 60,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.06),
                ),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'eSIM CONNECT',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 11,
                            fontWeight: FontWeight.normal,
                            letterSpacing: 0.15,
                          ),
                        ),
                        const SizedBox(height: 6),
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: finalAmount != null
                              ? Text(
                                  '₹${finalAmount}',
                                  key: ValueKey(finalAmount),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 34,
                                    fontWeight: FontWeight.normal,
                                    letterSpacing: -1,
                                  ),
                                )
                              : Text(
                                  'Select amount',
                                  key: const ValueKey('placeholder'),
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.4),
                                    fontSize: 22,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                        ),
                      ],
                    ),
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Center(
                        child: Text('🎁', style: TextStyle(fontSize: 26)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                Container(height: 1, color: Colors.white.withOpacity(0.15)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TO',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.55),
                            fontSize: 10,
                            letterSpacing: 0.12,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        const SizedBox(height: 4),
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: Text(
                            recipientNameCtrl.text.isNotEmpty
                                ? recipientNameCtrl.text
                                : 'Recipient Name',
                            key: ValueKey(recipientNameCtrl.text),
                            style: TextStyle(
                              color: recipientNameCtrl.text.isNotEmpty
                                  ? Colors.white
                                  : Colors.white.withOpacity(0.3),
                              fontSize: 17,
                              fontWeight: FontWeight.normal,
                              fontStyle: recipientNameCtrl.text.isEmpty
                                  ? FontStyle.italic
                                  : FontStyle.normal,
                            ),
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: List.generate(4, (i) {
                        return Container(
                          width: 7,
                          height: 7,
                          margin: const EdgeInsets.only(left: 5),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: i == 3
                                ? Colors.white
                                : Colors.white.withOpacity(0.35),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── AMOUNT SELECTION ────────────────────────────────────────────────────────

  Widget _buildAmountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('Select Amount'),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.1,
          children: amounts.map((amt) => _buildAmountCard(amt)).toList(),
        ),
        const SizedBox(height: 10),
        _buildCustomAmountCard(),
      ],
    );
  }

  Widget _buildAmountCard(int amt) {
    final bool isSelected = !isCustom && selectedAmount == amt;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          selectedAmount = amt;
          isCustom = false;
          customAmountCtrl.clear();
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? primary : surfaceBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? primary : borderColor,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: primary.withOpacity(0.25),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : null,
        ),
        child: Stack(
          children: [
            if (isSelected)
              Positioned(
                top: 7,
                right: 8,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.25),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    size: 10,
                    color: Colors.white,
                  ),
                ),
              ),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '₹',
                    style: TextStyle(
                      color: isSelected
                          ? Colors.white.withOpacity(0.7)
                          : textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$amt',
                    style: TextStyle(
                      color: isSelected ? Colors.white : textDark,
                      fontSize: 22,
                      fontWeight: FontWeight.normal,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomAmountCard() {
    return GestureDetector(
      onTap: () => setState(() {
        isCustom = true;
        selectedAmount = null;
      }),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isCustom ? primaryBg : surfaceBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isCustom ? primary : borderColor,
            width: isCustom ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isCustom ? primary.withOpacity(0.15) : borderColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Text('✏️', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: isCustom
                  ? Row(
                      children: [
                        const Text(
                          '₹',
                          style: TextStyle(
                            color: primary,
                            fontSize: 20,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: TextField(
                            controller: customAmountCtrl,
                            autofocus: true,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(
                              color: textDark,
                              fontSize: 18,
                              fontWeight: FontWeight.normal,
                            ),
                            decoration: const InputDecoration(
                              hintText: 'Enter amount',
                              hintStyle: TextStyle(
                                color: textLight,
                                fontSize: 16,
                              ),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Custom Amount',
                          style: TextStyle(
                            color: textDark,
                            fontSize: 14,
                            fontWeight: FontWeight.normal,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Enter any amount you want',
                          style: TextStyle(color: textMuted, fontSize: 12),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── RECIPIENT SECTION ───────────────────────────────────────────────────────

  Widget _buildRecipientSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel('Recipient Details'),
        const SizedBox(height: 14),
        _buildTextField(
          controller: recipientNameCtrl,
          label: 'Recipient Name',
          hint: 'Full name',
          prefixIcon: Icons.person_outline_rounded,
          keyboardType: TextInputType.name,
        ),
        const SizedBox(height: 12),
        _buildTextField(
          controller: recipientEmailCtrl,
          label: 'Recipient Gmail',
          hint: 'example@gmail.com',
          prefixIcon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
      ],
    );
  }

  // ─── MESSAGE SECTION ─────────────────────────────────────────────────────────

  Widget _buildMessageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _sectionLabel('Personal Message'),
            const SizedBox(width: 8),
            const Text(
              'optional',
              style: TextStyle(
                color: textLight,
                fontSize: 11,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          decoration: BoxDecoration(
            color: surfaceBg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: borderColor),
          ),
          child: TextField(
            controller: messageCtrl,
            maxLines: 4,
            style: const TextStyle(color: textDark, fontSize: 15),
            decoration: const InputDecoration(
              hintText: 'Write a heartfelt message...',
              hintStyle: TextStyle(color: textLight, fontSize: 14),
              contentPadding: EdgeInsets.all(16),
              border: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }

  // ─── SUMMARY ROW ─────────────────────────────────────────────────────────────

  Widget _buildSummaryRow() {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 300),
      opacity: isValid ? 1.0 : 0.0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: primaryBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: primary.withOpacity(0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "You're sending",
                  style: TextStyle(color: textMuted, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹${finalAmount}',
                  style: const TextStyle(
                    color: textDark,
                    fontSize: 22,
                    fontWeight: FontWeight.normal,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text(
                  'To',
                  style: TextStyle(color: textMuted, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  recipientNameCtrl.text,
                  style: const TextStyle(
                    color: primary,
                    fontSize: 15,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── SEND BUTTON ─────────────────────────────────────────────────────────────

  Widget _buildSendButton() {
    return MultiBlocListener(
      listeners: [
        BlocListener<InitGitCardBloc, ApiState<InitGiftCardModel>>(
          listener: (context, state) {
            print("state");
            print("${state}");
            if (state is ApiLoading) {
              print("api loading..");
              // setState(() => _isLoadingGateways = true);
            } else if (state is ApiSuccess) {
              print("init appi success");
              print(
                "init appi success ${state.data!.payment!.publicKey.toString()}",
              );
              print(
                "clientscret ${state.data!.payment!.clientSecret.toString()}",
              );
              _startPayment(
                state.data!.payment!.publicKey.toString(),
                state.data!.payment!.clientSecret.toString(),
                state.data!.payment!.amount.toString(),
                state.data!.payment!.currency.toString(),
                recipientEmailCtrl.text.toString(),
                recipientNameCtrl.text.toString(),
                messageCtrl.text.toString(),
                state.data!.payment!.config!.mode.toString(),
              );
            } else if (state is ApiFailure) {
              print("init api failure");
            }
          },
        ),
      ],
      child: ScaleTransition(
        scale: _buttonScaleAnim,
        child: GestureDetector(
          onTap: isValid && !isLoading ? handleSend : null,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: double.infinity,
            height: 58,
            decoration: BoxDecoration(
              gradient: isValid
                  ? const LinearGradient(
                      colors: [primary, primaryLight],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    )
                  : null,
              color: isValid ? null : const Color(0xFFE8EDEC),
              borderRadius: BorderRadius.circular(16),
              boxShadow: isValid
                  ? [
                      BoxShadow(
                        color: primary.withOpacity(0.35),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ]
                  : null,
            ),
            child: Center(
              child: isLoading
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Text(
                          'Processing...',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.normal,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('🎁', style: TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Text(
                          'Send Gift Card',
                          style: TextStyle(
                            color: isValid ? Colors.white : textLight,
                            fontWeight: FontWeight.normal,
                            fontSize: 16,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  Widget _sectionLabel(String text) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        color: textMuted,
        fontSize: 11,
        fontWeight: FontWeight.normal,
        letterSpacing: 0.1,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData prefixIcon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: textMuted,
            fontSize: 12,
            fontWeight: FontWeight.normal,
            letterSpacing: 0.05,
          ),
        ),
        const SizedBox(height: 8),
        Focus(
          child: Builder(
            builder: (context) {
              final isFocused = Focus.of(context).hasFocus;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: surfaceBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isFocused ? primary : borderColor,
                    width: isFocused ? 1.5 : 1,
                  ),
                  boxShadow: isFocused
                      ? [
                          BoxShadow(
                            color: primary.withOpacity(0.1),
                            blurRadius: 10,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
                child: TextField(
                  controller: controller,
                  keyboardType: keyboardType,
                  style: const TextStyle(color: textDark, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: hint,
                    hintStyle: const TextStyle(color: textLight, fontSize: 14),
                    prefixIcon: Icon(
                      prefixIcon,
                      color: isFocused ? primary : textLight,
                      size: 20,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    border: InputBorder.none,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _startPayment(
    String clientId,
    String clientSecret,
    String amount,
    String currency,
    String recipientEmail,
    String recipientName,
    String message,
    String paymentGatewaylive,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (BuildContext context) => UsePaypal(
          sandboxMode: paymentGatewaylive.toString() == "live" ? false : true,
          // clientId:
          //     "AbkMnhOcacB2U51c91GLc3zmUL1nKnd9e_fppe84tHWYkULgjljtkaDaXIb6OLWDzOhgCjJJT8TKscuG",
          // secretKey:
          //     "EMFFS4v0fvQBQDG8HIC-z01jl5WapeJN3t0wUhsZI3B4siKBAxKPStncyO7HDgp7S4wPStBgm1vUH-oG",
          clientId: clientId,
          secretKey: clientSecret,
          returnURL: "${imageBaseUrl}/return",
          cancelURL: "${imageBaseUrl}/cancel",
          transactions: [
            {
              "amount": {
                "total": "${amount}",
                "currency": currency,
                "details": {"subtotal": amount},
              },
              "description": "Payment for GiftCard",
              "item_list": {
                "items": [
                  {
                    "name": "Gift Card",
                    "quantity": 1,
                    "price": amount,
                    "currency": currency,
                  },
                ],
                // "shipping_address": {
                //   "recipient_name": "John Doe",
                //   "line1": "123 Main Street",
                //   "city": "San Francisco",
                //   "country_code": "US",
                //   "postal_code": "94102",
                //   "phone": "+1234567890",
                //   "state": "CA",
                // },
              },
            },
          ],
          note: "Contact us for any questions on your order.",
          onSuccess: (Map params) async {
            print("✅ onSuccess: $params");

            // ✅ Add 500ms delay to let widget complete dispose
            await Future.delayed(const Duration(seconds: 1));

            if (mounted) {
              // WidgetsBinding.instance.addPostFrameCallback((_) {
              //   if (mounted) {
              //     Navigator.pop(context);
              //   }
              // });
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted) {
                  // ✅ Use Get.off() instead of Navigator

                  Get.off(
                    () => PaymentSuccessScreen(
                      paymentId: params['paymentId'].toString(),
                      packageId: '',
                      userId:
                          _userService.currentUserData?.data?.token == null ||
                              _userService.currentUserData?.data?.token
                                      .toString() ==
                                  "null"
                          ? ""
                          : _userService.currentUserData!.data!.id.toString(),
                      isGuest: false,
                      guestEmail: '',
                      fromGiftCard: true,
                      amount: amount,
                      currency: currency,
                      recipientEmail: recipientEmail,
                      recipientName: recipientName,
                      message: message,
                    ),
                  );
                }
              });
              //Close PayPal screen

              // Navigate to your success screen
            }
            // Navigator.pop(context);

            // _showSuccessDialog(params);
          },
          onError: (error) {
            print("onerror:- ${error}");
            global.showToastMessage(message: tr("Gift Card Payment Failed"));
            Get.off(() => BottomNavigationBarScreen(index: 0));
          },
          onCancel: (params) {
            print("oncancel:- ${params}");
            global.showToastMessage(message: tr("Gift Card Payment Failed"));
            Get.off(() => BottomNavigationBarScreen(index: 0));
          },
        ),
      ),
    );
  }
}

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../model/GatewayListModel.dart';

class GatewaySelectionDialog extends StatelessWidget {
  final List<GatewayItem> gateways;
  final Function(GatewayItem) onSelected;
  final bool isLoading;

  const GatewaySelectionDialog({
    super.key,
    required this.gateways,
    required this.onSelected,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      elevation: 0,
      insetPadding: const EdgeInsets.all(20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Payment Method',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.normal,
                      fontSize: 20,
                    ),
                  ).tr(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.close, color: Colors.grey[600]),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    style: IconButton.styleFrom(
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Choose how you want to pay',
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
              ).tr(),
              const SizedBox(height: 24),

              // --- Content Section ---
              if (isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator.adaptive()),
                )
              else if (gateways.isEmpty)
                _buildEmptyState(context)
              else
                Flexible(
                  child: SingleChildScrollView(
                    child: Column(
                      children: gateways
                          .map((gateway) => _buildGatewayItem(context, gateway))
                          .toList(),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGatewayItem(BuildContext context, GatewayItem gateway) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.pop(context);
            onSelected(gateway);
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      gateway.provider?[0].toUpperCase() ?? 'G',
                      style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.normal,
                        fontSize: 20,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // Text Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        gateway.displayName ?? 'Payment Gateway',
                        style: const TextStyle(
                          fontWeight: FontWeight.normal,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        gateway.provider ?? 'Secure payment',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),

                // Selection Indicator (Arrow)
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: Colors.grey[400],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.credit_card_off, size: 48, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'No payment methods available',
              style: TextStyle(color: Colors.grey[600]),
            ).tr(),
          ],
        ),
      ),
    );
  }
}

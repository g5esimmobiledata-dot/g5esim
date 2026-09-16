import 'package:esimconnect/views/myEsimModule/controller/myesimController.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class EsimInstallationWidget extends StatefulWidget {
  final String? esimQr;
  const EsimInstallationWidget({super.key, this.esimQr});
  @override
  State<EsimInstallationWidget> createState() => _EsimInstallationWidgetState();
}

class _EsimInstallationWidgetState extends State<EsimInstallationWidget> {
  final esimController = Get.find<MyESimController>();
  @override
  void initState() {
    super.initState();
    if (widget.esimQr != null) {
      esimController.eSIMCodeController.text = widget.esimQr!;
      esimController.update();
    }
  }

  Future<void> _installEsim() async {
    final qrCodeData = esimController.eSIMCodeController.text;
    if (qrCodeData.isEmpty) {
      esimController.installationMessage = 'Please enter an eSIM code.';
      esimController.update();
      return;
    }
    final parts = qrCodeData.split('\$');
    if (parts.length != 3 || !parts[0].startsWith('LPA:')) {
      esimController.installationMessage =
          'Invalid eSIM code format. Expected "LPA:1\$smdp.address\$token".';
      esimController.update();
      return;
    }

    esimController.isLoading = true;
    esimController.installationMessage = 'Initiating eSIM installation...';
    esimController.update();

    try {
      esimController.update();
    } catch (e) {
      esimController.installationMessage =
          'An error occurred during installation: $e';
      esimController.update();
    } finally {
      esimController.isLoading = false;
      esimController.update();
    }
  }

  void _showInstructions() {
    Get.dialog(
      Builder(
        builder: (context) => AlertDialog(
          title: const Text('eSIM Installation Instructions'),
          content: SingleChildScrollView(
            child: Text(esimController.instructions),
          ),
          actions: <Widget>[
            TextButton(onPressed: () => Get.back(), child: const Text('OK')),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('eSIM Installation')),
      body: GetBuilder<MyESimController>(
        builder: (esimController) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  esimController.isEsimSupported == null
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(strokeWidth: 0.5),
                            SizedBox(height: 16),
                            Text('Checking device compatibility...'),
                          ],
                        )
                      : esimController.isEsimSupported == true
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text(
                              'Enter your LPA activation code or QR code data to begin installation.',
                              style: TextStyle(fontSize: 16),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              controller: esimController.eSIMCodeController,
                              decoration: const InputDecoration(
                                border: OutlineInputBorder(),
                                labelText:
                                    'eSIM Code (LPA:1\$smdp.address\$token)',
                              ),
                            ),
                            const SizedBox(height: 20),
                            esimController.isLoading
                                ? const CircularProgressIndicator()
                                : ElevatedButton(
                                    onPressed: _installEsim,
                                    child: const Text('Install eSIM Profile'),
                                  ),
                            const SizedBox(height: 10),
                            ElevatedButton(
                              onPressed: _showInstructions,
                              child: const Text('Show Instructions'),
                            ),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              color: Colors.red,
                              size: 60,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'This device does not support eSIM installation.',
                              style: TextStyle(fontSize: 18, color: Colors.red),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                  const SizedBox(height: 10),
                  if (esimController.installationMessage.isNotEmpty)
                    Text(
                      esimController.installationMessage,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color:
                            esimController.installationMessage.contains(
                              'successfully',
                            )
                            ? Colors.green
                            : Colors.red,
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

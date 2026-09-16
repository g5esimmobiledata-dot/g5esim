import { Router } from 'express';
import { requireAuth } from 'server/middleware/auth';
import * as ApiResponse from 'server/utils/response';
import {
  buildVonageVoiceAnswerNcco,
  createVonageVoiceSession,
  createVirtualNumberApplication,
  deleteUserVirtualNumberVoicemail,
  ensureVonageSchema,
  getVonageUserDashboard,
  getUserVirtualNumberVoicemails,
  getUserVirtualNumberWorkspace,
  getUserVirtualNumberSelection,
  handleVonageVoiceEvent,
  requestUserVirtualNumberSenderId,
  sendUserVirtualSms,
  sendUserVirtualSmsFromNumber,
  storeInboundVonageSms,
  storeVonageSmsDeliveryStatus,
  storeVonageVoicemail,
  updateUserVirtualNumberSettings,
} from 'server/services/vonage-service';
import {
  getOrCreateUserSipAccount,
  testUserSipAccountConnection,
  toPublicUserSipAccount,
} from 'server/services/user-sip-service';

const router = Router();

function cleanErrorMessage(error: unknown) {
  return String(error instanceof Error ? error.message : error || '').trim();
}

function customerSmsErrorMessage(error: unknown) {
  const message = cleanErrorMessage(error);
  const lower = message.toLowerCase();

  if (!message) return 'SMS could not be sent right now. Please try again later.';
  if (lower.includes('recipient') && lower.includes('required')) return 'Recipient number is required';
  if (lower.includes('message text') && lower.includes('required')) return 'Message text is required';
  if (lower.includes('recipient') && (lower.includes('invalid') || lower.includes('mobile number'))) {
    return 'Recipient number is invalid.';
  }
  if (lower.includes('sender id') && lower.includes('approved')) {
    return 'Select an approved Sender ID before sending SMS.';
  }
  if (lower.includes('sender id') && lower.includes('limit')) return message;
  if (lower.includes('virtual number')) return message.replace(/virtual number/gi, 'eRoaming number');

  if (
    /easysendsms|vonage|provider|carrier|gateway|sms_carrier|own sms|api|http|credential|username|password|token/i.test(
      message,
    )
  ) {
    return 'SMS could not be sent right now. Please try again later or contact support.';
  }

  return message;
}

router.use(async (_req, _res, next) => {
  try {
    await ensureVonageSchema();
    next();
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', requireAuth, async (req: any, res) => {
  try {
    const data = await getVonageUserDashboard(req.userId);
    return ApiResponse.success(res, 'eRoaming dashboard loaded successfully', data);
  } catch (error: any) {
    return ApiResponse.serverError(res, error.message || 'Failed to load eRoaming dashboard');
  }
});

router.get('/sip-account', requireAuth, async (req: any, res) => {
  try {
    const account = await getOrCreateUserSipAccount(req.userId);
    return ApiResponse.success(res, 'SIP account loaded successfully', {
      sipAccount: toPublicUserSipAccount(account),
    });
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to load SIP account');
  }
});

router.post('/sip-account/test', requireAuth, async (req: any, res) => {
  try {
    const data = await testUserSipAccountConnection(req.userId);
    return ApiResponse.success(res, 'Free SIP account connection test completed', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to test Free SIP account');
  }
});

router.post('/voice/session', requireAuth, async (req: any, res) => {
  try {
    const data = await createVonageVoiceSession(req.userId, {
      direction: req.body?.direction === 'inbound' ? 'inbound' : 'outbound',
      referenceNumber: req.body?.referenceNumber || req.body?.to || req.body?.from || null,
    });
    return ApiResponse.success(res, 'eRoaming voice session created successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to create eRoaming voice session');
  }
});

router.get('/selection', requireAuth, async (req: any, res) => {
  try {
    const countryCode = String(req.query?.countryCode || '')
      .trim()
      .toUpperCase();
    const search = String(req.query?.search || '').trim();
    const data = await getUserVirtualNumberSelection(countryCode, search);
    return ApiResponse.success(res, 'Virtual number selection loaded successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to load virtual number selection');
  }
});

router.post('/apply', requireAuth, async (req: any, res) => {
  try {
    const countryCode = String(req.body?.countryCode || '')
      .trim()
      .toUpperCase();
    const desiredNumber = String(req.body?.desiredNumber || '').trim();
    const notes = String(req.body?.notes || '').trim();
    const inventoryId = String(req.body?.inventoryId || '').trim();
    const quantity = Math.max(1, Number(req.body?.quantity) || 1);
    const packageTerm = req.body?.packageTerm;
    const paymentMethod = req.body?.paymentMethod;
    const autoRenew = req.body?.autoRenew;
    const reminderDays = req.body?.reminderDays;
    const forwardingType = req.body?.forwardingType;
    const forwardingDestination = String(req.body?.forwardingDestination || '').trim();

    if (!countryCode || countryCode.length !== 2) {
      return ApiResponse.badRequest(res, 'A valid 2-letter country code is required');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${baseUrl}/api/webhooks/vonage/inbound-sms`;

    const result = await createVirtualNumberApplication({
      userId: req.userId,
      countryCode,
      desiredNumber,
      notes,
      webhookUrl,
      inventoryId,
      quantity,
      packageTerm,
      paymentMethod,
      autoRenew,
      reminderDays,
      forwardingType,
      forwardingDestination,
    });

    return ApiResponse.success(
      res,
      result.mode === 'pending_payment'
        ? 'eRoaming virtual number reserved pending payment'
        : 'eRoaming application submitted successfully',
      result,
    );
  } catch (error: any) {
    return ApiResponse.badRequest(
      res,
      error.message || 'Failed to submit the eRoaming virtual number application',
    );
  }
});

router.post('/messages/send', requireAuth, async (req: any, res) => {
  try {
    const to = String(req.body?.to || '').trim();
    const text = String(req.body?.text || '').trim();

    if (!to) {
      return ApiResponse.badRequest(res, 'Recipient number is required');
    }
    if (!text) {
      return ApiResponse.badRequest(res, 'Message text is required');
    }

    const senderId = String(req.body?.senderId || '').trim();
    const sms = await sendUserVirtualSms(req.userId, to, text, senderId);
    return ApiResponse.success(res, 'SMS sent successfully', sms);
  } catch (error: any) {
    return ApiResponse.badRequest(res, customerSmsErrorMessage(error));
  }
});

router.get('/numbers', requireAuth, async (req: any, res) => {
  try {
    const data = await getUserVirtualNumberWorkspace(req.userId);
    return ApiResponse.success(res, "My DID's loaded successfully", data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || "Failed to load My DID's");
  }
});

router.get('/numbers/:id', requireAuth, async (req: any, res) => {
  try {
    const data = await getUserVirtualNumberWorkspace(req.userId, String(req.params.id || '').trim());
    return ApiResponse.success(res, 'DID workspace loaded successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to load DID workspace');
  }
});

router.post('/numbers/:id/messages/send', requireAuth, async (req: any, res) => {
  try {
    const to = String(req.body?.to || '').trim();
    const text = String(req.body?.text || '').trim();

    if (!to) {
      return ApiResponse.badRequest(res, 'Recipient number is required');
    }
    if (!text) {
      return ApiResponse.badRequest(res, 'Message text is required');
    }

    const senderId = String(req.body?.senderId || '').trim();
    const sms = await sendUserVirtualSmsFromNumber(
      req.userId,
      String(req.params.id || '').trim(),
      to,
      text,
      senderId,
    );
    return ApiResponse.success(res, 'SMS sent successfully', sms);
  } catch (error: any) {
    return ApiResponse.badRequest(res, customerSmsErrorMessage(error));
  }
});

router.post('/numbers/:id/voice/session', requireAuth, async (req: any, res) => {
  try {
    const data = await createVonageVoiceSession(req.userId, {
      direction: req.body?.direction === 'inbound' ? 'inbound' : 'outbound',
      referenceNumber: req.body?.referenceNumber || req.body?.to || req.body?.from || null,
      virtualNumberId: String(req.params.id || '').trim(),
    });
    return ApiResponse.success(res, 'DID voice session created successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to create DID voice session');
  }
});

router.get('/numbers/:id/voicemail', requireAuth, async (req: any, res) => {
  try {
    const data = await getUserVirtualNumberVoicemails(
      req.userId,
      String(req.params.id || '').trim(),
    );
    return ApiResponse.success(res, 'Voice Mail loaded successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to load Voice Mail');
  }
});

router.delete('/numbers/:id/voicemail/:voicemailId', requireAuth, async (req: any, res) => {
  try {
    const data = await deleteUserVirtualNumberVoicemail(
      req.userId,
      String(req.params.id || '').trim(),
      String(req.params.voicemailId || '').trim(),
    );
    return ApiResponse.success(res, 'Voice Mail deleted successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to delete Voice Mail');
  }
});

router.patch('/numbers/:id/settings', requireAuth, async (req: any, res) => {
  try {
    const data = await updateUserVirtualNumberSettings(
      req.userId,
      String(req.params.id || '').trim(),
      {
        autoRenew: req.body?.autoRenew,
        reminderDays: req.body?.reminderDays,
        forwardingType: req.body?.forwardingType,
        forwardingDestination: req.body?.forwardingDestination,
        cancelAtPeriodEnd: req.body?.cancelAtPeriodEnd,
      },
    );

    return ApiResponse.success(res, 'Virtual number settings updated successfully', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to update virtual number settings');
  }
});

router.patch('/numbers/:id/sender-id', requireAuth, async (req: any, res) => {
  try {
    const data = await requestUserVirtualNumberSenderId(
      req.userId,
      String(req.params.id || '').trim(),
      String(req.body?.senderId || '').trim(),
    );

    return ApiResponse.success(res, 'Sender ID request submitted for approval', data);
  } catch (error: any) {
    return ApiResponse.badRequest(res, error.message || 'Failed to request Sender ID');
  }
});

router.all('/inbound-sms', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    await storeInboundVonageSms(payload as Record<string, any>);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Vonage inbound SMS webhook error:', error);
    return res.status(200).send('OK');
  }
});

router.all('/webhooks/inbound-sms', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    await storeInboundVonageSms(payload as Record<string, any>);
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Vonage inbound SMS webhook error:', error);
    return res.status(200).send('OK');
  }
});

const handleSmsDeliveryStatus = async (req: any, res: any) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    await storeVonageSmsDeliveryStatus(payload as Record<string, any>);
    return res.status(204).send();
  } catch (error) {
    console.error('Vonage SMS delivery status webhook error:', error);
    return res.status(204).send();
  }
};

router.all('/sms/status', handleSmsDeliveryStatus);
router.all('/delivery-status', handleSmsDeliveryStatus);
router.all('/webhooks/sms/status', handleSmsDeliveryStatus);
router.all('/webhooks/delivery-status', handleSmsDeliveryStatus);

router.all('/voice/answer', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const ncco = await buildVonageVoiceAnswerNcco(payload as Record<string, any>, baseUrl);
    return res.status(200).json(ncco);
  } catch (error) {
    console.error('Vonage voice answer webhook error:', error);
    return res.status(200).json([
      {
        action: 'talk',
        text: 'eRoaming voice is temporarily unavailable.',
      },
    ]);
  }
});

router.all('/webhooks/voice/answer', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const ncco = await buildVonageVoiceAnswerNcco(payload as Record<string, any>, baseUrl);
    return res.status(200).json(ncco);
  } catch (error) {
    console.error('Vonage voice answer webhook error:', error);
    return res.status(200).json([
      {
        action: 'talk',
        text: 'eRoaming voice is temporarily unavailable.',
      },
    ]);
  }
});

router.all('/voice/events', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    await handleVonageVoiceEvent(payload as Record<string, any>);
    return res.status(204).send();
  } catch (error) {
    console.error('Vonage voice event webhook error:', error);
    return res.status(204).send();
  }
});

router.all('/webhooks/voice/events', async (req, res) => {
  try {
    const payload = req.method === 'GET' ? req.query : req.body;
    await handleVonageVoiceEvent(payload as Record<string, any>);
    return res.status(204).send();
  } catch (error) {
    console.error('Vonage voice event webhook error:', error);
    return res.status(204).send();
  }
});

router.all('/voice/voicemail', async (req, res) => {
  try {
    const payload = {
      ...(req.method === 'GET' ? req.query : req.body),
      ...(req.query || {}),
    };
    await storeVonageVoicemail(payload as Record<string, any>);
    return res.status(204).send();
  } catch (error) {
    console.error('Vonage voice voicemail webhook error:', error);
    return res.status(204).send();
  }
});

router.all('/webhooks/voice/voicemail', async (req, res) => {
  try {
    const payload = {
      ...(req.method === 'GET' ? req.query : req.body),
      ...(req.query || {}),
    };
    await storeVonageVoicemail(payload as Record<string, any>);
    return res.status(204).send();
  } catch (error) {
    console.error('Vonage voice voicemail webhook error:', error);
    return res.status(204).send();
  }
});

export default router;

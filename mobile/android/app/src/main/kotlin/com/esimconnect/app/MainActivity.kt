package com.g5esim.mobile

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.vonage.android_core.PushType
import com.vonage.android_core.VGClientConfig
import com.vonage.clientcore.core.api.ClientConfigRegion
import com.vonage.voice.api.VoiceClient
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.linphone.core.Account
import org.linphone.core.AudioDevice
import org.linphone.core.Call
import org.linphone.core.Core
import org.linphone.core.CoreListenerStub
import org.linphone.core.Factory
import org.linphone.core.RegistrationState
import org.linphone.core.TransportType

class MainActivity : FlutterFragmentActivity() {
    private val channelName = "esimconnect/voice"
    private val voicePermissionRequestCode = 7301
    private var currentBackend: String = "voice"
    private var currentState: String = "idle"
    private var currentNumber: String = ""
    private var currentDirection: String = "none"
    private var currentCallId: String = ""
    private var currentSessionId: String = ""
    private var currentPushDeviceId: String = ""
    private var isSpeakerphoneEnabled: Boolean = false
    private var isMicrophoneMuted: Boolean = false
    private var sessionSnapshot: Map<String, Any?> = emptyMap()
    private var voiceChannel: MethodChannel? = null
    private var voiceClient: VoiceClient? = null
    private var sipCore: Core? = null
    private var sipAccount: Account? = null
    private var sipCall: Call? = null
    private var toneGenerator: ToneGenerator? = null
    private var chatRingtone: Ringtone? = null
    private var pendingSipCallResult: MethodChannel.Result? = null
    private var pendingSipDestination: String = ""
    private val mainHandler = Handler(Looper.getMainLooper())
    private val sipListener = object : CoreListenerStub() {
        override fun onAccountRegistrationStateChanged(
            core: Core,
            account: Account,
            state: RegistrationState,
            message: String
        ) {
            if (account != sipAccount || pendingSipCallResult == null) return

            when (state) {
                RegistrationState.Ok -> startPendingSipInvite()
                RegistrationState.Failed, RegistrationState.Cleared -> {
                    val result = pendingSipCallResult ?: return
                    pendingSipCallResult = null
                    currentState = "failed"
                    result.error(
                        "sip_registration_failed",
                        if (message.isBlank()) "SIP registration failed." else message,
                        callState()
                    )
                }
                else -> Unit
            }
        }

        override fun onCallStateChanged(core: Core, call: Call, state: Call.State, message: String) {
            sipCall = call
            if (state == Call.State.IncomingReceived) {
                currentBackend = "linphone"
                currentDirection = "inbound"
                currentNumber = call.remoteAddress?.asStringUriOnly() ?: ""
                currentCallId = currentNumber
                currentState = "ringing"
                voiceChannel?.invokeMethod(
                    "incomingCallInvite",
                    callState() + mapOf(
                        "success" to true,
                        "type" to "incoming_call",
                        "from" to currentNumber,
                        "callId" to currentCallId,
                        "backend" to currentBackend
                    )
                )
                return
            }
            currentState = when (state) {
                Call.State.OutgoingInit,
                Call.State.OutgoingProgress -> "calling"
                Call.State.OutgoingRinging,
                Call.State.OutgoingEarlyMedia -> "ringing"
                Call.State.Connected,
                Call.State.StreamsRunning -> "active"
                Call.State.End,
                Call.State.Released -> "ended"
                Call.State.Error -> "failed"
                else -> currentState
            }
            if (state == Call.State.End ||
                state == Call.State.Released ||
                state == Call.State.Error
            ) {
                applySpeakerphone(false)
                applyMicrophoneMute(false)
            } else if (
                isSpeakerphoneEnabled &&
                (state == Call.State.Connected || state == Call.State.StreamsRunning)
            ) {
                applySpeakerphone(true)
            }
        }
    }

    override fun onDestroy() {
        chatRingtone?.stop()
        chatRingtone = null
        toneGenerator?.release()
        toneGenerator = null
        super.onDestroy()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        voiceChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
        voiceChannel?.setMethodCallHandler { call, result ->
                when (call.method) {
                    "initializeSession" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        initializeVonageSession(args, result)
                    }

                    "acceptIncomingCall" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        acceptIncomingCall(args, result)
                    }

                    "declineIncomingCall" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        declineIncomingCall(args, result)
                    }

                    "processIncomingPush" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        processIncomingPush(args, result)
                    }

                    "isIncomingVoicePush" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        result.success(isIncomingVoicePush(args))
                    }

                    "registerPushToken" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        registerPushToken(args, result)
                    }

                    "startOutboundCall" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        startOutboundCall(args, result)
                    }

                    "startSipCall" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        startSipCall(args, result)
                    }

                    "endCurrentCall" -> {
                        endCurrentCall(result)
                    }

                    "setSpeakerphoneEnabled" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        setSpeakerphoneEnabled(args, result)
                    }

                    "setMicrophoneMuted" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        setMicrophoneMuted(args, result)
                    }

                    "playDialTone" -> {
                        val args = call.arguments as? Map<*, *> ?: emptyMap<Any?, Any?>()
                        playDialTone(args, result)
                    }

                    "playChatRingtone" -> {
                        playChatRingtone(result)
                    }

                    "stopChatRingtone" -> {
                        stopChatRingtone(result)
                    }

                    "playChatNotificationTone" -> {
                        playChatNotificationTone(result)
                    }

                    "getCallState" -> {
                        result.success(callState())
                    }

                    "getVoipToken" -> {
                        result.success(currentPushDeviceId)
                    }

                    else -> result.notImplemented()
                }
            }
    }

    private fun initializeVonageSession(args: Map<*, *>, result: MethodChannel.Result) {
        val token = args["token"]?.toString()
            ?: args["jwt"]?.toString()
            ?: args["userToken"]?.toString()

        if (token.isNullOrBlank()) {
            currentState = "failed"
            result.error(
                "voice_token_missing",
                "Voice session token is missing from the backend response.",
                callState()
            )
            return
        }

        if (!ensureVoicePermissions(result)) return

        currentBackend = args["backend"]?.toString() ?: "vonage"
        sessionSnapshot = args.entries.associate { (key, value) -> key.toString() to value }
        currentState = "connecting"

        getVoiceClient().createSession(token) { error, sessionId ->
            runOnUiThread {
                if (error != null) {
                    currentState = "failed"
                    result.error(
                        "voice_session_failed",
                        error.message ?: error.toString(),
                        callState()
                    )
                    return@runOnUiThread
                }

                currentSessionId = sessionId ?: ""
                currentState = "session_ready"
                val pushToken = extractPushToken(args)
                if (pushToken.isBlank()) {
                    result.success(
                        callState() + mapOf(
                            "success" to true,
                            "sessionId" to currentSessionId,
                            "pushRegistered" to false
                        )
                    )
                    return@runOnUiThread
                }

                registerPushTokenValue(pushToken, result, "initializeSession")
            }
        }
    }

    private fun startOutboundCall(args: Map<*, *>, result: MethodChannel.Result) {
        currentDirection = "outbound"
        currentNumber = normalizeE164Number(args["number"]?.toString()?.trim() ?: "")

        if (currentSessionId.isBlank()) {
            currentState = "failed"
            result.error(
                "voice_session_required",
                "Prepare a Vonage voice session before starting a call.",
                callState()
            )
            return
        }

        if (!isValidE164Number(currentNumber)) {
            currentState = "failed"
            result.error(
                "voice_number_invalid",
                "Use international format with country code, for example +961XXXXXXXX.",
                callState()
            )
            return
        }

        currentState = "dialing"
        getVoiceClient().serverCall(
            mapOf(
                "to" to currentNumber,
                "callee" to currentNumber
            )
        ) { error, callId ->
            runOnUiThread {
                if (error != null) {
                    currentState = "failed"
                    result.error(
                        "voice_call_failed",
                        error.message ?: error.toString(),
                        callState()
                    )
                    return@runOnUiThread
                }

                currentCallId = callId ?: ""
                currentState = "active"
                result.success(
                    callState() + mapOf(
                        "success" to true,
                        "callId" to currentCallId
                    )
                )
            }
        }
    }

    private fun startSipCall(args: Map<*, *>, result: MethodChannel.Result) {
        currentBackend = "linphone"
        currentDirection = "outbound"
        currentNumber = args["destinationUri"]?.toString()?.trim()
            ?: args["uri"]?.toString()?.trim()
            ?: args["number"]?.toString()?.trim()
            ?: ""

        if (currentNumber.isBlank()) {
            currentState = "failed"
            result.error("sip_destination_missing", "Concierge SIP destination is missing.", callState())
            return
        }

        val account = args["account"] as? Map<*, *> ?: emptyMap<Any?, Any?>()
        val username = account["username"]?.toString()?.trim() ?: ""
        val password = account["password"]?.toString()?.trim() ?: ""
        val domain = account["domain"]?.toString()?.trim()
            ?: parseSipDomain(account["uri"]?.toString())
            ?: parseSipDomain(currentNumber)
            ?: ""
        val transport = account["transport"]?.toString()?.trim()?.lowercase() ?: "udp"
        val proxy = (
            account["proxy"]?.toString()?.trim()
                ?: account["outboundProxy"]?.toString()?.trim()
                ?: account["outbound_proxy"]?.toString()?.trim()
                ?: ""
            ).removePrefix("sip:")

        if (username.isBlank() || password.isBlank() || domain.isBlank()) {
            currentState = "failed"
            result.error(
                "sip_account_missing",
                "SIP account credentials are missing. Configure or provision a real SIP account first.",
                callState()
            )
            return
        }

        if (!ensureVoicePermissions(result)) return

        try {
            val core = ensureSipCore()
            configureSipAccount(core, username, password, domain, transport, proxy)
            pendingSipDestination = normalizeSipUri(currentNumber)
            pendingSipCallResult = result
            currentState = "registering"

            if (sipAccount?.state == RegistrationState.Ok) {
                startPendingSipInvite()
                return
            }

            mainHandler.postDelayed({
                val pending = pendingSipCallResult ?: return@postDelayed
                pendingSipCallResult = null
                currentState = "failed"
                pending.error(
                    "sip_registration_timeout",
                    "SIP registration timed out. Check the SIP username, password, domain, and transport.",
                    callState()
                )
            }, 15000)
        } catch (error: Exception) {
            currentState = "failed"
            result.error("sip_call_failed", error.message ?: error.toString(), callState())
        }
    }

    private fun ensureSipCore(): Core {
        val existing = sipCore
        if (existing != null) return existing

        Factory.instance().setDebugMode(true, "G5eSIM-Linphone")
        val core = Factory.instance().createCore(null, null, applicationContext)
        core.addListener(sipListener)
        core.start()
        sipCore = core
        return core
    }

    private fun configureSipAccount(
        core: Core,
        username: String,
        password: String,
        domain: String,
        transport: String,
        proxy: String
    ) {
        if (sipAccount?.params?.identityAddress?.username == username &&
            sipAccount?.params?.domain == domain &&
            sipAccount?.params?.routesAddresses?.firstOrNull()?.domain == proxy.ifBlank { null }
        ) {
            return
        }

        sipAccount?.let {
            core.removeAccount(it)
            sipAccount = null
        }
        core.clearAllAuthInfo()

        val identity = Factory.instance().createAddress("sip:$username@$domain")
            ?: throw IllegalArgumentException("Invalid SIP identity.")
        val serverAddress = Factory.instance().createAddress("sip:${proxy.ifBlank { domain }}")
            ?: throw IllegalArgumentException("Invalid SIP server.")
        val params = core.createAccountParams()
        params.identityAddress = identity
        params.serverAddress = serverAddress
        params.transport = when (transport) {
            "tcp" -> TransportType.Tcp
            "tls" -> TransportType.Tls
            else -> TransportType.Udp
        }
        if (proxy.isNotBlank()) {
            val routeAddress = Factory.instance().createAddress("sip:$proxy")
                ?: throw IllegalArgumentException("Invalid SIP proxy.")
            params.setRoutesAddresses(arrayOf(routeAddress))
            params.isOutboundProxyEnabled = true
        }
        params.isRegisterEnabled = true

        val authInfo = Factory.instance().createAuthInfo(
            username,
            null,
            password,
            null,
            null,
            domain,
            null
        )
        core.addAuthInfo(authInfo)

        val account = core.createAccount(params)
        core.addAccount(account)
        core.defaultAccount = account
        sipAccount = account
    }

    private fun startPendingSipInvite() {
        val result = pendingSipCallResult ?: return
        val destination = pendingSipDestination
        pendingSipCallResult = null

        if (destination.isBlank()) {
            currentState = "failed"
            result.error("sip_destination_missing", "Concierge SIP destination is missing.", callState())
            return
        }

        val call = sipCore?.invite(destination)
        if (call == null) {
            currentState = "failed"
            result.error("sip_invite_failed", "Unable to start the SIP call.", callState())
            return
        }

        sipCall = call
        currentState = "dialing"
        result.success(callState() + mapOf("success" to true, "callId" to destination))
    }

    private fun normalizeSipUri(value: String): String {
        val trimmed = value.trim()
        return if (trimmed.startsWith("sip:", ignoreCase = true) ||
            trimmed.startsWith("sips:", ignoreCase = true)
        ) {
            trimmed
        } else {
            "sip:$trimmed"
        }
    }

    private fun parseSipDomain(value: String?): String? {
        val uri = value?.trim()?.removePrefix("sip:")?.removePrefix("sips:") ?: return null
        val host = uri.substringAfter("@", "").substringBefore(";").trim()
        return host.ifBlank { null }
    }

    private fun acceptIncomingCall(args: Map<*, *>, result: MethodChannel.Result) {
        val activeSipCall = sipCall
        if (currentBackend == "linphone" && activeSipCall != null) {
            try {
                currentDirection = "inbound"
                currentState = "answering"
                activeSipCall.accept()
                currentState = "active"
                result.success(callState() + mapOf("success" to true, "callId" to currentCallId))
            } catch (error: Exception) {
                currentState = "failed"
                result.error("sip_answer_failed", error.message ?: error.toString(), callState())
            }
            return
        }

        val callId = extractCallId(args).ifBlank { currentCallId }

        if (currentSessionId.isBlank()) {
            currentState = "failed"
            result.error(
                "voice_session_required",
                "Prepare a Vonage voice session before accepting a call.",
                callState()
            )
            return
        }

        if (callId.isBlank()) {
            currentState = "failed"
            result.error("voice_call_id_missing", "Incoming call ID is required.", callState())
            return
        }

        currentDirection = "inbound"
        currentNumber = args["from"]?.toString() ?: args["fromNumber"]?.toString() ?: ""
        currentState = "answering"

        getVoiceClient().answer(callId) { error ->
            runOnUiThread {
                if (error != null) {
                    currentState = "failed"
                    result.error(
                        "voice_answer_failed",
                        error.message ?: error.toString(),
                        callState()
                    )
                    return@runOnUiThread
                }

                currentCallId = callId
                currentState = "active"
                result.success(callState() + mapOf("success" to true, "callId" to currentCallId))
            }
        }
    }

    private fun declineIncomingCall(args: Map<*, *>, result: MethodChannel.Result) {
        val activeSipCall = sipCall
        if (currentBackend == "linphone" && activeSipCall != null) {
            try {
                activeSipCall.terminate()
                sipCall = null
                currentDirection = "inbound"
                currentState = "declined"
                applySpeakerphone(false)
                result.success(callState() + mapOf("success" to true, "callId" to currentCallId))
            } catch (error: Exception) {
                currentState = "failed"
                result.error("sip_decline_failed", error.message ?: error.toString(), callState())
            }
            return
        }

        val callId = extractCallId(args).ifBlank { currentCallId }

        if (callId.isBlank()) {
            currentDirection = "inbound"
            currentState = "declined"
            applySpeakerphone(false)
            result.success(callState() + mapOf("success" to true))
            return
        }

        if (currentSessionId.isBlank()) {
            currentState = "failed"
            result.error(
                "voice_session_required",
                "Prepare a Vonage voice session before declining a call.",
                callState()
            )
            return
        }

        getVoiceClient().reject(callId) { error ->
            runOnUiThread {
                if (error != null) {
                    currentState = "failed"
                    result.error(
                        "voice_decline_failed",
                        error.message ?: error.toString(),
                        callState()
                    )
                    return@runOnUiThread
                }

                currentDirection = "inbound"
                currentState = "declined"
                applySpeakerphone(false)
                result.success(callState() + mapOf("success" to true, "callId" to callId))
            }
        }
    }

    private fun processIncomingPush(args: Map<*, *>, result: MethodChannel.Result) {
        if (currentSessionId.isBlank()) {
            currentState = "failed"
            result.error(
                "voice_session_required",
                "Prepare a Vonage voice session before processing an incoming call push.",
                callState()
            )
            return
        }

        val payload = toVonagePushPayload(args)
        if (payload.isBlank()) {
            currentState = "failed"
            result.error("voice_push_payload_missing", "Incoming call push payload is missing.", callState())
            return
        }

        val pushType = try {
            VoiceClient.Companion.getPushNotificationType(payload)
        } catch (error: Exception) {
            PushType.UNKNOWN
        }

        if (pushType != PushType.INCOMING_CALL) {
            result.success(
                callState() + mapOf(
                    "success" to false,
                    "pushType" to pushType.name
                )
            )
            return
        }

        try {
            val callId = getVoiceClient().processPushCallInvite(payload) ?: ""
            if (callId.isBlank()) {
                currentState = "failed"
                result.error("voice_call_id_missing", "Vonage did not return an incoming call ID.", callState())
                return
            }

            currentCallId = callId
            currentDirection = "inbound"
            currentNumber = args["from"]?.toString()
                ?: args["fromNumber"]?.toString()
                ?: args["caller"]?.toString()
                ?: ""
            currentState = "ringing"
            result.success(
                callState() + mapOf(
                    "success" to true,
                    "callId" to currentCallId,
                    "pushType" to pushType.name
                )
            )
        } catch (error: Exception) {
            currentState = "failed"
            result.error("voice_push_process_failed", error.message ?: error.toString(), callState())
        }
    }

    private fun isIncomingVoicePush(args: Map<*, *>): Boolean {
        val payload = toVonagePushPayload(args)
        if (payload.isBlank()) return false

        return try {
            VoiceClient.Companion.getPushNotificationType(payload) == PushType.INCOMING_CALL
        } catch (_: Exception) {
            false
        }
    }

    private fun registerPushToken(args: Map<*, *>, result: MethodChannel.Result) {
        val pushToken = extractPushToken(args)
        if (pushToken.isBlank()) {
            result.error("voice_push_token_missing", "Firebase push token is missing.", callState())
            return
        }
        if (currentSessionId.isBlank()) {
            result.error(
                "voice_session_required",
                "Prepare a Vonage voice session before registering push notifications.",
                callState()
            )
            return
        }
        registerPushTokenValue(pushToken, result, "registerPushToken")
    }

    private fun registerPushTokenValue(
        pushToken: String,
        result: MethodChannel.Result,
        source: String
    ) {
        getVoiceClient().registerDevicePushToken(pushToken) { error, deviceId ->
            runOnUiThread {
                if (error != null) {
                    result.success(
                        callState() + mapOf(
                            "success" to true,
                            "sessionId" to currentSessionId,
                            "pushRegistered" to false,
                            "pushRegistrationSource" to source,
                            "pushRegistrationError" to (error.message ?: error.toString())
                        )
                    )
                    return@runOnUiThread
                }

                currentPushDeviceId = deviceId ?: ""
                result.success(
                    callState() + mapOf(
                        "success" to true,
                        "sessionId" to currentSessionId,
                        "pushRegistered" to true,
                        "pushDeviceId" to currentPushDeviceId,
                        "pushRegistrationSource" to source
                    )
                )
            }
        }
    }

    private fun endCurrentCall(result: MethodChannel.Result) {
        if (currentBackend == "linphone") {
            sipCall?.terminate()
            sipCall = null
            currentState = "ended"
            currentNumber = ""
            currentDirection = "none"
            applySpeakerphone(false)
            applyMicrophoneMute(false)
            result.success(callState() + mapOf("success" to true))
            return
        }

        val callId = currentCallId
        val previousNumber = currentNumber

        if (callId.isBlank()) {
            currentState = "ended"
            currentNumber = ""
            currentDirection = "none"
            applySpeakerphone(false)
            applyMicrophoneMute(false)
            result.success(
                callState() + mapOf(
                    "success" to true,
                    "number" to previousNumber
                )
            )
            return
        }

        getVoiceClient().hangup(callId) { error ->
            runOnUiThread {
                if (error != null) {
                    currentState = "failed"
                    result.error(
                        "voice_hangup_failed",
                        error.message ?: error.toString(),
                        callState()
                    )
                    return@runOnUiThread
                }

                currentState = "ended"
                currentCallId = ""
                currentNumber = ""
                currentDirection = "none"
                applySpeakerphone(false)
                applyMicrophoneMute(false)
                result.success(
                    callState() + mapOf(
                        "success" to true,
                        "number" to previousNumber,
                        "callId" to callId
                    )
                )
            }
        }
    }

    private fun setSpeakerphoneEnabled(args: Map<*, *>, result: MethodChannel.Result) {
        val enabled = args["enabled"] as? Boolean
            ?: args["speakerphoneOn"] as? Boolean
            ?: args["speakerOn"] as? Boolean
            ?: false

        try {
            applySpeakerphone(enabled)
            result.success(callState() + mapOf("success" to true))
        } catch (error: Exception) {
            result.error(
                "speakerphone_failed",
                error.message ?: error.toString(),
                callState()
            )
        }
    }

    private fun setMicrophoneMuted(args: Map<*, *>, result: MethodChannel.Result) {
        val muted = args["muted"] as? Boolean
            ?: args["microphoneMuted"] as? Boolean
            ?: args["enabled"] as? Boolean
            ?: false

        try {
            applyMicrophoneMute(muted)
            result.success(callState() + mapOf("success" to true))
        } catch (error: Exception) {
            result.error(
                "microphone_mute_failed",
                error.message ?: error.toString(),
                callState()
            )
        }
    }

    private fun playDialTone(args: Map<*, *>, result: MethodChannel.Result) {
        val digit = args["digit"]?.toString()?.trim()?.firstOrNull()?.toString() ?: ""

        try {
            val generator = toneGenerator
                ?: ToneGenerator(AudioManager.STREAM_MUSIC, 85).also {
                    toneGenerator = it
                }
            generator.stopTone()
            generator.startTone(dialToneFor(digit), 140)
            result.success(callState() + mapOf("success" to true))
        } catch (error: Exception) {
            result.error(
                "dial_tone_failed",
                error.message ?: error.toString(),
                callState()
            )
        }
    }

    private fun playChatRingtone(result: MethodChannel.Result) {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            chatRingtone?.stop()
            chatRingtone = RingtoneManager.getRingtone(applicationContext, uri)?.also { ringtone ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ringtone.isLooping = true
                }
                ringtone.play()
            }
            result.success(callState() + mapOf("success" to true))
        } catch (error: Exception) {
            result.error(
                "chat_ringtone_failed",
                error.message ?: error.toString(),
                callState()
            )
        }
    }

    private fun stopChatRingtone(result: MethodChannel.Result) {
        try {
            chatRingtone?.stop()
            chatRingtone = null
            result.success(callState() + mapOf("success" to true))
        } catch (error: Exception) {
            result.error(
                "chat_ringtone_stop_failed",
                error.message ?: error.toString(),
                callState()
            )
        }
    }

    private fun playChatNotificationTone(result: MethodChannel.Result) {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            RingtoneManager.getRingtone(applicationContext, uri)?.play()
            result.success(callState() + mapOf("success" to true))
        } catch (error: Exception) {
            result.error(
                "chat_notification_tone_failed",
                error.message ?: error.toString(),
                callState()
            )
        }
    }

    private fun dialToneFor(value: String): Int =
        when (value) {
            "1" -> ToneGenerator.TONE_DTMF_1
            "2" -> ToneGenerator.TONE_DTMF_2
            "3" -> ToneGenerator.TONE_DTMF_3
            "4" -> ToneGenerator.TONE_DTMF_4
            "5" -> ToneGenerator.TONE_DTMF_5
            "6" -> ToneGenerator.TONE_DTMF_6
            "7" -> ToneGenerator.TONE_DTMF_7
            "8" -> ToneGenerator.TONE_DTMF_8
            "9" -> ToneGenerator.TONE_DTMF_9
            "0" -> ToneGenerator.TONE_DTMF_0
            "#" -> ToneGenerator.TONE_DTMF_P
            "+" -> ToneGenerator.TONE_DTMF_S
            else -> ToneGenerator.TONE_PROP_BEEP
        }

    private fun applySpeakerphone(enabled: Boolean) {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val activeStates = setOf("answering", "calling", "connecting", "dialing", "ringing", "active")
        val communicationActive = enabled || activeStates.contains(currentState)
        audioManager.mode = if (communicationActive) {
            AudioManager.MODE_IN_COMMUNICATION
        } else {
            AudioManager.MODE_NORMAL
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (enabled) {
                val speaker = audioManager.availableCommunicationDevices.firstOrNull {
                    it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                }
                if (speaker != null) {
                    audioManager.setCommunicationDevice(speaker)
                }
            } else if (!communicationActive) {
                audioManager.clearCommunicationDevice()
            }
        }

        @Suppress("DEPRECATION")
        audioManager.isSpeakerphoneOn = enabled
        if (currentBackend == "linphone") {
            routeSipAudioToSpeaker(enabled)
        }
        isSpeakerphoneEnabled = enabled
    }

    private fun applyMicrophoneMute(muted: Boolean) {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager.setMicrophoneMute(muted)
        isMicrophoneMuted = audioManager.isMicrophoneMute
    }

    private fun routeSipAudioToSpeaker(enabled: Boolean) {
        val core = sipCore ?: return
        val preferredTypes = if (enabled) {
            listOf(AudioDevice.Type.Speaker)
        } else {
            listOf(
                AudioDevice.Type.Earpiece,
                AudioDevice.Type.Headset,
                AudioDevice.Type.Headphones,
                AudioDevice.Type.Bluetooth,
                AudioDevice.Type.BluetoothA2DP
            )
        }
        val outputDevice = preferredTypes.asSequence()
            .mapNotNull { type ->
                core.audioDevices.firstOrNull { device -> device.type == type }
            }
            .firstOrNull()
            ?: return

        core.defaultOutputAudioDevice = outputDevice
        core.outputAudioDevice = outputDevice
        sipCall?.outputAudioDevice = outputDevice
    }

    private fun getVoiceClient(): VoiceClient {
        if (voiceClient == null) {
            voiceClient = createVoiceClient(applicationContext).also { client ->
                client.setConfig(VGClientConfig(ClientConfigRegion.US))
                configureVoiceListeners(client)
            }
        }
        return voiceClient!!
    }

    private fun createVoiceClient(context: Context): VoiceClient {
        return VoiceClient::class.java
            .getMethod("createClient", Context::class.java)
            .invoke(null, context) as VoiceClient
    }

    private fun ensureVoicePermissions(result: MethodChannel.Result): Boolean {
        val missingPermissions = requiredVoicePermissions().filter {
            checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()

        if (missingPermissions.isEmpty()) return true

        requestPermissions(missingPermissions, voicePermissionRequestCode)
        currentState = "permission_required"
        result.error(
            "voice_permissions_required",
            "Microphone and phone permissions are required. Allow them, then try again.",
            mapOf("permissions" to missingPermissions.toList())
        )
        return false
    }

    private fun requiredVoicePermissions(): Array<String> {
        return arrayOf(Manifest.permission.RECORD_AUDIO)
    }

    private fun configureVoiceListeners(client: VoiceClient) {
        client.setCallInviteListener { callId, from, channelType ->
            runOnUiThread {
                currentCallId = callId
                currentNumber = from
                currentDirection = "inbound"
                currentState = "ringing"
                voiceChannel?.invokeMethod(
                    "incomingCallInvite",
                    callState() + mapOf(
                        "success" to true,
                        "callId" to callId,
                        "from" to from,
                        "channelType" to channelType.name
                    )
                )
            }
        }

        client.setCallInviteCancelListener { callId, reason ->
            runOnUiThread {
                if (currentCallId == callId) {
                    currentState = "ended"
                    applySpeakerphone(false)
                    applyMicrophoneMute(false)
                }
                voiceChannel?.invokeMethod(
                    "incomingCallCancelled",
                    callState() + mapOf(
                        "success" to true,
                        "callId" to callId,
                        "reason" to reason.name
                    )
                )
            }
        }

        client.setOnCallHangupListener { callId, _, reason ->
            runOnUiThread {
                if (currentCallId == callId) {
                    currentState = "ended"
                    currentCallId = ""
                    currentNumber = ""
                    currentDirection = "none"
                    applySpeakerphone(false)
                    applyMicrophoneMute(false)
                }
                voiceChannel?.invokeMethod(
                    "callEnded",
                    callState() + mapOf(
                        "success" to true,
                        "callId" to callId,
                        "reason" to reason.name
                    )
                )
            }
        }
    }

    private fun extractPushToken(args: Map<*, *>): String =
        (args["pushToken"]?.toString()
            ?: args["fcmToken"]?.toString()
            ?: args["firebaseToken"]?.toString()
            ?: "").trim()

    private fun extractCallId(args: Map<*, *>): String {
        val keys = listOf("callId", "call_id", "callID", "id", "uuid", "callUuid", "call_uuid")
        return keys.firstNotNullOfOrNull { key ->
            args[key]?.toString()?.trim()?.takeIf { it.isNotBlank() }
        } ?: ""
    }

    private fun normalizeE164Number(value: String): String {
        val compact = value.replace(Regex("[\\s().-]"), "")
        return if (compact.startsWith("00")) "+${compact.drop(2)}" else compact
    }

    private fun isValidE164Number(value: String): Boolean =
        Regex("^\\+[1-9]\\d{7,14}$").matches(value)

    private fun toVonagePushPayload(args: Map<*, *>): String {
        val raw = args["rawVonagePayload"]?.toString()?.trim()
            ?: args["rawPushPayload"]?.toString()?.trim()
            ?: args["payload"]?.toString()?.trim()
        if (!raw.isNullOrBlank()) return raw

        val ignoredKeys = setOf(
            "type",
            "initialAction",
            "rawVonagePayload",
            "rawPushPayload",
            "payload"
        )
        return args.entries
            .filter { (key, value) -> key != null && value != null && !ignoredKeys.contains(key.toString()) }
            .joinToString(prefix = "{", postfix = "}") { (key, value) ->
                "${key.toString()}=${value.toString()}"
            }
    }

    private fun callState(): Map<String, Any?> =
        mapOf(
            "backend" to currentBackend,
            "state" to currentState,
            "number" to currentNumber,
            "direction" to currentDirection,
            "sessionId" to currentSessionId,
            "callId" to currentCallId,
            "pushDeviceId" to currentPushDeviceId,
            "speakerphoneOn" to isSpeakerphoneEnabled,
            "microphoneMuted" to isMicrophoneMuted
        )
}

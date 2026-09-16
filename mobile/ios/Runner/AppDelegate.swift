import AVFAudio
import AudioToolbox
import CallKit
import Flutter
import PushKit
import UIKit
import UserNotifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate, PKPushRegistryDelegate, CXProviderDelegate {
  private let voiceChannelName = "esimconnect/voice"
  private var voiceChannel: FlutterMethodChannel?
  private var pushRegistry: PKPushRegistry?
  private var voipToken: String = ""
  private var activeCallUuid: UUID?
  private var currentBackend: String = "voice"
  private var currentState: String = "idle"
  private var currentNumber: String = ""
  private var currentDirection: String = "none"
  private var isSpeakerphoneEnabled: Bool = false
  private var isMicrophoneMuted: Bool = false
  private var sessionSnapshot: [String: Any] = [:]
  private lazy var callProvider: CXProvider = {
    let configuration = CXProviderConfiguration(localizedName: "AYA eSIM")
    configuration.supportsVideo = false
    configuration.maximumCallsPerCallGroup = 1
    configuration.supportedHandleTypes = [.generic, .phoneNumber]
    let provider = CXProvider(configuration: configuration)
    provider.setDelegate(self, queue: nil)
    return provider
  }()

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    AVAudioSession.sharedInstance().requestRecordPermission { _ in }
    UNUserNotificationCenter.current().delegate = self
    application.registerForRemoteNotifications()
    configureVoipPushRegistry()
    let didFinish = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(name: voiceChannelName, binaryMessenger: controller.binaryMessenger)
      voiceChannel = channel
      channel.setMethodCallHandler { [weak self] call, result in
        guard let self = self else {
          result(FlutterError(code: "voice_unavailable", message: "Voice bridge is unavailable", details: nil))
          return
        }

        switch call.method {
        case "initializeSession":
          let args = call.arguments as? [String: Any] ?? [:]
          self.currentBackend = (args["backend"] as? String) ?? "voice"
          self.sessionSnapshot = args
          self.currentState = "session_ready"
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
          ])

        case "registerPushToken":
          let args = call.arguments as? [String: Any] ?? [:]
          if let pushToken = self.firstString(in: args, keys: ["pushToken", "fcmToken", "firebaseToken"]) {
            self.sessionSnapshot["pushToken"] = pushToken
          }
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "pushRegistered": true,
            "voipToken": self.voipToken,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
          ])

        case "getVoipToken":
          result(self.voipToken)

        case "isIncomingVoicePush":
          let args = call.arguments as? [String: Any] ?? [:]
          result(self.isIncomingVoicePayload(args))

        case "processIncomingPush":
          let args = call.arguments as? [String: Any] ?? [:]
          let callData = self.normalizedIncomingCallData(args)
          self.reportIncomingCall(callData)
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": self.currentNumber,
            "direction": self.currentDirection,
            "callId": self.activeCallUuid?.uuidString ?? "",
            "pushType": "VOIP",
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "acceptIncomingCall":
          let args = call.arguments as? [String: Any] ?? [:]
          self.currentDirection = "inbound"
          self.currentNumber =
            (args["from"] as? String)
            ?? (args["fromNumber"] as? String)
            ?? ""
          self.currentState = self.sessionSnapshot.isEmpty ? "failed" : "active"
          result([
            "success": !self.sessionSnapshot.isEmpty,
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": self.currentNumber,
            "direction": self.currentDirection,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "declineIncomingCall":
          self.currentDirection = "inbound"
          self.currentState = "declined"
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "startOutboundCall":
          let args = call.arguments as? [String: Any] ?? [:]
          self.currentDirection = "outbound"
          self.currentNumber = (args["number"] as? String) ?? ""
          self.currentState =
            (!self.sessionSnapshot.isEmpty && !self.currentNumber.isEmpty) ? "active" : "failed"
          result([
            "success": !self.sessionSnapshot.isEmpty && !self.currentNumber.isEmpty,
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": self.currentNumber,
            "direction": self.currentDirection,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "endCurrentCall":
          let previousNumber = self.currentNumber
          self.currentState = "ended"
          self.currentNumber = ""
          self.currentDirection = "none"
          try? self.applySpeakerphone(false)
          self.isMicrophoneMuted = false
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": previousNumber,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "setSpeakerphoneEnabled":
          let args = call.arguments as? [String: Any] ?? [:]
          let enabled =
            (args["enabled"] as? Bool)
            ?? (args["speakerphoneOn"] as? Bool)
            ?? (args["speakerOn"] as? Bool)
            ?? false
          do {
            try self.applySpeakerphone(enabled)
            result([
              "success": true,
              "backend": self.currentBackend,
              "state": self.currentState,
              "number": self.currentNumber,
              "direction": self.currentDirection,
              "speakerphoneOn": self.isSpeakerphoneEnabled,
              "microphoneMuted": self.isMicrophoneMuted,
            ])
          } catch {
            result(
              FlutterError(
                code: "speakerphone_failed",
                message: error.localizedDescription,
                details: [
                  "backend": self.currentBackend,
                  "state": self.currentState,
                  "speakerphoneOn": self.isSpeakerphoneEnabled,
                ]
              )
            )
          }

        case "setMicrophoneMuted":
          let args = call.arguments as? [String: Any] ?? [:]
          self.isMicrophoneMuted =
            (args["muted"] as? Bool)
            ?? (args["microphoneMuted"] as? Bool)
            ?? (args["enabled"] as? Bool)
            ?? false
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": self.currentNumber,
            "direction": self.currentDirection,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "playDialTone":
          let args = call.arguments as? [String: Any] ?? [:]
          self.playDialTone((args["digit"] as? String) ?? "")
          result([
            "success": true,
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": self.currentNumber,
            "direction": self.currentDirection,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        case "getCallState":
          result([
            "backend": self.currentBackend,
            "state": self.currentState,
            "number": self.currentNumber,
            "direction": self.currentDirection,
            "speakerphoneOn": self.isSpeakerphoneEnabled,
            "microphoneMuted": self.isMicrophoneMuted,
          ])

        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return didFinish
  }

  private func configureVoipPushRegistry() {
    _ = callProvider
    let registry = PKPushRegistry(queue: DispatchQueue.main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
    pushRegistry = registry
  }

  private func normalizedIncomingCallData(_ payload: [String: Any]) -> [String: Any] {
    var data = payload
    data["type"] = data["type"] ?? "incoming_call"
    let caller =
      firstString(in: data, keys: ["callerName", "from", "fromNumber", "from_user", "caller"])
      ?? "Incoming Call"
    let callId =
      firstString(in: data, keys: ["callId", "call_id", "uuid", "callUuid", "call_uuid"])
      ?? UUID().uuidString
    data["callerName"] = caller
    data["from"] = data["from"] ?? caller
    data["callId"] = callId
    data["backend"] = data["backend"] ?? currentBackend
    return data
  }

  private func isIncomingVoicePayload(_ payload: [String: Any]) -> Bool {
    let joined = payload.map { "\($0.key):\($0.value)" }.joined(separator: "|").lowercased()
    if firstString(in: payload, keys: ["type"]) == "incoming_call" {
      return true
    }
    if firstString(in: payload, keys: ["type"]) == "vonage_voice_call" {
      return true
    }
    return (joined.contains("call") || joined.contains("invite"))
      && (joined.contains("voip") || joined.contains("vonage") || joined.contains("nexmo"))
  }

  private func reportIncomingCall(_ rawData: [String: Any]) {
    let data = normalizedIncomingCallData(rawData)
    let callId = firstString(in: data, keys: ["callId"]) ?? UUID().uuidString
    let uuid = UUID(uuidString: callId) ?? UUID()
    let caller =
      firstString(in: data, keys: ["callerName", "from", "fromNumber", "caller"])
      ?? "Incoming Call"

    activeCallUuid = uuid
    currentBackend = (firstString(in: data, keys: ["backend", "voiceBackend"]) ?? currentBackend)
    currentDirection = "inbound"
    currentNumber = caller
    currentState = "ringing"

    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: caller)
    update.localizedCallerName = caller
    update.hasVideo = false

    callProvider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
      if error != nil {
        self?.currentState = "failed"
      }
    }
  }

  private func firstString(in data: [String: Any], keys: [String]) -> String? {
    for key in keys {
      if let value = data[key] as? String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
          return trimmed
        }
      } else if let value = data[key] {
        let stringValue = "\(value)".trimmingCharacters(in: .whitespacesAndNewlines)
        if !stringValue.isEmpty {
          return stringValue
        }
      }
    }
    return nil
  }

  private func applySpeakerphone(_ enabled: Bool) throws {
    let audioSession = AVAudioSession.sharedInstance()
    let options: AVAudioSession.CategoryOptions =
      enabled ? [.allowBluetooth, .defaultToSpeaker] : [.allowBluetooth]
    try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: options)
    try audioSession.overrideOutputAudioPort(enabled ? .speaker : .none)
    try audioSession.setActive(true)
    isSpeakerphoneEnabled = enabled
  }

  private func playDialTone(_ digit: String) {
    let soundId: SystemSoundID
    switch digit {
    case "0":
      soundId = 1200
    case "1":
      soundId = 1201
    case "2":
      soundId = 1202
    case "3":
      soundId = 1203
    case "4":
      soundId = 1204
    case "5":
      soundId = 1205
    case "6":
      soundId = 1206
    case "7":
      soundId = 1207
    case "8":
      soundId = 1208
    case "9":
      soundId = 1209
    case "#":
      soundId = 1211
    case "+":
      soundId = 1210
    default:
      soundId = 1104
    }
    AudioServicesPlaySystemSound(soundId)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
  ) {
    guard type == .voIP else { return }
    voipToken = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    voiceChannel?.invokeMethod("voipTokenUpdated", arguments: [
      "voipToken": voipToken,
      "type": "voip_token",
    ])
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    guard type == .voIP else { return }
    voipToken = ""
    voiceChannel?.invokeMethod("voipTokenUpdated", arguments: [
      "voipToken": "",
      "type": "voip_token",
    ])
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    guard type == .voIP else {
      completion()
      return
    }

    var data: [String: Any] = [:]
    for (key, value) in payload.dictionaryPayload {
      data[String(describing: key)] = value
    }
    let callData = normalizedIncomingCallData(data)
    reportIncomingCall(callData)
    voiceChannel?.invokeMethod("incomingCallInvite", arguments: callData)
    completion()
  }

  func providerDidReset(_ provider: CXProvider) {
    currentState = "idle"
    currentNumber = ""
    currentDirection = "none"
    activeCallUuid = nil
    try? applySpeakerphone(false)
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    currentDirection = "inbound"
    currentState = sessionSnapshot.isEmpty ? "ringing" : "active"
    voiceChannel?.invokeMethod("callAnswered", arguments: [
      "success": true,
      "backend": currentBackend,
      "state": currentState,
      "number": currentNumber,
      "direction": currentDirection,
      "callId": action.callUUID.uuidString,
    ])
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    currentState = "ended"
    currentDirection = "none"
    currentNumber = ""
    activeCallUuid = nil
    try? applySpeakerphone(false)
    voiceChannel?.invokeMethod("callEnded", arguments: [
      "success": true,
      "backend": currentBackend,
      "state": currentState,
      "callId": action.callUUID.uuidString,
    ])
    action.fulfill()
  }
}

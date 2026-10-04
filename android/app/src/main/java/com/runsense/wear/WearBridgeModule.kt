package com.runsense.wear

import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

/**
 * 폰 ↔ 갤럭시 워치(RunSense 워치 앱) Data Layer 브리지.
 *
 * JS 에서는 `src/wear/wearBridge.ts` 로만 접근한다.
 *
 *  - putState(path, json)   : DataItem 으로 저장 — 워치가 꺼져 있어도 다음 연결 때 동기화된다.
 *                             (로그인 토큰 · 프로필 · 인솔 연결 상태 · 폰 러닝 상태)
 *  - sendMessage(path, json): 지금 연결된 워치에 즉시 전송 — 연결이 없으면 버려진다.
 *                             (인솔 실시간 족압 · 코칭 문장)
 *  - 워치 → 폰 메시지는 "RunSenseWearMessage" 이벤트 { path, data } 로 JS 에 올라온다.
 *
 * 두 앱은 같은 applicationId(com.runsense)·같은 서명 키여야 Data Layer 가 서로를 찾는다.
 */
class WearBridgeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), WearEventBus.Listener {

  companion object {
    const val NAME = "RunSenseWear"
    const val EVENT_MESSAGE = "RunSenseWearMessage"
    private const val WATCH_CAPABILITY = "runsense_watch_app"
  }

  private val dataClient by lazy { Wearable.getDataClient(reactContext) }
  private val messageClient by lazy { Wearable.getMessageClient(reactContext) }
  private val nodeClient by lazy { Wearable.getNodeClient(reactContext) }
  private val capabilityClient by lazy { Wearable.getCapabilityClient(reactContext) }

  override fun getName(): String = NAME

  override fun initialize() {
    super.initialize()
    WearEventBus.register(this)
  }

  override fun invalidate() {
    WearEventBus.unregister(this)
    super.invalidate()
  }

  // ── 워치 → 폰 ─────────────────────────────────────────

  override fun onWearMessage(path: String, data: String) {
    if (!reactContext.hasActiveReactInstance()) return
    val params = Arguments.createMap().apply {
      putString("path", path)
      putString("data", data)
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_MESSAGE, params)
  }

  // ── 폰 → 워치 ─────────────────────────────────────────

  @ReactMethod
  fun putState(path: String, json: String, promise: Promise) {
    val request = PutDataMapRequest.create(path).apply {
      dataMap.putString("json", json)
      // 같은 내용을 다시 넣어도 변경 이벤트가 나가도록 시각을 함께 기록한다.
      dataMap.putLong("ts", System.currentTimeMillis())
    }.asPutDataRequest().setUrgent()

    dataClient.putDataItem(request)
      .addOnSuccessListener {
        // DataItem 은 워치가 잠들어 있으면 늦게 도착할 수 있어 메시지도 같이 보낸다.
        broadcast(path, json, null)
        promise.resolve(true)
      }
      .addOnFailureListener { promise.reject("WEAR_PUT_FAILED", it) }
  }

  @ReactMethod
  fun deleteState(path: String, promise: Promise) {
    val uri = Uri.Builder().scheme("wear").authority("*").path(path).build()
    dataClient.deleteDataItems(uri)
      .addOnSuccessListener { promise.resolve(it) }
      .addOnFailureListener { promise.reject("WEAR_DELETE_FAILED", it) }
  }

  @ReactMethod
  fun sendMessage(path: String, json: String, promise: Promise) {
    broadcast(path, json, promise)
  }

  /** 연결된 워치 상태 — { connected, appInstalled } */
  @ReactMethod
  fun getWatchStatus(promise: Promise) {
    nodeClient.connectedNodes
      .addOnSuccessListener { nodes ->
        val connected = nodes.any { it.isNearby }
        capabilityClient.getCapability(WATCH_CAPABILITY, CapabilityClient.FILTER_REACHABLE)
          .addOnSuccessListener { info ->
            promise.resolve(Arguments.createMap().apply {
              putBoolean("connected", connected)
              putBoolean("appInstalled", info.nodes.isNotEmpty())
              putString("nodeName", nodes.firstOrNull { it.isNearby }?.displayName)
            })
          }
          .addOnFailureListener {
            promise.resolve(Arguments.createMap().apply {
              putBoolean("connected", connected)
              putBoolean("appInstalled", false)
              putString("nodeName", nodes.firstOrNull { it.isNearby }?.displayName)
            })
          }
      }
      .addOnFailureListener { promise.reject("WEAR_NODES_FAILED", it) }
  }

  // NativeEventEmitter 가 요구하는 빈 구현
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  private fun broadcast(path: String, json: String, promise: Promise?) {
    nodeClient.connectedNodes
      .addOnSuccessListener { nodes ->
        val bytes = json.toByteArray(Charsets.UTF_8)
        nodes.forEach { node -> messageClient.sendMessage(node.id, path, bytes) }
        promise?.resolve(nodes.size)
      }
      .addOnFailureListener { promise?.reject("WEAR_SEND_FAILED", it) }
  }
}

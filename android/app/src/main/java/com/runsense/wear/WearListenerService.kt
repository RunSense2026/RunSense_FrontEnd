package com.runsense.wear

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/**
 * 워치 앱이 보내는 메시지 수신 (러닝 상태·실시간 지표·완료 요약·리포트 열기 요청).
 * 매니페스트 intent-filter 로 `/runsense` 경로만 이 서비스로 들어온다.
 */
class WearListenerService : WearableListenerService() {
  override fun onMessageReceived(messageEvent: MessageEvent) {
    WearEventBus.emit(messageEvent.path, String(messageEvent.data, Charsets.UTF_8))
  }
}

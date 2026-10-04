package com.runsense.wear

import android.os.Handler
import android.os.Looper

/**
 * [WearListenerService] 가 받은 워치 메시지를 RN 모듈로 넘기는 아주 작은 버스.
 * JS 가 아직 안 떠 있으면 최근 메시지를 잠시 보관했다가 모듈이 등록될 때 흘려보낸다.
 */
object WearEventBus {
  interface Listener {
    fun onWearMessage(path: String, data: String)
  }

  private const val MAX_PENDING = 30
  private val main = Handler(Looper.getMainLooper())
  private val listeners = mutableSetOf<Listener>()
  private val pending = ArrayDeque<Pair<String, String>>()

  @Synchronized
  fun register(listener: Listener) {
    listeners += listener
    val queued = pending.toList()
    pending.clear()
    queued.forEach { (path, data) -> main.post { listener.onWearMessage(path, data) } }
  }

  @Synchronized
  fun unregister(listener: Listener) {
    listeners -= listener
  }

  @Synchronized
  fun emit(path: String, data: String) {
    if (listeners.isEmpty()) {
      if (pending.size >= MAX_PENDING) pending.removeFirst()
      pending.addLast(path to data)
      return
    }
    listeners.forEach { l -> main.post { l.onWearMessage(path, data) } }
  }
}

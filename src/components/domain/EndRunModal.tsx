import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { gradients } from '@/theme/tokens';

// 꾹 눌러서 종료 — 홀드 지속 시간(ms)
const HOLD_MS = 1200;

interface EndRunModalProps {
  visible: boolean;
  distKm?: number;
  sec?: number;
  pace?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Live-run end confirm sheet. Hold the red button for HOLD_MS to confirm;
// releasing early cancels. The progress fill is driven by a native-thread
// transform (translateX) so it stays smooth without per-frame JS re-renders.
export const EndRunModal = ({
  visible,
  distKm = 3.24,
  sec = 1068,
  pace = "5'28\"",
  onCancel,
  onConfirm,
}: EndRunModalProps) => {
  const [holding, setHolding] = useState(false);
  const [barW, setBarW] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  // Keep onConfirm stable so the per-second parent re-render can't disturb the hold.
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const startHold = () => {
    setHolding(true);
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.current.start(({ finished }) => {
      if (finished) onConfirmRef.current();
    });
  };

  const cancelHold = () => {
    anim.current?.stop();
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  // Reset when the sheet closes so it reopens fresh.
  useEffect(() => {
    if (!visible) {
      anim.current?.stop();
      setHolding(false);
      progress.setValue(0);
    }
  }, [visible, progress]);

  // Memoize so per-second parent re-renders don't spawn new native animated nodes.
  const fillShift = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [-barW, 0] }),
    [progress, barW],
  );

  // Fully unmount the animated subtree when closed so nothing accumulates across opens.
  if (!visible) return null;

  const timeStr = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onCancel}>
        {/* Sheet — empty onPress captures taps so they don't dismiss via the backdrop */}
        <Pressable onPress={() => {}}>
          <LinearGradient
            colors={gradients.sheet}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 28,
              borderWidth: 0.5,
              borderColor: 'rgba(167,139,250,0.2)',
            }}
          >
            <View className="self-center w-10 h-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <View className="items-center">
              <Text className="text-[20px] font-bold text-white tracking-[-0.4px]">러닝을 종료할까요?</Text>
              <Text className="text-[13px] mt-[6px] font-medium text-center" style={{ color: 'rgba(255,255,255,0.66)' }}>
                지금까지의 기록이 자동으로 저장됩니다.
              </Text>
            </View>

            {/* mini summary */}
            <View
              className="flex-row mt-4 mb-[18px] px-3 py-[14px] rounded-[14px]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Sm label="거리" value={distKm.toFixed(2)} unit="km" />
              <Sm label="시간" value={timeStr} />
              <Sm label="페이스" value={pace} unit="/km" />
            </View>

            {/* hold to end */}
            <Pressable
              onPressIn={startHold}
              onPressOut={cancelHold}
              onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
              className="rounded-[14px] overflow-hidden"
              style={{
                height: 52,
                backgroundColor: 'rgba(239,68,68,0.12)',
                borderWidth: 0.5,
                borderColor: 'rgba(239,68,68,0.4)',
              }}
            >
              {barW > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%', transform: [{ translateX: fillShift }] }}
                >
                  <LinearGradient colors={['#ef4444', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                </Animated.View>
              )}
              <Text className="text-center text-white text-[15px] font-semibold" style={{ lineHeight: 52 }}>
                {holding ? '계속 누르고 있어요…' : '꾹 눌러서 종료'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              className="mt-2 rounded-[14px] items-center justify-center"
              style={{ height: 48, backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Text className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>계속 달리기</Text>
            </Pressable>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const Sm = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <View className="flex-1 items-center">
    <Text className="text-[18px] font-semibold tracking-[-0.36px]" style={{ color: '#c4b5fd' }}>
      {value}
      {unit && <Text className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}> {unit}</Text>}
    </Text>
    <Text
      className="text-[9px] font-semibold tracking-[0.72px] uppercase mt-1"
      style={{ color: 'rgba(255,255,255,0.4)' }}
    >
      {label}
    </Text>
  </View>
);

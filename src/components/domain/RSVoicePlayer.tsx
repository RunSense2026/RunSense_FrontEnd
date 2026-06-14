import { useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Video, { type VideoRef, type OnLoadData, type OnProgressData } from 'react-native-video';
import Svg, { Path } from 'react-native-svg';

interface RSVoicePlayerProps {
  /** 재생할 음성 파일 URL (절대 URL) */
  uri: string;
  /** 라벨 (기본: "AI 코치 음성") */
  label?: string;
}

// mm:ss
const fmt = (sec: number): string => {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// AI 코칭 음성 재생 플레이어 — 보라색 코치 카드(어두운 배경) 위에 얹는 용도.
// react-native-video 를 오디오 전용(0px)으로 렌더링하고 재생/일시정지·진행률만 노출한다.
export const RSVoicePlayer = ({ uri, label = 'AI 코치 음성' }: RSVoicePlayerProps) => {
  const ref = useRef<VideoRef>(null);
  const [paused, setPaused] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const toggle = () => {
    if (error) return;
    if (ended) {
      ref.current?.seek(0);
      setEnded(false);
    }
    setPaused((p) => !p);
  };

  const onLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setLoading(false);
  };
  const onProgress = (data: OnProgressData) => {
    setCurrent(data.currentTime);
    if (data.seekableDuration > 0) setDuration(data.seekableDuration);
  };
  const onEnd = () => {
    setPaused(true);
    setEnded(true);
    setCurrent(duration);
  };

  const pct = duration > 0 ? Math.min(current / duration, 1) : 0;

  return (
    <View
      className="flex-row items-center gap-3 mt-3 px-3 py-[10px] rounded-[14px]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.22)',
      }}
    >
      {/* 오디오 전용: 화면에 보이지 않도록 0px 로 렌더 */}
      <Video
        ref={ref}
        source={{ uri }}
        paused={paused}
        onLoadStart={() => setLoading(true)}
        onLoad={onLoad}
        onProgress={onProgress}
        onEnd={onEnd}
        onError={() => {
          setError(true);
          setLoading(false);
          setPaused(true);
        }}
        progressUpdateInterval={250}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        style={{ width: 0, height: 0 }}
      />

      <Pressable
        onPress={toggle}
        disabled={error}
        className="w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
      >
        {loading && !paused ? (
          <ActivityIndicator size="small" color="#7c3aed" />
        ) : paused ? (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="#7c3aed">
            <Path d="M8 5v14l11-7z" />
          </Svg>
        ) : (
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="#7c3aed">
            <Path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </Svg>
        )}
      </Pressable>

      <View className="flex-1">
        <Text className="text-[11px] font-bold text-white" numberOfLines={1}>
          {error ? '음성을 재생할 수 없어요' : label}
        </Text>
        {/* progress bar */}
        <View
          className="mt-[6px] h-[4px] rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.24)' }}
        >
          <View
            className="h-full rounded-full"
            style={{ width: `${pct * 100}%`, backgroundColor: '#ffffff' }}
          />
        </View>
      </View>

      <Text
        className="text-[10px] font-semibold"
        style={{ color: 'rgba(255,255,255,0.8)', fontVariant: ['tabular-nums'] }}
      >
        {fmt(current)} / {fmt(duration)}
      </Text>
    </View>
  );
};

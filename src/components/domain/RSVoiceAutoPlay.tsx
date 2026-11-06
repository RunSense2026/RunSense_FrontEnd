import Video from 'react-native-video';

// AI 서버 TTS(gpt-4o-mini-tts)가 한국어를 초당 ~9음절로 빠르게 읽어서 재생 속도를 낮춘다.
// (ExoPlayer 는 속도를 바꿔도 음 높이를 유지한다)
const VOICE_PLAYBACK_RATE = 0.5;

// AI 코치 음성 자동 재생 — 화면에 보이지 않게(0px) 오디오만 재생한다.
// 재생바·일시정지·진행률 같은 컨트롤은 없고, 한 번만 재생한다.
// 사용처에서 key={uri} 를 주면 새 음성이 도착할 때마다 처음부터 재생된다.
export const RSVoiceAutoPlay = ({ uri }: { uri: string }) => (
  <Video
    source={{ uri }}
    paused={false}
    rate={VOICE_PLAYBACK_RATE}
    ignoreSilentSwitch="ignore"
    playInBackground={false}
    onError={() => {}}
    style={{ width: 0, height: 0 }}
  />
);

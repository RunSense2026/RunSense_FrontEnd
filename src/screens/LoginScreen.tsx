import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { isAxiosError } from 'axios';
import Svg, { Path, Circle, Line } from 'react-native-svg';

import { AuthShell, AEField } from '@/components/domain';
import { login } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { setRememberMe } from '@/utils/storage';
import { gradients } from '@/theme/tokens';
import runsenseLogo from '@/assets/runsense-logo.png';

import type { ScreenProps } from '@/types/navigation';

export const LoginScreen = ({ navigation }: ScreenProps<'Login'>) => {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [focus, setFocus] = useState<'email' | 'pwd' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const [keepLogin, setKeepLogin] = useState(true); // 로그인 유지 (기본 ON)

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !pwd) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email: email.trim(), loginPw: pwd });
      setRememberMe(keepLogin); // 토큰 영구 저장 여부 (setSession 의 토큰 저장보다 먼저)
      setSession(result);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      let message = '로그인 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
      if (isAxiosError(e)) {
        const status = e.response?.status;
        // 인증 실패(이메일/비밀번호 불일치)
        message =
          status === 400 || status === 401 || status === 404
            ? '이메일 또는 비밀번호가 일치하지 않습니다'
            : e.response?.data?.message ?? '이메일 또는 비밀번호가 일치하지 않습니다';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mt-[18px]">
          <RSLogo />
          <Text className="text-[32px] font-bold text-white mt-[22px] tracking-[-0.96px] leading-[38px]">
            다시,{'\n'}뛰어볼까요?
          </Text>
          <Text className="text-[14px] text-t2 mt-[10px] leading-[21px] font-medium">
            AI 코치와 함께하는 스마트 러닝
          </Text>
        </View>

        <View className="h-[60px]" />

        <View className="gap-[10px]">
          <AEField
            label="이메일"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            focused={focus === 'email'}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
          />
          <AEField
            label="비밀번호"
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry={!showPwd}
            focused={focus === 'pwd'}
            onFocus={() => setFocus('pwd')}
            onBlur={() => setFocus(null)}
            right={<PwdToggle visible={showPwd} onToggle={() => setShowPwd((v) => !v)} />}
          />
          <View className="flex-row items-center justify-between -mt-[2px]">
            <Pressable onPress={() => setKeepLogin((v) => !v)} className="flex-row items-center gap-[7px]" hitSlop={8}>
              <View
                className="w-[18px] h-[18px] rounded-[6px] items-center justify-center"
                style={{
                  borderWidth: 1.5,
                  borderColor: keepLogin ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                  backgroundColor: keepLogin ? 'rgba(167,139,250,0.25)' : 'transparent',
                }}
              >
                {keepLogin && <Text className="text-[11px] font-bold text-purple-200">✓</Text>}
              </View>
              <Text className="text-[12px] text-t2 font-medium">로그인 유지</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('FindAccount')}>
              <Text className="text-[12px] text-t3 font-medium">비밀번호 찾기</Text>
            </Pressable>
          </View>
        </View>

        {error && (
          <Text className="text-[12px] mt-[12px] font-medium" style={{ color: '#fca5a5' }}>
            {error}
          </Text>
        )}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="mt-[18px]"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-[15px] font-semibold">로그인</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Signup')} className="mt-[18px]">
          <Text className="text-center text-[13px] text-t2 font-medium">
            아직 계정이 없으신가요? <Text className="text-purple-300 font-semibold">회원가입</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </AuthShell>
  );
};

// 비밀번호 표시/숨김 토글 버튼 — AEField 의 right 슬롯에 들어간다.
const PwdToggle = ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => (
  <Pressable
    onPress={onToggle}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
    className="w-8 h-8 items-center justify-center"
  >
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      {visible ? (
        // eye (보임)
        <>
          <Path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
            stroke="#a78bfa"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={12} r={3} stroke="#a78bfa" strokeWidth={1.8} />
        </>
      ) : (
        // eye-off (숨김)
        <>
          <Path
            d="M9.9 5.1A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3M6.5 7A16.8 16.8 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.6-.7"
            stroke="rgba(167,139,250,0.85)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
            stroke="rgba(167,139,250,0.85)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1={3} y1={3} x2={21} y2={21} stroke="rgba(167,139,250,0.85)" strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  </Pressable>
);

const RSLogo = () => (
  <View className="flex-row items-center gap-[10px]">
    <Image
      source={runsenseLogo}
      style={{ width: 40, height: 40, borderRadius: 12 }}
      resizeMode="contain"
    />
    <Text className="text-[22px] font-bold text-white tracking-[-0.44px]">RunSense</Text>
  </View>
);

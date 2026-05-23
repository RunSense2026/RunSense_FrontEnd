import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

import { AuthShell, AEField } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

export const LoginScreen = ({ navigation }: ScreenProps<'Login'>) => {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [focus, setFocus] = useState<'email' | 'pwd' | null>(null);

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
            secureTextEntry
            focused={focus === 'pwd'}
            onFocus={() => setFocus('pwd')}
            onBlur={() => setFocus(null)}
          />
          <Pressable
            onPress={() => navigation.navigate('FindAccount')}
            className="self-end -mt-[2px]"
          >
            <Text className="text-[12px] text-t3 font-medium">비밀번호 찾기</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('LoginPassword', { email })}
          className="mt-[18px]"
        >
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
          >
            <Text className="text-white text-[15px] font-semibold">로그인</Text>
          </LinearGradient>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center gap-[10px] my-5">
          <View className="flex-1 h-[0.5px] bg-white/10" />
          <Text className="text-[11px] text-t3 font-medium">또는</Text>
          <View className="flex-1 h-[0.5px] bg-white/10" />
        </View>

        {/* Social */}
        <View className="flex-row gap-2">
          <SocialBtn label="Apple" />
          <SocialBtn label="Kakao" bg="#FEE500" fg="#000" />
          <SocialBtn label="Google" />
        </View>

        <Pressable onPress={() => navigation.navigate('Signup')} className="mt-[18px]">
          <Text className="text-center text-[13px] text-t2 font-medium">
            아직 계정이 없으신가요? <Text className="text-purple-300 font-semibold">회원가입</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </AuthShell>
  );
};

const RSLogo = () => (
  <View className="flex-row items-center gap-[10px]">
    <LinearGradient
      colors={gradients.action}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx={14} cy={4.5} r={1.6} fill="#fff" />
        <Path d="M9 21l3-7-3-2 2-5 5 2 3 4" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </LinearGradient>
    <Text className="text-[22px] font-bold text-white tracking-[-0.44px]">RunSense</Text>
  </View>
);

const SocialBtn = ({ label, bg, fg }: { label: string; bg?: string; fg?: string }) => (
  <Pressable
    className="flex-1 rounded-[12px] py-3 items-center"
    style={{
      backgroundColor: bg ?? 'rgba(255,255,255,0.06)',
      borderWidth: bg ? 0 : 0.5,
      borderColor: 'rgba(255,255,255,0.1)',
    }}
  >
    <Text className="text-[12px] font-semibold" style={{ color: fg ?? '#fff' }}>{label}</Text>
  </Pressable>
);

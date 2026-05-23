import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';

import { AuthShell, AEBackButton, AEField } from '@/components/domain';
import { Checkbox } from '@/screens/LoginPasswordScreen';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

type AgreeKey = 'all' | 'tos' | 'privacy' | 'marketing';

export const SignupScreen = ({ navigation }: ScreenProps<'Signup'>) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('jinwoo@email.com');
  const [pwd, setPwd] = useState('●●●●●●●●');
  const [pwd2, setPwd2] = useState('●●●●●●●●');
  const [focus, setFocus] = useState<'n' | 'e' | 'p' | 'p2' | null>(null);
  const [agrees, setAgrees] = useState({ all: false, tos: true, privacy: true, marketing: false });

  const handleToggle = (k: AgreeKey) => {
    const next = { ...agrees, [k]: !agrees[k] } as typeof agrees;
    if (k !== 'all') next.all = next.tos && next.privacy && next.marketing;
    if (k === 'all') {
      next.tos = !agrees.all;
      next.privacy = !agrees.all;
      next.marketing = !agrees.all;
    }
    setAgrees(next);
  };

  const strength = Math.min(4, Math.max(1, Math.floor(pwd.length / 3)));
  const strengthColor =
    strength <= 1 ? '#ef4444' : strength <= 2 ? '#fbbf24' : strength <= 3 ? '#a78bfa' : '#6ee7b7';
  const strengthLabel =
    strength <= 1 ? '약함' : strength <= 2 ? '보통' : strength <= 3 ? '안전' : '매우 안전';
  const strengthLabelColor =
    strength <= 1 ? '#fca5a5' : strength <= 2 ? '#fbbf24' : strength <= 3 ? '#c4b5fd' : '#6ee7b7';

  return (
    <AuthShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-3 pb-[18px]">
          <AEBackButton onPress={() => navigation.goBack()} />
          <Text className="text-[13px] text-purple-300 font-bold tracking-[0.52px]">Step 1 of 3</Text>
        </View>

        <Text className="text-[28px] font-bold text-white tracking-[-0.84px] leading-[34px]">
          계정 만들고{'\n'}첫 러닝을{'\n'}
          <Text className="text-purple-300">시작해요</Text>
        </Text>
        <Text className="text-[13px] mt-2 font-medium" style={{ color: 'rgba(221,214,254,0.7)' }}>
          이미 계정이 있나요?{' '}
          <Text onPress={() => navigation.navigate('Login')} className="text-purple-300 font-bold">
            로그인
          </Text>
        </Text>

        <View className="gap-[10px] mt-[22px]">
          <AEField
            label="이름"
            value={name}
            onChangeText={setName}
            placeholder="홍길동"
            focused={focus === 'n'}
            onFocus={() => setFocus('n')}
            onBlur={() => setFocus(null)}
          />
          <AEField
            label="이메일"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            focused={focus === 'e'}
            onFocus={() => setFocus('e')}
            onBlur={() => setFocus(null)}
            right={
              <View className="flex-row items-center gap-1">
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Polyline points="20 6 9 17 4 12" stroke="#6ee7b7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text className="text-[10px] text-good font-bold">사용 가능</Text>
              </View>
            }
          />

          <AEField
            label="비밀번호"
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry
            focused={focus === 'p'}
            onFocus={() => setFocus('p')}
            onBlur={() => setFocus(null)}
          />
          {/* strength meter */}
          <View className="flex-row gap-1 -mt-1 ml-[2px] items-center">
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                className="flex-1 h-[3px] rounded-full"
                style={{ backgroundColor: i <= strength ? strengthColor : 'rgba(167,139,250,0.14)' }}
              />
            ))}
            <Text className="text-[9px] font-bold ml-[6px]" style={{ color: strengthLabelColor }}>{strengthLabel}</Text>
          </View>

          <AEField
            label="비밀번호 확인"
            value={pwd2}
            onChangeText={setPwd2}
            placeholder="••••••••"
            secureTextEntry
            focused={focus === 'p2'}
            onFocus={() => setFocus('p2')}
            onBlur={() => setFocus(null)}
            hint="8자 이상, 영문·숫자·특수문자 포함"
          />
        </View>

        {/* Agreements */}
        <View
          className="mt-[18px] px-[14px] py-3 rounded-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.14)',
          }}
        >
          <AgreeRow checked={agrees.all} onToggle={() => handleToggle('all')} bold label="전체 동의" />
          <View className="h-[0.5px] my-[10px]" style={{ backgroundColor: 'rgba(167,139,250,0.12)' }} />
          <AgreeRow checked={agrees.tos} onToggle={() => handleToggle('tos')} label="이용약관 동의" required />
          <AgreeRow checked={agrees.privacy} onToggle={() => handleToggle('privacy')} label="개인정보처리방침 동의" required />
          <AgreeRow checked={agrees.marketing} onToggle={() => handleToggle('marketing')} label="마케팅 정보 수신 (선택)" />
        </View>

        <Pressable onPress={() => navigation.navigate('Onboarding')} className="mt-[18px]">
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 15, borderRadius: 16, alignItems: 'center' }}
          >
            <Text className="text-white text-[15px] font-bold">다음 →</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </AuthShell>
  );
};

interface AgreeRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  required?: boolean;
  bold?: boolean;
}

const AgreeRow = ({ checked, onToggle, label, required, bold }: AgreeRowProps) => (
  <Pressable
    onPress={onToggle}
    className="flex-row items-center gap-[10px]"
    style={{ paddingVertical: bold ? 0 : 6 }}
  >
    <Checkbox checked={checked} />
    <Text
      className={`flex-1 text-white ${bold ? 'text-[14px] font-bold' : 'text-[13px] font-medium'}`}
    >
      {label}
    </Text>
    {required && <Text className="text-[10px] text-purple-300 font-bold">필수</Text>}
    {!bold && (
      <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6l6 6-6 6" stroke="rgba(167,139,250,0.4)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )}
  </Pressable>
);

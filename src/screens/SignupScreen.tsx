import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline } from 'react-native-svg';

import { AuthShell, AEBackButton, AEField } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

export const SignupScreen = ({ navigation }: ScreenProps<'Signup'>) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('jinwoo@email.com');
  const [pwd, setPwd] = useState('●●●●●●●●');
  const [pwd2, setPwd2] = useState('●●●●●●●●');
  const [focus, setFocus] = useState<'n' | 'e' | 'p' | 'p2' | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);

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
        <View className="pb-[18px]">
          <AEBackButton onPress={() => navigation.goBack()} />
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
            maxLength={20}
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
            hint={emailChecked ? '✓ 사용 가능한 이메일이에요' : '사용 가능 이메일을 입력 후 중복 확인해주세요'}
            hintColor={emailChecked ? '#6ee7b7' : undefined}
            right={
              <Pressable onPress={() => setEmailChecked(true)} disabled={emailChecked}>
                {emailChecked ? (
                  <View
                    className="flex-row items-center gap-1 px-[10px] py-[7px] rounded-[10px]"
                    style={{
                      backgroundColor: 'rgba(110,231,183,0.16)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(110,231,183,0.45)',
                    }}
                  >
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                      <Polyline points="20 6 9 17 4 12" stroke="#6ee7b7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text className="text-[11px] text-good font-bold">확인됨</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}
                  >
                    <Text className="text-white text-[11px] font-bold">중복 확인</Text>
                  </LinearGradient>
                )}
              </Pressable>
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
            hint="8자 이상, 영문·숫자·특수문자 포함"
          />
          {/* strength meter */}
          <View className="flex-row gap-1 mt-1 ml-[2px] items-center">
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
          />
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

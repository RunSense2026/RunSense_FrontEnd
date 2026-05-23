import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';

import { AuthShell, AEBackButton, AEField } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

type Tab = 'id' | 'pwd';

export const FindAccountScreen = ({ navigation }: ScreenProps<'FindAccount'>) => {
  const [tab, setTab] = useState<Tab>('pwd');
  const [phone, setPhone] = useState('010-1234-5678');
  const [email, setEmail] = useState('jinwoo@email.com');
  const [code, setCode] = useState('8 4 6 2');
  const [sent, setSent] = useState(true);
  const [focus, setFocus] = useState<'e' | 'p' | 'c' | null>(null);

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

        <Text className="text-[26px] font-bold text-white tracking-[-0.78px] leading-[31px]">
          계정 정보를{'\n'}찾아드릴게요
        </Text>
        <Text className="text-[13px] mt-2 font-medium" style={{ color: 'rgba(221,214,254,0.7)' }}>
          가입 시 입력한 정보로 인증해주세요
        </Text>

        {/* Tab switch */}
        <View
          className="flex-row gap-1 rounded-[12px] p-1 mt-[22px] mb-[18px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.14)',
          }}
        >
          {(['id', 'pwd'] as Tab[]).map((t) => {
            const active = tab === t;
            const label = t === 'id' ? '아이디 찾기' : '비밀번호 찾기';
            if (active) {
              return (
                <Pressable key={t} onPress={() => setTab(t)} className="flex-1">
                  <LinearGradient
                    colors={gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: 10, borderRadius: 9, alignItems: 'center' }}
                  >
                    <Text className="text-white text-[13px] font-bold">{label}</Text>
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable key={t} onPress={() => setTab(t)} className="flex-1 py-[10px] items-center">
                <Text className="text-[13px] font-bold" style={{ color: 'rgba(221,214,254,0.65)' }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Form */}
        <View className="gap-[10px]">
          {tab === 'pwd' && (
            <AEField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              focused={focus === 'e'}
              onFocus={() => setFocus('e')}
              onBlur={() => setFocus(null)}
            />
          )}

          <AEField
            label="휴대폰 번호"
            value={phone}
            onChangeText={setPhone}
            placeholder="010-0000-0000"
            keyboardType="phone-pad"
            focused={focus === 'p'}
            onFocus={() => setFocus('p')}
            onBlur={() => setFocus(null)}
            right={
              <Pressable onPress={() => setSent(true)}>
                {sent ? (
                  <View
                    className="px-3 py-[6px] rounded-lg"
                    style={{
                      backgroundColor: 'rgba(167,139,250,0.14)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(167,139,250,0.3)',
                    }}
                  >
                    <Text className="text-purple-200 text-[11px] font-bold">재전송</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Text className="text-white text-[11px] font-bold">인증번호</Text>
                  </LinearGradient>
                )}
              </Pressable>
            }
          />

          {sent && (
            <AEField
              label="인증번호"
              value={code}
              onChangeText={setCode}
              placeholder="6자리 코드"
              keyboardType="number-pad"
              focused={focus === 'c'}
              onFocus={() => setFocus('c')}
              onBlur={() => setFocus(null)}
              right={
                <View
                  className="px-2 py-[3px] rounded-lg"
                  style={{
                    backgroundColor: 'rgba(251,191,36,0.12)',
                    borderWidth: 0.5,
                    borderColor: 'rgba(251,191,36,0.3)',
                  }}
                >
                  <Text className="text-warn text-[11px] font-bold">02:48</Text>
                </View>
              }
              hint="인증번호가 발송되었어요. 3분 안에 입력해주세요."
            />
          )}
        </View>

        {/* Result preview */}
        {tab === 'id' && (
          <LinearGradient
            colors={['rgba(110,231,183,0.16)', 'rgba(59,130,246,0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              marginTop: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: 'rgba(110,231,183,0.32)',
            }}
          >
            <View className="flex-row items-center gap-2">
              <View
                className="w-6 h-6 rounded-lg items-center justify-center"
                style={{ backgroundColor: 'rgba(110,231,183,0.22)' }}
              >
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Polyline points="20 6 9 17 4 12" stroke="#6ee7b7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text className="text-[11px] text-good font-bold tracking-[0.52px]">회원님의 아이디</Text>
            </View>
            <Text className="text-[18px] text-white font-bold mt-[10px]">j••••oo@email.com</Text>
            <Text className="text-[10px] mt-1 font-medium" style={{ color: 'rgba(221,214,254,0.6)' }}>
              가입일: 2024.08.12
            </Text>
          </LinearGradient>
        )}

        <View className="h-[18px]" />

        <Pressable onPress={() => navigation.goBack()}>
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 15, borderRadius: 16, alignItems: 'center' }}
          >
            <Text className="text-white text-[15px] font-bold">
              {tab === 'id' ? '확인' : '비밀번호 재설정'}
            </Text>
          </LinearGradient>
        </Pressable>

        <View className="flex-row justify-center gap-[14px] mt-[14px] items-center">
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text className="text-[12px] font-medium" style={{ color: 'rgba(221,214,254,0.55)' }}>로그인</Text>
          </Pressable>
          <View className="w-[0.5px] h-3" style={{ backgroundColor: 'rgba(167,139,250,0.2)' }} />
          <Pressable onPress={() => navigation.navigate('Signup')}>
            <Text className="text-[12px] font-medium" style={{ color: 'rgba(221,214,254,0.55)' }}>회원가입</Text>
          </Pressable>
          <View className="w-[0.5px] h-3" style={{ backgroundColor: 'rgba(167,139,250,0.2)' }} />
          <Text className="text-[12px] text-purple-300 font-bold">고객센터</Text>
        </View>
      </ScrollView>
    </AuthShell>
  );
};

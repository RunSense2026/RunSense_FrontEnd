import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

import { AuthShell, AEBackButton, AEField } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

export const FindAccountScreen = ({ navigation }: ScreenProps<'FindAccount'>) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [focus, setFocus] = useState<'e' | 'c' | 'np' | 'np2' | null>(null);

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
          가입한 이메일로 인증번호를 보내드릴게요
        </Text>

        {/* Form */}
        <View className="gap-[10px] mt-[22px]">
          <AEField
            label="이메일 (아이디)"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            focused={focus === 'e'}
            onFocus={() => setFocus('e')}
            onBlur={() => setFocus(null)}
            right={
              <Pressable onPress={() => setCodeSent(true)}>
                {codeSent ? (
                  <View
                    className="px-3 py-[6px] rounded-[9px]"
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
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 }}
                  >
                    <Text className="text-white text-[11px] font-bold">전송</Text>
                  </LinearGradient>
                )}
              </Pressable>
            }
          />

          {codeSent && (
            <AEField
              label="인증번호"
              value={code}
              onChangeText={setCode}
              placeholder="6자리 코드"
              keyboardType="number-pad"
              maxLength={6}
              focused={focus === 'c'}
              onFocus={() => setFocus('c')}
              onBlur={() => setFocus(null)}
              right={
                codeVerified ? (
                  <View
                    className="flex-row items-center gap-1 px-[10px] py-[6px] rounded-[9px]"
                    style={{
                      backgroundColor: 'rgba(110,231,183,0.16)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(110,231,183,0.45)',
                    }}
                  >
                    <Text className="text-good text-[11px] font-bold">✓ 인증 완료</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => setCodeVerified(true)}>
                    <LinearGradient
                      colors={gradients.action}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 }}
                    >
                      <Text className="text-white text-[11px] font-bold">확인</Text>
                    </LinearGradient>
                  </Pressable>
                )
              }
            />
          )}
        </View>

        {/* New password — appears after the code is verified */}
        {codeVerified && (
          <View
            className="rounded-[16px] p-[14px] mt-3"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 0.5,
              borderColor: 'rgba(167,139,250,0.16)',
            }}
          >
            <View className="flex-row items-center gap-2 mb-[12px]">
              <View
                className="w-7 h-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: 'rgba(167,139,250,0.16)' }}
              >
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                  <Rect x={4} y={10} width={16} height={11} rx={2.5} stroke="#a78bfa" strokeWidth={2} />
                  <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </View>
              <Text className="text-[13px] font-bold text-white">새 비밀번호 설정</Text>
            </View>

            <View className="gap-[10px]">
              <AEField
                label="새 비밀번호"
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="••••••••"
                secureTextEntry
                focused={focus === 'np'}
                onFocus={() => setFocus('np')}
                onBlur={() => setFocus(null)}
                hint="8자 이상, 영문·숫자·특수문자 포함"
              />
              <AEField
                label="비밀번호 확인"
                value={newPwd2}
                onChangeText={setNewPwd2}
                placeholder="••••••••"
                secureTextEntry
                focused={focus === 'np2'}
                onFocus={() => setFocus('np2')}
                onBlur={() => setFocus(null)}
              />
            </View>
          </View>
        )}

        <View className="h-[18px]" />

        <Pressable onPress={() => navigation.goBack()}>
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 15, borderRadius: 16, alignItems: 'center' }}
          >
            <Text className="text-white text-[15px] font-bold">비밀번호 변경</Text>
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

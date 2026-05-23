import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

import { AuthShell, AEBackButton, AEField } from '@/components/domain';
import { gradients } from '@/theme/tokens';

import type { ScreenProps } from '@/types/navigation';

export const LoginPasswordScreen = ({ navigation, route }: ScreenProps<'LoginPassword'>) => {
  const [pwd, setPwd] = useState('');
  const [remember, setRemember] = useState(true);
  const email = route.params?.email || 'jinwoo@email.com';

  return (
    <AuthShell>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top */}
        <View className="flex-row items-center justify-between pb-[18px]">
          <AEBackButton onPress={() => navigation.goBack()} />
          <View className="flex-row gap-[6px]">
            <ProgressBar full />
            <ProgressBar full />
            <ProgressBar />
          </View>
        </View>

        {/* Identity pill */}
        <View
          className="self-start flex-row items-center gap-2 pl-2 pr-3 py-[6px] rounded-full mb-[18px]"
          style={{
            backgroundColor: 'rgba(167,139,250,0.14)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.32)',
          }}
        >
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="text-white text-[10px] font-bold">진</Text>
          </LinearGradient>
          <Text className="text-[12px] font-semibold" style={{ color: '#ddd6fe' }}>{email}</Text>
          <Text className="text-[11px] text-purple-300 font-bold ml-[2px]">변경</Text>
        </View>

        <Text className="text-[28px] font-bold text-white tracking-[-0.84px] leading-[34px]">
          다시 만나서{'\n'}반가워요, <Text className="text-purple-300">진우</Text>님
        </Text>
        <Text className="text-[13px] mt-2 font-medium" style={{ color: 'rgba(221,214,254,0.7)' }}>
          비밀번호를 입력해주세요
        </Text>

        {/* Last session card */}
        <LinearGradient
          colors={['rgba(124,58,237,0.22)', 'rgba(59,130,246,0.14)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            marginTop: 20,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.32)',
          }}
        >
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={14} cy={4.5} r={1.6} fill="#fff" />
              <Path d="M9 21l3-7-3-2 2-5 5 2 3 4" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-[10px] text-purple-300 font-bold tracking-[0.6px] uppercase">
              마지막 러닝
            </Text>
            <Text className="text-[13px] text-white font-bold mt-[3px]">5.24 km · 어제 6:42 PM</Text>
          </View>
          <View className="items-end">
            <Text className="text-[14px] font-bold text-purple-200 tracking-[-0.28px]">5'29"</Text>
            <Text className="text-[9px] font-semibold tracking-[0.36px]" style={{ color: 'rgba(221,214,254,0.5)' }}>PACE</Text>
          </View>
        </LinearGradient>

        {/* Password */}
        <View className="mt-[22px]">
          <AEField
            label="비밀번호"
            value={pwd}
            onChangeText={setPwd}
            placeholder="••••••••"
            secureTextEntry
            focused
            right={
              <Pressable hitSlop={8} className="p-1">
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                    stroke="rgba(167,139,250,0.7)"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Circle cx={12} cy={12} r={3} stroke="rgba(167,139,250,0.7)" strokeWidth={1.8} />
                </Svg>
              </Pressable>
            }
          />
        </View>

        {/* Options */}
        <View className="flex-row justify-between items-center mt-[14px]">
          <Pressable
            onPress={() => setRemember((v) => !v)}
            className="flex-row items-center gap-2"
          >
            <Checkbox checked={remember} size={18} />
            <Text className="text-[12px] font-medium" style={{ color: 'rgba(221,214,254,0.8)' }}>로그인 상태 유지</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FindAccount')}>
            <Text className="text-[12px] text-purple-300 font-bold">비밀번호 찾기</Text>
          </Pressable>
        </View>

        <View className="h-[60px]" />

        <Pressable onPress={() => navigation.navigate('Home')}>
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 15,
              borderRadius: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text className="text-white text-[15px] font-bold">로그인</Text>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </LinearGradient>
        </Pressable>

        <View className="flex-row justify-center gap-3 mt-[14px]">
          <BioBtn label="Face ID" />
          <BioBtn label="Touch ID" />
        </View>
      </ScrollView>
    </AuthShell>
  );
};

const ProgressBar = ({ full }: { full?: boolean }) =>
  full ? (
    <LinearGradient
      colors={gradients.action}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ width: 28, height: 3, borderRadius: 2 }}
    />
  ) : (
    <View className="w-[18px] h-[3px] rounded-[2px]" style={{ backgroundColor: 'rgba(167,139,250,0.18)' }} />
  );

export const Checkbox = ({ checked, size = 20 }: { checked: boolean; size?: number }) =>
  checked ? (
    <LinearGradient
      colors={gradients.action}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <Polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </LinearGradient>
  ) : (
    <View
      className="rounded-md"
      style={{
        width: size,
        height: size,
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.3)',
      }}
    />
  );

const BioBtn = ({ label }: { label: string }) => (
  <Pressable
    className="flex-1 py-[10px] rounded-[14px] items-center justify-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.2)',
    }}
  >
    <Text className="text-purple-200 text-[12px] font-bold">{label}</Text>
  </Pressable>
);

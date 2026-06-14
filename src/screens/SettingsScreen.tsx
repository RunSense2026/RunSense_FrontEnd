import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { LightShell, ProfileAvatar } from '@/components/domain';
import { logout } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useInsoleStore } from '@/stores/insoleStore';
import { refreshToken } from '@/utils/storage';

import type { TabScreenProps } from '@/types/navigation';

export const SettingsScreen = ({ navigation }: TabScreenProps<'Settings'>) => {
  const { name, email, age, weight, avatarUri } = useProfileStore();
  const clearSession = useAuthStore((s) => s.clearSession);
  const insoleL = useInsoleStore((s) => s.L);
  const insoleR = useInsoleStore((s) => s.R);
  // 연결된 기기 수: 왼/오른발 인솔 + Galaxy Watch(이름만, 항상 포함)
  const deviceCount = (insoleL.connected ? 1 : 0) + (insoleR.connected ? 1 : 0) + 1;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const token = refreshToken.get();
      // 서버에 리프레시 토큰 무효화 요청 (실패해도 로컬 세션은 정리한다)
      if (token) {
        await logout({ refreshToken: token });
      }
    } catch {
      // 네트워크 오류 등은 무시하고 로컬 로그아웃을 진행
    } finally {
      clearSession();
      navigation.navigate('Login');
    }
  };

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
        <View className="pt-1 pb-[14px]">
          <Text className="text-[11px] font-semibold tracking-[0.66px] uppercase" style={{ color: '#7c6bb5' }}>
            계정 & 환경
          </Text>
          <Text className="text-[22px] font-bold mt-1 tracking-[-0.66px]" style={{ color: '#1e1b4b' }}>설정</Text>
        </View>

        <ProfileCard name={name} email={email} avatarUri={avatarUri} onEdit={() => navigation.navigate('EditProfile')} />

        <SettingsSection icon="👤" title="프로필">
          <SettingsRow label="나이" value={age} unit="세" />
          <SettingsDivider />
          <SettingsRow label="체중" value={weight} unit="kg" />
          <SettingsDivider />
          <SettingsRow label="안정시 심박수" value="58" unit="bpm" />
          <SettingsDivider />
          <SettingsRow label="LTHR" value="162" unit="bpm" highlight />
        </SettingsSection>

        <SettingsSection icon="⚙" title="일반">
          <SettingsRow label="거리 단위" value="km" chevron />
          <SettingsDivider />
          <Pressable onPress={() => navigation.navigate('Devices')}>
            <SettingsRow
              label="연결된 기기"
              valueComponent={
                <View className="flex-row items-center gap-[6px]">
                  <View className="w-[7px] h-[7px] rounded-full bg-purple-500" />
                  <Text className="text-purple-500 font-bold text-[13px]">{deviceCount}개 연결됨</Text>
                </View>
              }
              chevron
            />
          </Pressable>
          <SettingsDivider />
          <SettingsRow label="알림" value="켜짐" chevron />
          <SettingsDivider />
          <SettingsRow label="앱 버전" value="2.4.1" mute />
        </SettingsSection>

        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          className="py-[14px] rounded-[14px] items-center flex-row justify-center gap-2 mt-1"
          style={{
            backgroundColor: 'rgba(239,68,68,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.45)',
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#dc2626" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M16 17l5-5-5-5M21 12H9" stroke="#dc2626" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text className="text-[14px] font-bold" style={{ color: '#dc2626' }}>로그아웃</Text>
        </Pressable>

        <Text className="text-[10px] text-center mt-[10px] font-medium" style={{ color: 'rgba(124,58,237,0.5)' }}>
          © 2026 RunSense · 개인정보처리방침 · 이용약관
        </Text>
      </ScrollView>
    </LightShell>
  );
};

const ProfileCard = ({
  name,
  email,
  avatarUri,
  onEdit,
}: {
  name: string;
  email: string;
  avatarUri: string | null;
  onEdit: () => void;
}) => (
  <LinearGradient
    colors={['rgba(255,255,255,0.95)', 'rgba(243,232,255,0.85)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{
      borderRadius: 18,
      padding: 16,
      marginBottom: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 0.5,
      borderColor: 'rgba(124,58,237,0.2)',
    }}
  >
    <ProfileAvatar name={name} uri={avatarUri} size={60} />

    <View className="flex-1">
      <View className="flex-row items-center gap-[6px] mb-[2px]">
        <Text className="text-[16px] font-bold tracking-[-0.32px]" style={{ color: '#1e1b4b' }}>{name}</Text>
      </View>
      <Text className="text-[12px] font-medium" style={{ color: '#6b5ca5' }}>{email}</Text>
      <Text className="text-[10px] font-semibold mt-1 tracking-[0.4px]" style={{ color: '#9b8cc5' }}>
        가입 2024.03 · 47회 러닝 · 234km
      </Text>
    </View>

    <Pressable
      onPress={onEdit}
      className="w-8 h-8 rounded-[10px] items-center justify-center"
      style={{
        backgroundColor: 'rgba(124,58,237,0.1)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.2)',
      }}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M12 20h9" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" />
        <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" stroke="#7c3aed" strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </Pressable>
  </LinearGradient>
);

const SettingsSection = ({ icon, title, children }: { icon: string; title: string; children: ReactNode }) => (
  <View className="mb-[18px]">
    <View className="flex-row items-center gap-[7px] mb-2 pl-1">
      <Text className="text-[13px]">{icon}</Text>
      <Text className="text-[11px] font-bold tracking-[0.88px] uppercase" style={{ color: '#7c6bb5' }}>
        {title}
      </Text>
    </View>
    <View
      className="rounded-[14px] overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 0.5,
        borderColor: 'rgba(124,58,237,0.12)',
      }}
    >
      {children}
    </View>
  </View>
);

interface SettingsRowProps {
  label: string;
  value?: string;
  unit?: string;
  valueComponent?: ReactNode;
  chevron?: boolean;
  highlight?: boolean;
  mute?: boolean;
}

const SettingsRow = ({ label, value, unit, valueComponent, chevron, highlight, mute }: SettingsRowProps) => (
  <View className="flex-row items-center gap-3 px-[14px] py-[13px]">
    <Text className="flex-1 text-[13px] font-medium" style={{ color: '#1e1b4b' }}>{label}</Text>
    {valueComponent ?? (
      <View className="flex-row items-baseline gap-[3px]">
        <Text
          className="text-[14px] font-bold tracking-[-0.28px]"
          style={{ color: highlight ? '#7c3aed' : mute ? '#9b8cc5' : '#1e1b4b' }}
        >
          {value}
        </Text>
        {unit && <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>{unit}</Text>}
      </View>
    )}
    {chevron && (
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18l6-6-6-6" stroke="#9b8cc5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )}
  </View>
);

const SettingsDivider = () => <View className="h-px mx-[14px]" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }} />;

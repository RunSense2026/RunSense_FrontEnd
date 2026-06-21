import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { LightShell, ProfileAvatar } from '@/components/domain';
import { logout, readAllRuns } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useInsoleStore } from '@/stores/insoleStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { refreshToken } from '@/utils/storage';

import type { TabScreenProps } from '@/types/navigation';

export const SettingsScreen = ({ navigation }: TabScreenProps<'Settings'>) => {
  const { name, email, age, weight, avatarUri, joinedAt, runCount, totalDistanceKm, setStats } = useProfileStore();
  const clearSession = useAuthStore((s) => s.clearSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const insoleL = useInsoleStore((s) => s.L);
  const insoleR = useInsoleStore((s) => s.R);
  // 연결된 기기 수: 왼/오른발 인솔 + Galaxy Watch(이름만, 항상 포함)
  const deviceCount = (insoleL.connected ? 1 : 0) + (insoleR.connected ? 1 : 0) + 1;
  const { notifications, distanceUnit, setNotifications, toggleDistanceUnit } = useSettingsStore();
  const [loggingOut, setLoggingOut] = useState(false);

  // 화면 진입 시 러닝 기록 합계(횟수·거리)를 최신값으로 갱신한다. (가입일은 로그인 응답값 유지)
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      let cancelled = false;
      readAllRuns()
        .then((res) => {
          if (!cancelled) setStats({ runCount: res.totalCount, totalDistanceKm: res.totalDistance });
        })
        .catch(() => {
          // 통계 갱신 실패는 무시 — 로그인 응답으로 시드된 값/'--' 가 유지된다.
        });
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, setStats]),
  );

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

        <ProfileCard
          name={name}
          email={email}
          avatarUri={avatarUri}
          meta={`가입 ${fmtJoinedDate(joinedAt)} · ${runCount ?? '--'}회 러닝 · ${fmtTotalDistance(totalDistanceKm)}km`}
          onEdit={() => navigation.navigate('EditProfile')}
        />

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
          <Pressable onPress={toggleDistanceUnit}>
            <SettingsRow
              label="거리 단위"
              valueComponent={
                <Text className="text-purple-500 font-bold text-[13px]">
                  {distanceUnit === 'km' ? '킬로미터 (km)' : '마일 (mi)'}
                </Text>
              }
              chevron
            />
          </Pressable>
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
          <SettingsRow
            label="알림"
            valueComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: 'rgba(124,58,237,0.2)', true: '#a78bfa' }}
                thumbColor="#ffffff"
              />
            }
          />
          <SettingsDivider />
          <SettingsRow label="앱 버전" value="0.0.1" mute />
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

// 가입 날짜(ISO/date) → "2024.03". 값이 없으면 "--".
const fmtJoinedDate = (iso: string | null): string => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// 누적 거리(km) → 표시 문자열. 100km 미만은 소수 1자리, 이상은 정수. 값이 없으면 "--".
const fmtTotalDistance = (km: number | null): string => {
  if (km == null) return '--';
  return km >= 100 ? String(Math.round(km)) : km.toFixed(1);
};

const ProfileCard = ({
  name,
  email,
  avatarUri,
  meta,
  onEdit,
}: {
  name: string;
  email: string;
  avatarUri: string | null;
  meta: string;
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
        {meta}
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

import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { LightShell, ProfileAvatar } from '@/components/domain';
import { logout, readAllRuns, readMyProfile, updateMyProfile } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useInsoleStore } from '@/stores/insoleStore';
import { useWatchStore } from '@/stores/watchStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ageFromBirthDate, fieldToNumber, genderLabel } from '@/utils/profile';
import { refreshToken } from '@/utils/storage';

import type { UserResponseDto, UserUpdateRequestDto } from '@/types/api';
import type { TabScreenProps } from '@/types/navigation';

// 이전 버전은 안정시 심박수·LTHR 을 기기에만 저장했다.
// 서버에 값이 없고 기기에만 있으면 한 번 올려, 다른 기기·재로그인·AI 코칭에서도 쓰이게 한다.
const uploadDeviceOnlyHeartRates = (user: UserResponseDto) => {
  const { restingHr, lthr, applyServerProfile } = useProfileStore.getState();
  const restingValue = fieldToNumber(restingHr);
  const lthrValue = fieldToNumber(lthr);
  const patch: UserUpdateRequestDto = {};
  if (user.restingHeartRate == null && restingValue) patch.restingHeartRate = restingValue;
  if (user.lthr == null && lthrValue && Number.isInteger(lthrValue)) patch.lthr = lthrValue;
  if (Object.keys(patch).length === 0) return;
  updateMyProfile(patch)
    .then(applyServerProfile)
    .catch(() => {
      // 실패해도 기기 값은 남아 있어 다음 진입 때 다시 시도한다.
    });
};

export const SettingsScreen = ({ navigation }: TabScreenProps<'Settings'>) => {
  const {
    name,
    email,
    birthDate,
    gender,
    height,
    weight,
    restingHr,
    lthr,
    avatarUri,
    joinedAt,
    runCount,
    totalDistanceKm,
    setStats,
    applyServerProfile,
  } = useProfileStore();
  const clearSession = useAuthStore((s) => s.clearSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const insoleL = useInsoleStore((s) => s.L);
  const insoleR = useInsoleStore((s) => s.R);
  // 연결된 기기 수: 왼/오른발 인솔 + Galaxy Watch(Data Layer 로 실제 연결 확인)
  const watchConnected = useWatchStore((s) => s.connected);
  const deviceCount = (insoleL.connected ? 1 : 0) + (insoleR.connected ? 1 : 0) + (watchConnected ? 1 : 0);
  const { notifications, distanceUnit, setNotifications, toggleDistanceUnit } = useSettingsStore();
  const [loggingOut, setLoggingOut] = useState(false);
  // 서버는 생년월일만 저장하므로 나이는 화면에서 계산해 보여준다.
  const age = String(ageFromBirthDate(birthDate) ?? '');

  // 화면 진입 시 서버 값으로 갱신한다 — 프로필(이름·신체 정보)과 러닝 기록 합계(횟수·거리).
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      let cancelled = false;
      readMyProfile()
        .then((user) => {
          if (cancelled) return;
          applyServerProfile(user);
          uploadDeviceOnlyHeartRates(user);
        })
        .catch(() => {
          // 조회 실패는 무시 — 기기에 캐시된 값/'--' 가 유지된다.
        });
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
    }, [isAuthenticated, setStats, applyServerProfile]),
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
          name={name || '게스트'}
          email={email || '로그인이 필요해요'}
          avatarUri={avatarUri}
          meta={`가입 ${fmtJoinedDate(joinedAt)} · ${runCount ?? '--'}회 러닝 · ${fmtTotalDistance(totalDistanceKm)}km`}
          onEdit={() => navigation.navigate('EditProfile')}
        />

        {/* 나이(생년월일)·성별·키·체중은 서버 값, 안정시 심박수·LTHR 은 서버에 필드가 없어 기기 저장 값. */}
        <SettingsSection icon="👤" title="프로필">
          <SettingsRow label="나이" value={orDash(age)} unit={age ? '세' : undefined} />
          <SettingsDivider />
          <SettingsRow label="성별" value={genderLabel(gender) ?? '--'} />
          <SettingsDivider />
          <SettingsRow label="키" value={orDash(height)} unit={height ? 'cm' : undefined} />
          <SettingsDivider />
          <SettingsRow label="체중" value={orDash(weight)} unit={weight ? 'kg' : undefined} />
          <SettingsDivider />
          <SettingsRow label="안정시 심박수" value={orDash(restingHr)} unit={restingHr ? 'bpm' : undefined} />
          <SettingsDivider />
          <SettingsRow label="LTHR" value={orDash(lthr)} unit={lthr ? 'bpm' : undefined} highlight={!!lthr} />
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

// 입력하지 않은 신체 정보는 '--' 로 표시한다.
const orDash = (v: string): string => (v.trim() ? v.trim() : '--');

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

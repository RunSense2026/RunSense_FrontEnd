import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, G, Line, Polygon } from 'react-native-svg';

import { useFocusEffect } from '@react-navigation/native';

import { readLatestLthrRecord } from '@/api';
import { DarkShell, DarkNavHeader } from '@/components/domain';
import { gradients } from '@/theme/tokens';
import { useInsoleStore } from '@/stores/insoleStore';
import { useProfileStore } from '@/stores/profileStore';
import { useWatchStore } from '@/stores/watchStore';
import { useAuthStore } from '@/stores/authStore';

import type { LthrRecordResponseDto } from '@/types/api';
import type { ScreenProps } from '@/types/navigation';

type Mode = 'dist' | 'free' | 'lthr';

export const RunSetupScreen = ({ navigation }: ScreenProps<'RunSetup'>) => {
  const [mode, setMode] = useState<Mode>('dist');
  const [distKm, setDistKm] = useState(5.0);
  const [timeMin, setTimeMin] = useState(28);

  // 미니 카드 값 — 연결 기기는 인솔 연결 상태(+Galaxy Watch), LTHR 은 프로필에 저장된 값.
  const insoleCount =
    (useInsoleStore((s) => s.L.connected) ? 1 : 0) + (useInsoleStore((s) => s.R.connected) ? 1 : 0);
  const watchConnected = useWatchStore((s) => s.connected);
  const deviceCount = insoleCount + (watchConnected ? 1 : 0);
  const lthr = useProfileStore((s) => s.lthr);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // LTHR 모드의 '지난 측정' 카드 — GET /api/lthr/latest. undefined = 불러오는 중/실패, null = 기록 없음
  const [latestLthr, setLatestLthr] = useState<LthrRecordResponseDto | null | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      let cancelled = false;
      readLatestLthrRecord()
        .then((record) => {
          if (!cancelled) setLatestLthr(record);
        })
        .catch(() => {
          // 조회 실패 시 카드는 '불러오지 못함' 상태로 둔다.
        });
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated]),
  );

  const pace = useMemo(() => {
    // 목표 페이스는 거리 모드(거리·시간 목표)에서만 계산된다.
    if (mode !== 'dist') return null;
    return (timeMin * 60) / distKm;
  }, [distKm, timeMin, mode]);

  const paceStr = pace
    ? `${Math.floor(pace / 60)}'${String(Math.round(pace - Math.floor(pace / 60) * 60)).padStart(2, '0')}"`
    : '—';

  const zone = !pace
    ? null
    : pace > 360
      ? { label: '유산소 (Z2)', c: '#6ee7b7' }
      : pace > 320
        ? { label: '템포 (Z3)', c: '#a78bfa' }
        : pace > 290
          ? { label: '역치 (Z4)', c: '#fbbf24' }
          : { label: '무산소 (Z5)', c: '#f87171' };

  const isLthr = mode === 'lthr';
  const isFree = mode === 'free';
  const showTargetInputs = mode === 'dist';

  return (
    <DarkShell>
      <View
        className="absolute top-0 -right-[80px] w-[260px] h-[260px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(124,58,237,0.32)' }}
        pointerEvents="none"
      />
      <View
        className="absolute bottom-[120px] -left-[80px] w-[220px] h-[220px] rounded-full opacity-40"
        style={{ backgroundColor: 'rgba(59,130,246,0.28)' }}
        pointerEvents="none"
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 }}>
        <DarkNavHeader title="러닝 시작" sub="오늘의 세션" onBack={() => navigation.goBack()} />

        {/* Mode tabs — dist | LTHR */}
        <View
          className="flex-row gap-1 rounded-[12px] p-1 mb-[14px]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.14)',
          }}
        >
          {(
            [
              { id: 'dist', label: '거리' },
              { id: 'free', label: '자유' },
              { id: 'lthr', label: 'LTHR', accent: true },
            ] as { id: Mode; label: string; accent?: boolean }[]
          ).map((t) => {
            const active = mode === t.id;
            const lthrActive = active && t.accent;
            if (active) {
              return (
                <Pressable key={t.id} onPress={() => setMode(t.id)} className="flex-1">
                  <LinearGradient
                    colors={lthrActive ? ['#f59e0b', '#ef4444'] : gradients.action}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      paddingVertical: 9,
                      borderRadius: 9,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    {t.accent && (
                      <Svg width={11} height={11} viewBox="0 0 24 24">
                        <Path
                          d="M12 21s-7-4.5-9.5-9.2C0.8 8.5 2.7 4.5 6.5 4.5c2 0 3.7 1 5.5 3 1.8-2 3.5-3 5.5-3 3.8 0 5.7 4 4 7.3C19 16.5 12 21 12 21z"
                          fill="#fff"
                        />
                      </Svg>
                    )}
                    <Text className="text-white text-[12px] font-bold">{t.label}</Text>
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={t.id}
                onPress={() => setMode(t.id)}
                className="flex-1 py-[9px] flex-row items-center justify-center gap-1"
              >
                {t.accent && (
                  <Svg width={11} height={11} viewBox="0 0 24 24">
                    <Path
                      d="M12 21s-7-4.5-9.5-9.2C0.8 8.5 2.7 4.5 6.5 4.5c2 0 3.7 1 5.5 3 1.8-2 3.5-3 5.5-3 3.8 0 5.7 4 4 7.3C19 16.5 12 21 12 21z"
                      fill="#fde68a"
                    />
                  </Svg>
                )}
                <Text
                  className="text-[12px] font-bold"
                  style={{ color: t.accent ? '#fde68a' : 'rgba(221,214,254,0.65)' }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Target inputs (dist | time only) */}
        {showTargetInputs && (
          <View
            className="rounded-[18px] p-4 mb-3"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 0.5,
              borderColor: 'rgba(167,139,250,0.18)',
            }}
          >
            <Text className="text-[10px] text-purple-300 font-bold tracking-[0.8px] uppercase">
              목표 거리
            </Text>

            <View className="flex-row items-center justify-between mt-[10px]">
              <StepBtn
                label="−"
                onPress={() => setDistKm(Math.max(0.5, +(distKm - 0.5).toFixed(1)))}
              />
              <View className="items-center">
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  className="text-[56px] font-bold text-white tracking-[-2.8px] leading-[58px]"
                >
                  {distKm.toFixed(2)}
                </Text>
                <Text className="text-[11px] text-purple-300 font-bold tracking-[0.88px] mt-1">
                  KILOMETERS
                </Text>
              </View>
              <StepBtn
                label="+"
                onPress={() => setDistKm(+(distKm + 0.5).toFixed(1))}
              />
            </View>

            <View className="flex-row gap-[6px] mt-[14px] justify-center flex-wrap">
              {[3, 5, 7, 10, 21.1].map((v) => {
                const active = distKm === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setDistKm(v)}
                    className="px-[10px] py-[5px] rounded-full"
                    style={{
                      backgroundColor: active ? 'rgba(167,139,250,0.28)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 0.5,
                      borderColor: active ? 'rgba(167,139,250,0.55)' : 'rgba(167,139,250,0.14)',
                    }}
                  >
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: active ? '#ddd6fe' : 'rgba(221,214,254,0.55)' }}
                    >
                      {v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              className="mt-3 px-3 py-[10px] rounded-[12px] flex-row justify-between items-center"
              style={{
                backgroundColor: 'rgba(167,139,250,0.08)',
                borderWidth: 0.5,
                borderColor: 'rgba(167,139,250,0.14)',
              }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>
                목표 완주 시간
              </Text>
              <View className="flex-row items-center gap-2">
                <BumpBtn label="−" onPress={() => setTimeMin(Math.max(5, timeMin - 1))} />
                <Text className="text-[16px] font-bold text-white text-center min-w-[50px]">
                  {timeMin}분
                </Text>
                <BumpBtn label="+" onPress={() => setTimeMin(timeMin + 1)} />
              </View>
            </View>
          </View>
        )}

        {/* Auto pace hero — 거리 모드에서만 (목표 거리·시간으로 페이스 계산) */}
        {mode === 'dist' && (
          <LinearGradient
            colors={['rgba(124,58,237,0.34)', 'rgba(59,130,246,0.22)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              borderWidth: 0.5,
              borderColor: 'rgba(167,139,250,0.4)',
            }}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#ddd6fe' }}>
                  ✦ 자동 계산된 목표 페이스
                </Text>
                <View className="flex-row items-baseline gap-1 mt-[6px]">
                  <Text numberOfLines={1} className="text-[38px] font-bold text-white tracking-[-1.52px] leading-[40px]">
                    {paceStr}
                  </Text>
                  <Text className="text-[12px] font-semibold" style={{ color: 'rgba(221,214,254,0.7)' }}>/km</Text>
                </View>
                {zone && (
                  <View
                    className="flex-row items-center self-start gap-[6px] mt-2 px-[9px] py-[3px] rounded-full"
                    style={{
                      backgroundColor: `${zone.c}22`,
                      borderWidth: 0.5,
                      borderColor: `${zone.c}55`,
                    }}
                  >
                    <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: zone.c }} />
                    <Text className="text-[10px] font-bold tracking-[0.4px]" style={{ color: zone.c }}>
                      {zone.label}
                    </Text>
                  </View>
                )}
              </View>
              <PaceGauge pace={pace} />
            </View>

            <View className="mt-[14px]">
              <View className="relative h-[22px] rounded-full opacity-80">
                <LinearGradient
                  colors={['#6ee7b7', '#a78bfa', '#fbbf24', '#f87171']}
                  locations={[0, 0.35, 0.65, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ height: 22, borderRadius: 999 }}
                />
                {pace && (
                  <View
                    className="absolute w-[6px] rounded bg-white"
                    style={{
                      top: -3,
                      bottom: -3,
                      left: `${Math.max(0, Math.min(100, ((420 - pace) / 240) * 100))}%`,
                      marginLeft: -3,
                    }}
                  />
                )}
              </View>
              <View className="flex-row justify-between mt-[6px]">
                {["7'00\"", "6'00\"", "5'00\"", "4'00\"", "3'00\""].map((v) => (
                  <Text key={v} className="text-[9px] font-semibold" style={{ color: 'rgba(221,214,254,0.55)' }}>
                    {v}
                  </Text>
                ))}
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Free-run intro hero — 자유 모드 */}
        {isFree && <FreeRunIntro />}

        {/* LTHR intro hero — LTHR mode */}
        {isLthr && <LTHRTestIntro latest={latestLthr} guest={!isAuthenticated} />}

        {/* Devices + LTHR mini cards */}
        <View className="flex-row gap-2 mb-3">
          <MiniInfo
            label="연결 기기"
            value={String(deviceCount)}
            sub={insoleCount === 2 && watchConnected ? '모두 정상' : insoleCount < 2 ? '인솔 확인 필요' : '워치 확인 필요'}
            tone="ok"
          />
          <MiniInfo label="내 LTHR" value={lthr || '--'} sub={lthr ? 'bpm' : '미설정'} tone="hot" />
        </View>

        {/* Start button — switches color/label by mode */}
        <Pressable
          onPress={() => {
            if (isLthr) {
              navigation.navigate('LTHRTest');
              return;
            }
            // 거리 모드면 목표 페이스(초/km)를 라이브 화면으로 전달, 자유 모드면 없음
            navigation.navigate(
              'DashboardA',
              mode === 'dist' && pace ? { targetPaceSpk: Math.round(pace) } : undefined,
            );
          }}
        >
          <LinearGradient
            colors={isLthr ? ['#f59e0b', '#ef4444'] : gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 16,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isLthr ? (
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M12 21s-7-4.5-9.5-9.2C0.8 8.5 2.7 4.5 6.5 4.5c2 0 3.7 1 5.5 3 1.8-2 3.5-3 5.5-3 3.8 0 5.7 4 4 7.3C19 16.5 12 21 12 21z"
                  fill="#fff"
                />
              </Svg>
            ) : (
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Polygon points="7,5 19,12 7,19" fill="#fff" />
              </Svg>
            )}
            <Text className="text-white text-base font-bold">
              {isLthr ? 'LTHR 테스트 시작' : isFree ? '자유 러닝 시작' : '러닝 시작'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text
          className="text-[10px] text-center mt-2 font-medium"
          style={{ color: isLthr ? 'rgba(251,191,36,0.65)' : 'rgba(167,139,250,0.55)' }}
        >
          {isLthr
            ? '안정 심박 10초 측정 → 워밍업 10분 → 30분 테스트'
            : isFree
              ? '목표 없이 자유롭게 — 3초 후 GPS 잠금 → 자동 시작'
              : '3초 후 GPS 신호 잠금 → 자동 시작'}
        </Text>
      </ScrollView>
    </DarkShell>
  );
};

const StepBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="w-11 h-11 rounded-[14px] items-center justify-center"
    style={{
      backgroundColor: 'rgba(167,139,250,0.14)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.32)',
    }}
  >
    <Text className="text-[22px] font-bold" style={{ color: '#ddd6fe' }}>{label}</Text>
  </Pressable>
);

const BumpBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className="w-[26px] h-[26px] rounded-lg items-center justify-center"
    style={{
      backgroundColor: 'rgba(167,139,250,0.18)',
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.3)',
    }}
  >
    <Text className="text-[14px] font-bold" style={{ color: '#ddd6fe' }}>{label}</Text>
  </Pressable>
);

const MiniInfo = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'ok' | 'hot' }) => {
  const c = tone === 'hot' ? '#fbbf24' : '#6ee7b7';
  return (
    <View
      className="flex-1 rounded-[14px] px-3 py-[10px]"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 0.5,
        borderColor: 'rgba(167,139,250,0.14)',
      }}
    >
      <Text className="text-[9px] font-bold tracking-[0.54px] uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1 mt-[5px]">
        <Text className="text-[20px] font-bold tracking-[-0.6px] leading-6" style={{ color: c }}>{value}</Text>
        <Text className="text-[10px] font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>{sub}</Text>
      </View>
    </View>
  );
};

/** 측정 일시(ISO) → 'YYYY.MM.DD' */
const fmtRecordDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const LTHRTestIntro = ({ latest, guest }: { latest: LthrRecordResponseDto | null | undefined; guest: boolean }) => (
  <View className="mb-3">
    {/* HERO */}
    <View className="rounded-[18px] overflow-hidden mb-[10px]">
      <LinearGradient
        colors={['rgba(245,158,11,0.28)', 'rgba(239,68,68,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 16,
          borderWidth: 0.5,
          borderColor: 'rgba(251,191,36,0.4)',
          borderRadius: 18,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <View
          className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full"
          style={{ backgroundColor: 'rgba(251,191,36,0.28)' }}
          pointerEvents="none"
        />

        <View className="flex-row items-center gap-2">
          <LinearGradient
            colors={['#f59e0b', '#ef4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Path
                d="M12 21s-7-4.5-9.5-9.2C0.8 8.5 2.7 4.5 6.5 4.5c2 0 3.7 1 5.5 3 1.8-2 3.5-3 5.5-3 3.8 0 5.7 4 4 7.3C19 16.5 12 21 12 21z"
                fill="#fff"
              />
            </Svg>
          </LinearGradient>
          <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#fde68a' }}>
            젖산역치 심박수 측정
          </Text>
        </View>

        <Text className="text-[22px] font-bold text-white mt-[10px] tracking-[-0.66px] leading-[26px]">
          30분 전력 질주{'\n'}테스트
        </Text>
        <Text className="text-[12px] mt-2 leading-[18px] font-medium" style={{ color: 'rgba(254,215,170,0.88)' }}>
          후반 20분의 평균 심박수를 자동 분석해 새로운 LTHR과 5개 심박 존을 다시 계산해드려요.
        </Text>

        <View className="flex-row gap-[6px] mt-[14px]">
          {[
            { n: '1', t: '10분', s: '워밍업' },
            { n: '2', t: '30분', s: '전력 질주' },
            { n: '3', t: '20분', s: '자동 분석' },
          ].map((step) => (
            <View
              key={step.n}
              className="flex-1 rounded-[12px] py-2 items-center"
              style={{
                backgroundColor: 'rgba(0,0,0,0.22)',
                borderWidth: 0.5,
                borderColor: 'rgba(251,191,36,0.28)',
              }}
            >
              <Text className="text-[9px] font-bold tracking-[0.72px]" style={{ color: '#fbbf24' }}>
                STEP {step.n}
              </Text>
              <Text className="text-[15px] font-bold text-white tracking-[-0.3px] mt-[2px]">{step.t}</Text>
              <Text className="text-[10px] font-semibold mt-[1px]" style={{ color: 'rgba(254,215,170,0.75)' }}>
                {step.s}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>

    {/* Last measurement */}
    <View
      className="rounded-[14px] px-[14px] py-[11px] mb-[10px] flex-row items-center gap-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 0.5,
        borderColor: 'rgba(167,139,250,0.14)',
      }}
    >
      <View
        className="w-[38px] h-[38px] rounded-[11px] items-center justify-center"
        style={{
          backgroundColor: 'rgba(251,191,36,0.14)',
          borderWidth: 0.5,
          borderColor: 'rgba(251,191,36,0.3)',
        }}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={9} stroke="#fbbf24" strokeWidth={2} />
          <Path d="M12 7v5l3 2" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-bold tracking-[0.6px] uppercase" style={{ color: 'rgba(167,139,250,0.7)' }}>
          지난 측정
        </Text>
        {latest ? (
          <View className="flex-row items-baseline gap-[6px] mt-[3px]">
            <Text className="text-[18px] font-bold text-white tracking-[-0.36px]">{latest.lthr}</Text>
            <Text className="text-[11px] font-semibold" style={{ color: 'rgba(221,214,254,0.55)' }}>bpm</Text>
            <Text className="text-[10px] font-medium ml-1" style={{ color: 'rgba(221,214,254,0.45)' }}>
              · {fmtRecordDate(latest.measuredAt)}
            </Text>
          </View>
        ) : (
          <Text className="text-[12px] font-semibold mt-[3px]" style={{ color: 'rgba(221,214,254,0.6)' }}>
            {guest
              ? '로그인하면 기록을 볼 수 있어요'
              : latest === null
                ? '아직 측정 기록이 없어요'
                : '기록을 불러오는 중…'}
          </Text>
        )}
      </View>
      {latest && (
        <View
          className="px-[9px] py-1 rounded-full"
          style={{
            backgroundColor: latest.recommendRetest ? 'rgba(251,191,36,0.18)' : 'rgba(110,231,183,0.14)',
            borderWidth: 0.5,
            borderColor: latest.recommendRetest ? 'rgba(251,191,36,0.35)' : 'rgba(110,231,183,0.3)',
          }}
        >
          <Text
            className="text-[10px] font-bold"
            style={{ color: latest.recommendRetest ? '#fde68a' : '#6ee7b7' }}
          >
            {latest.daysSinceMeasured === 0 ? '오늘' : `${latest.daysSinceMeasured}일 전`}
            {latest.recommendRetest ? ' · 재측정 권장' : ''}
          </Text>
        </View>
      )}
    </View>
  </View>
);

const FreeRunIntro = () => (
  <LinearGradient
    colors={['rgba(124,58,237,0.34)', 'rgba(59,130,246,0.22)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 0.5,
      borderColor: 'rgba(167,139,250,0.4)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <View
      className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full"
      style={{ backgroundColor: 'rgba(124,58,237,0.3)' }}
      pointerEvents="none"
    />

    <View className="flex-row items-center gap-2">
      <LinearGradient
        colors={gradients.action}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Polygon points="7,5 19,12 7,19" fill="#fff" />
        </Svg>
      </LinearGradient>
      <Text className="text-[10px] font-bold tracking-[0.8px] uppercase" style={{ color: '#ddd6fe' }}>
        목표 없는 자유 러닝
      </Text>
    </View>

    <Text className="text-[22px] font-bold text-white mt-[10px] tracking-[-0.66px] leading-[26px]">
      거리·시간 목표 없이{'\n'}자유롭게 달려요
    </Text>
    <Text className="text-[12px] mt-2 leading-[18px] font-medium" style={{ color: 'rgba(221,214,254,0.82)' }}>
      목표를 정하지 않고 시작합니다. 거리·시간·페이스는 0부터 실시간으로 기록되고, 종료하면 자동으로 리포트와 AI 코칭이 만들어져요.
    </Text>

    <View className="flex-row gap-[6px] mt-[14px]">
      {[
        { t: '실시간 기록', s: '거리·시간·페이스' },
        { t: '폼 분석', s: '발 압력·케이던스' },
        { t: 'AI 코칭', s: '종료 후 자동' },
      ].map((f) => (
        <View
          key={f.t}
          className="flex-1 rounded-[12px] py-2 px-1 items-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.18)',
            borderWidth: 0.5,
            borderColor: 'rgba(167,139,250,0.24)',
          }}
        >
          <Text className="text-[12px] font-bold text-white tracking-[-0.2px]">{f.t}</Text>
          <Text className="text-[9px] font-semibold mt-[2px] text-center" style={{ color: 'rgba(221,214,254,0.65)' }}>
            {f.s}
          </Text>
        </View>
      ))}
    </View>
  </LinearGradient>
);

const PaceGauge = ({ pace }: { pace: number | null }) => {
  const v = !pace ? 0.5 : Math.max(0, Math.min(1, (420 - pace) / 240));
  const angle = v * 180;
  return (
    <Svg width={90} height={56} viewBox="0 0 90 56">
      <Defs>
        <SvgGradient id="rs-gauge-g" x1="0" x2="1">
          <Stop offset="0%" stopColor="#6ee7b7" />
          <Stop offset="50%" stopColor="#a78bfa" />
          <Stop offset="100%" stopColor="#f87171" />
        </SvgGradient>
      </Defs>
      <Path d="M8 48 A37 37 0 0 1 82 48" fill="none" stroke="rgba(167,139,250,0.18)" strokeWidth={6} strokeLinecap="round" />
      <Path
        d="M8 48 A37 37 0 0 1 82 48"
        fill="none"
        stroke="url(#rs-gauge-g)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={`${v * 116} 999`}
      />
      <G transform={`rotate(${angle - 90} 45 48)`}>
        <Line x1={45} y1={48} x2={45} y2={20} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <Circle cx={45} cy={48} r={3.5} fill="#fff" />
      </G>
    </Svg>
  );
};

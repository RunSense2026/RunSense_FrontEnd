import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { isAxiosError } from 'axios';
import Svg, { Path, Circle } from 'react-native-svg';
import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
import type { ReactNode } from 'react';

import { LightShell, ProfileAvatar } from '@/components/domain';
import { updateMyProfile } from '@/api';
import { gradients } from '@/theme/tokens';
import { useProfileStore } from '@/stores/profileStore';
import {
  GENDER_OPTIONS,
  fieldToNumber,
  isValidBirthDate,
  maskBirthDate,
} from '@/utils/profile';

import type { Gender, UserUpdateRequestDto } from '@/types/api';
import type { ScreenProps } from '@/types/navigation';

export const EditProfileScreen = ({ navigation }: ScreenProps<'EditProfile'>) => {
  const {
    name: savedName,
    email,
    birthDate: savedBirthDate,
    gender: savedGender,
    height: savedHeight,
    weight: savedWeight,
    restingHr: savedRestingHr,
    lthr: savedLthr,
    avatarUri: savedAvatar,
    setProfile,
    applyServerProfile,
  } = useProfileStore();
  const [name, setName] = useState(savedName);
  const [birthDate, setBirthDate] = useState(savedBirthDate);
  const [gender, setGender] = useState<Gender | ''>(savedGender);
  const [height, setHeight] = useState(savedHeight);
  const [weight, setWeight] = useState(savedWeight);
  const [avatarUri, setAvatarUri] = useState(savedAvatar);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPickResult = (result: ImagePickerResponse) => {
    if (result.didCancel || result.errorCode) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setAvatarUri(uri);
  };

  // Close the sheet first, then launch so the picker doesn't fight the dismiss animation (iOS).
  const choosePhoto = (mode: 'camera' | 'library') => {
    setPickerOpen(false);
    setTimeout(async () => {
      const result =
        mode === 'camera'
          ? await launchCamera({ mediaType: 'photo', quality: 0.8, cameraType: 'front', saveToPhotos: false })
          : await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
      applyPickResult(result);
    }, 250);
  };

  const handleSave = async () => {
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedBirthDate = birthDate.trim();
    const heightValue = fieldToNumber(height);
    const weightValue = fieldToNumber(weight);

    // 서버 제약(이름 2~5자, 생년월일 date, 키·체중 양수)을 보내기 전에 확인한다.
    if (trimmedName.length < 2 || trimmedName.length > 5) {
      setError('이름은 2~5자로 입력해주세요.');
      return;
    }
    if (trimmedBirthDate && !isValidBirthDate(trimmedBirthDate)) {
      setError('생년월일을 YYYY-MM-DD 형식으로 정확히 입력해주세요.');
      return;
    }
    if (heightValue === null) {
      setError('키는 0보다 큰 숫자로 입력해주세요.');
      return;
    }
    if (weightValue === null) {
      setError('체중은 0보다 큰 숫자로 입력해주세요.');
      return;
    }

    setError(null);
    setSaving(true);

    // 사진은 서버에 저장 필드가 없어 기기에만 남긴다.
    setProfile({ avatarUri });

    // 비워 둔 값은 보내지 않는다 — 서버가 null 필드를 '수정 안 함'으로 처리하므로 지울 수는 없다.
    const patch: UserUpdateRequestDto = { userName: trimmedName };
    if (trimmedBirthDate) patch.birthDate = trimmedBirthDate;
    if (gender) patch.gender = gender;
    if (heightValue !== undefined) patch.height = heightValue;
    if (weightValue !== undefined) patch.weight = weightValue;

    try {
      const updated = await updateMyProfile(patch);
      applyServerProfile(updated);
      navigation.goBack();
    } catch (e) {
      setError(
        (isAxiosError(e) ? e.response?.data?.message : null) ??
          '프로필 저장에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <LightShell>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center gap-2 pt-1 pb-4">
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="w-8 h-8 items-center justify-center -ml-1">
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke="#1e1b4b" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <Text className="text-[20px] font-bold tracking-[-0.4px]" style={{ color: '#1e1b4b' }}>프로필 수정</Text>
        </View>

        {/* Avatar */}
        <View className="items-center mb-5">
          <Pressable onPress={() => setPickerOpen(true)}>
            <ProfileAvatar name={name} uri={avatarUri} size={84} />
            <View
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center"
              style={{ backgroundColor: '#7c3aed', borderWidth: 2, borderColor: '#f1ecff' }}
            >
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx={12} cy={13} r={3.5} stroke="#fff" strokeWidth={2} />
              </Svg>
            </View>
          </Pressable>
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={6}>
            <Text className="text-[12px] font-semibold mt-2" style={{ color: '#7c3aed' }}>사진 변경</Text>
          </Pressable>
        </View>

        {/* 기본 정보 */}
        <SectionLabel>기본 정보</SectionLabel>
        <Card>
          <EditRow label="이름" value={name} onChangeText={setName} placeholder="이름 (2~5자)" maxLength={5} />
          <Divider />
          {/* 이메일은 로그인 계정 식별자 — 서버에 수정 API 가 없어 읽기 전용으로 보여준다. */}
          <ReadOnlyRow label="이메일" value={email || '--'} note="로그인 계정" />
        </Card>

        {/* 신체 정보 */}
        <SectionLabel>신체 정보</SectionLabel>
        <Card>
          <EditRow
            label="생년월일"
            value={birthDate}
            onChangeText={(t) => setBirthDate(maskBirthDate(t))}
            keyboardType="number-pad"
            placeholder="YYYY-MM-DD"
            maxLength={10}
          />
          <Divider />
          <GenderRow value={gender} onChange={setGender} />
          <Divider />
          <EditRow label="키" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="--" unit="cm" />
          <Divider />
          <EditRow label="체중" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="--" unit="kg" />
        </Card>

        {/* 심박 정보 — LTHR 테스트 결과로만 갱신되어 여기서는 보기만 한다. */}
        <SectionLabel>심박 정보</SectionLabel>
        <Card>
          <ReadOnlyRow
            label="안정시 심박수"
            value={savedRestingHr ? `${savedRestingHr} bpm` : '--'}
            note="LTHR 테스트로 측정"
          />
          <Divider />
          <ReadOnlyRow label="LTHR" value={savedLthr ? `${savedLthr} bpm` : '--'} note="LTHR 테스트로 측정" />
        </Card>

        {/* Actions */}
        {error && (
          <Text className="text-[12px] font-semibold text-center mt-1" style={{ color: '#dc2626' }}>
            {error}
          </Text>
        )}
        <Pressable onPress={handleSave} disabled={saving} className="mt-5">
          <LinearGradient
            colors={gradients.action}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 15,
              borderRadius: 16,
              alignItems: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white text-[15px] font-bold">저장하기</Text>
            )}
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()} className="mt-3 items-center py-2">
          <Text className="text-[13px] font-semibold" style={{ color: '#6b5ca5' }}>취소</Text>
        </Pressable>
      </ScrollView>

      <PhotoSourceSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onCamera={() => choosePhoto('camera')}
        onLibrary={() => choosePhoto('library')}
      />
    </LightShell>
  );
};

interface PhotoSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onLibrary: () => void;
}

// App-styled bottom sheet for choosing a photo source (replaces the OS Alert).
const PhotoSourceSheet = ({ visible, onClose, onCamera, onLibrary }: PhotoSourceSheetProps) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(30,27,75,0.4)' }} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <LinearGradient
            colors={['#ffffff', '#f3ecff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 28,
            }}
          >
            <View className="self-center w-10 h-1 rounded-full mb-4" style={{ backgroundColor: 'rgba(124,58,237,0.25)' }} />

            <Text className="text-[17px] font-bold tracking-[-0.34px]" style={{ color: '#1e1b4b' }}>
              프로필 사진
            </Text>
            <Text className="text-[12px] font-medium mt-1 mb-[14px]" style={{ color: '#6b5ca5' }}>
              사진을 어떻게 변경할까요?
            </Text>

            <PhotoOption label="카메라로 촬영" desc="지금 바로 셀카 찍기" onPress={onCamera}>
              <Path
                d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                stroke="#7c3aed"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle cx={12} cy={13} r={3.5} stroke="#7c3aed" strokeWidth={2} />
            </PhotoOption>

            <View className="h-[10px]" />

            <PhotoOption label="갤러리에서 선택" desc="앨범에서 사진 고르기" onPress={onLibrary}>
              <Path
                d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                stroke="#7c3aed"
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <Circle cx={8.5} cy={8.5} r={1.6} fill="#7c3aed" />
              <Path d="M21 15l-5-5L5 21" stroke="#7c3aed" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </PhotoOption>

            <Pressable
              onPress={onClose}
              className="mt-4 rounded-[14px] items-center justify-center"
              style={{ height: 50, backgroundColor: 'rgba(124,58,237,0.06)', borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.16)' }}
            >
              <Text className="text-[14px] font-bold" style={{ color: '#6b5ca5' }}>취소</Text>
            </Pressable>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const PhotoOption = ({
  label,
  desc,
  onPress,
  children,
}: {
  label: string;
  desc: string;
  onPress: () => void;
  children: ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center gap-3 px-3 py-[13px] rounded-[16px]"
    style={{ backgroundColor: '#ffffff', borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.16)' }}
  >
    <View
      className="w-10 h-10 rounded-full items-center justify-center"
      style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        {children}
      </Svg>
    </View>
    <View className="flex-1">
      <Text className="text-[14px] font-bold tracking-[-0.28px]" style={{ color: '#1e1b4b' }}>{label}</Text>
      <Text className="text-[11px] font-medium mt-[1px]" style={{ color: '#9b8cc5' }}>{desc}</Text>
    </View>
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke="#c4b5fd" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </Pressable>
);

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <Text className="text-[11px] font-bold tracking-[0.88px] uppercase mb-2 pl-1" style={{ color: '#7c6bb5' }}>
    {children}
  </Text>
);

const Card = ({ children }: { children: ReactNode }) => (
  <View
    className="rounded-[14px] overflow-hidden mb-4"
    style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 0.5, borderColor: 'rgba(124,58,237,0.12)' }}
  >
    {children}
  </View>
);

const Divider = () => <View className="h-px mx-[14px]" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }} />;

// 수정할 수 없는 값(이메일 등)을 같은 줄 모양으로 보여준다.
const ReadOnlyRow = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <View className="flex-row items-center gap-3 px-[14px] py-[12px]">
    <Text className="text-[13px] font-medium" style={{ color: '#7c6bb5' }}>{label}</Text>
    <Text className="flex-1 text-[14px] font-bold text-right" style={{ color: '#9b8cc5' }} numberOfLines={1}>
      {value}
    </Text>
    {note && <Text className="text-[11px] font-medium" style={{ color: '#c4b5fd' }}>{note}</Text>}
  </View>
);

// 성별 — 서버가 M/F/ETC 코드만 받으므로 자유 입력 대신 선택형으로 둔다.
const GenderRow = ({ value, onChange }: { value: Gender | ''; onChange: (g: Gender) => void }) => (
  <View className="flex-row items-center gap-3 px-[14px] py-[10px]">
    <Text className="text-[13px] font-medium" style={{ color: '#7c6bb5' }}>성별</Text>
    <View className="flex-1 flex-row justify-end gap-[6px]">
      {GENDER_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="px-[14px] py-[7px] rounded-[10px]"
            style={{
              backgroundColor: selected ? 'rgba(124,58,237,0.12)' : 'transparent',
              borderWidth: 0.5,
              borderColor: selected ? '#7c3aed' : 'rgba(124,58,237,0.2)',
            }}
          >
            <Text
              className="text-[13px] font-bold"
              style={{ color: selected ? '#7c3aed' : '#9b8cc5' }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

interface EditRowProps
  extends Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'placeholder' | 'maxLength'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
}

const EditRow = ({ label, value, onChangeText, unit, ...inputProps }: EditRowProps) => (
  <View className="flex-row items-center gap-3 px-[14px] py-[12px]">
    <Text className="text-[13px] font-medium" style={{ color: '#7c6bb5' }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#9b8cc5"
      className="flex-1 text-[14px] font-bold text-right p-0"
      style={{ color: '#1e1b4b' }}
      {...inputProps}
    />
    {unit && <Text className="text-[11px] font-medium" style={{ color: '#9b8cc5' }}>{unit}</Text>}
  </View>
);

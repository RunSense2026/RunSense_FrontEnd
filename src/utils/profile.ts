// 프로필(마이페이지) 값 변환 헬퍼.
// 서버는 생년월일(birthDate)·성별 코드(gender)·키/체중(숫자)을 저장하고,
// 화면은 나이(세)·성별 라벨·문자열 입력값을 쓰기 때문에 그 사이를 변환한다.

import type { Gender } from '@/types/api';

const GENDER_LABELS: Record<Gender, string> = {
  M: '남성',
  F: '여성',
  ETC: '기타',
};

/** 성별 선택 UI 용 (코드, 라벨) 목록 */
export const GENDER_OPTIONS: { value: Gender; label: string }[] = (
  ['M', 'F', 'ETC'] as Gender[]
).map((value) => ({ value, label: GENDER_LABELS[value] }));

/** 성별 코드 → 한글 라벨. 미설정이면 null. */
export const genderLabel = (gender: Gender | ''): string | null =>
  gender ? GENDER_LABELS[gender] : null;

/** 'YYYY-MM-DD' 형식이고 실제로 존재하는 날짜인지 (미래 날짜는 제외) */
export const isValidBirthDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // Date 는 2월 30일 같은 값을 넘겨도 다음 달로 굴러가므로 되돌려 비교한다.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return false;
  return date.getTime() <= Date.now() && y >= 1900;
};

/** 생년월일 → 만 나이. 값이 없거나 형식이 틀리면 null. */
export const ageFromBirthDate = (birthDate: string): number | null => {
  if (!isValidBirthDate(birthDate)) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  // 올해 생일이 아직 안 지났으면 한 살 뺀다.
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age >= 0 ? age : null;
};

/** 생년월일 입력 마스크 — 숫자만 남기고 'YYYY-MM-DD' 로 하이픈을 채워 넣는다. */
export const maskBirthDate = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

/** 서버 숫자값(키·체중) → 입력창 문자열. null 이면 빈 문자열, 소수점은 1자리까지. */
export const numberToField = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '';
  return String(Math.round(value * 10) / 10);
};

/** 입력창 문자열 → 서버 숫자값. 비어 있으면 undefined(= 수정 안 함), 숫자가 아니면 null. */
export const fieldToNumber = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
};

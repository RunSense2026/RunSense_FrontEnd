import { apiClient } from './client';
import type {
  ApiResponse,
  EmailDuplicateCheckResponseDto,
  TokenLogoutRequestDto,
  TokenReissueRequestDto,
  UserLoginRequestDto,
  UserLoginResponseDto,
  UserResponseDto,
  UserSignUpRequestDto,
  UserSignUpResponseDto,
  UserTokenResponseDto,
  UserUpdateRequestDto,
} from '@/types/api';

/** 회원가입 — POST /api/users/signup */
export const signUp = async (
  body: UserSignUpRequestDto,
): Promise<UserSignUpResponseDto> => {
  const res = await apiClient.post<ApiResponse<UserSignUpResponseDto>>(
    '/api/users/signup',
    body,
  );
  return res.data.data;
};

/** 로그인 — POST /api/users/login */
export const login = async (
  body: UserLoginRequestDto,
): Promise<UserLoginResponseDto> => {
  const res = await apiClient.post<ApiResponse<UserLoginResponseDto>>(
    '/api/users/login',
    body,
  );
  return res.data.data;
};

/** 이메일 중복 체크 — GET /api/users/email-duplicate */
export const checkEmailDuplicate = async (email: string): Promise<boolean> => {
  const res = await apiClient.get<ApiResponse<EmailDuplicateCheckResponseDto>>(
    '/api/users/email-duplicate',
    { params: { email } },
  );
  return res.data.data.isDuplicated;
};

/** 토큰 재발급 — POST /api/users/reissue */
export const reissue = async (
  body: TokenReissueRequestDto,
): Promise<UserTokenResponseDto> => {
  const res = await apiClient.post<ApiResponse<UserTokenResponseDto>>(
    '/api/users/reissue',
    body,
  );
  return res.data.data;
};

/**
 * 내 프로필 수정 — PATCH /api/users
 * 보내지 않은 필드는 서버가 그대로 두고, 응답으로 수정 후 전체 프로필을 돌려준다.
 */
export const updateMyProfile = async (
  body: UserUpdateRequestDto,
): Promise<UserResponseDto> => {
  const res = await apiClient.patch<ApiResponse<UserResponseDto>>('/api/users', body);
  return res.data.data;
};

/**
 * 내 프로필 조회.
 * 백엔드에 조회 전용 엔드포인트가 없어, 수정 API 에 빈 본문(= 아무 필드도 수정하지 않음)을 보내
 * 응답으로 오는 현재 프로필을 읽는다. GET /api/users 가 생기면 이 함수만 바꾸면 된다.
 */
export const readMyProfile = (): Promise<UserResponseDto> => updateMyProfile({});

/** 로그아웃 — POST /api/users/logout */
export const logout = async (body: TokenLogoutRequestDto): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>('/api/users/logout', body);
};

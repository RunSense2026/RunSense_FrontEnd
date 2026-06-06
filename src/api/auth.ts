import { apiClient } from './client';
import type {
  ApiResponse,
  EmailDuplicateCheckResponseDto,
  TokenLogoutRequestDto,
  TokenReissueRequestDto,
  UserLoginRequestDto,
  UserLoginResponseDto,
  UserSignUpRequestDto,
  UserSignUpResponseDto,
  UserTokenResponseDto,
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

/** 로그아웃 — POST /api/users/logout */
export const logout = async (body: TokenLogoutRequestDto): Promise<void> => {
  await apiClient.post<ApiResponse<unknown>>('/api/users/logout', body);
};

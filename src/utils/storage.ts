// 토큰 저장소.
// 실제 환경에서는 @react-native-async-storage/async-storage 또는 react-native-keychain 으로
// 영구 저장하는 것을 권장. 여기서는 앱 실행 중 메모리에만 보관한다.

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export const accessToken = {
  get: (): string | null => _accessToken,
  set: (token: string): void => {
    _accessToken = token;
  },
  clear: (): void => {
    _accessToken = null;
  },
};

export const refreshToken = {
  get: (): string | null => _refreshToken,
  set: (token: string): void => {
    _refreshToken = token;
  },
  clear: (): void => {
    _refreshToken = null;
  },
};

/** 로그인 성공 시 두 토큰을 한 번에 저장 */
export const setTokens = (access: string, refresh: string): void => {
  _accessToken = access;
  _refreshToken = refresh;
};

/** 로그아웃 시 모든 토큰 제거 */
export const clearTokens = (): void => {
  _accessToken = null;
  _refreshToken = null;
};

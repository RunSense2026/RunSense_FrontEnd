// 실제 환경에서는 @react-native-async-storage/async-storage 또는 react-native-keychain 사용 권장
// 여기서는 인터페이스만 제공

let _accessToken: string | null = null;

export const accessToken = {
  get: (): string | null => _accessToken,
  set: (token: string): void => {
    _accessToken = token;
  },
  clear: (): void => {
    _accessToken = null;
  },
};

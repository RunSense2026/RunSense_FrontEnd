import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// 위치 권한 요청 (Android). iOS 는 Info.plist + requestAuthorization 흐름이라 여기선 true 반환.
export const ensureLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

// 현재 위치 1회 조회 (Promise 래퍼).
// 옵션을 받아 고정밀/저정밀 재시도에 재사용한다.
const getPositionOnce = (
  options: Parameters<typeof Geolocation.getCurrentPosition>[2],
): Promise<{ lat: number; lon: number }> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      options,
    );
  });

// 현재 위치 1회 조회. 기본은 저정밀(네트워크/Wi-Fi/셀)로 빠르게 잡는다 —
// 날씨 격자·대기질 측정소(구 단위)에는 충분하고, 실내·콜드스타트에서도 즉시 응답한다.
// 미터 단위 정밀도가 필요한 곳은 highAccuracy=true 로 호출한다(라이브 러닝은 watchPosition 별도 사용).
export const getCurrentPosition = (highAccuracy = false): Promise<{ lat: number; lon: number }> =>
  highAccuracy
    ? getPositionOnce({ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })
    : getPositionOnce({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });

// 위경도 두 점 사이의 거리(미터) — 하버사인 공식.
const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

// WGS84(위경도) → 한국 TM 중부원점(EPSG:5181, GRS80) 평면좌표 변환.
// 에어코리아 근접측정소(getNearbyMsrstnList)가 받는 tmX/tmY 좌표계와 동일하다.
// Transverse Mercator 정변환 — Snyder, "Map Projections: A Working Manual" 식.

const A = 6378137.0; // GRS80 장반경(m)
const F = 1 / 298.257222101; // GRS80 편평률
const K0 = 1.0; // 축척계수
const LAT0 = 38.0; // 원점 위도(도)
const LON0 = 127.0; // 원점 경도(도)
const X0 = 200000.0; // false easting(m)
const Y0 = 500000.0; // false northing(m)

const D2R = Math.PI / 180;

export interface TMCoord {
  tmX: number;
  tmY: number;
}

// 자오선호장 M(φ) — Snyder 식(3-21).
const meridianArc = (phi: number, e2: number): number => {
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  return (
    A *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi))
  );
};

export const wgs84ToTM = (lat: number, lon: number): TMCoord => {
  const e2 = 2 * F - F * F; // 제1이심률 제곱
  const ep2 = e2 / (1 - e2); // 제2이심률 제곱

  const phi = lat * D2R;
  const lam = lon * D2R;
  const phi0 = LAT0 * D2R;
  const lam0 = LON0 * D2R;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = A / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = ep2 * cosPhi * cosPhi;
  const a1 = (lam - lam0) * cosPhi;

  const M = meridianArc(phi, e2);
  const M0 = meridianArc(phi0, e2);

  const tmX =
    X0 +
    K0 *
      N *
      (a1 +
        ((1 - T + C) * a1 ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * a1 ** 5) / 120);

  const tmY =
    Y0 +
    K0 *
      (M -
        M0 +
        N *
          tanPhi *
          ((a1 * a1) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * a1 ** 4) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * a1 ** 6) / 720));

  return { tmX, tmY };
};

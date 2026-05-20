# RN Boilerplate

React Native CLI + TypeScript + NativeWind + Zustand 보일러플레이트.

## 스택

- React Native 0.74 (CLI)
- TypeScript
- NativeWind v4 (Tailwind CSS)
- Zustand (전역 상태)
- React Navigation (Native Stack)
- Axios (HTTP)
- react-native-config (.env)

## 시작하기

### 1. 의존성 설치

```bash
yarn install
# 또는
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 환경에 맞게 수정.

### 3. Android 실행

```bash
yarn start         # Metro
yarn android       # 다른 터미널에서
```

## 폴더 구조

```
src/
├── api/              # axios client, API 함수
├── assets/           # 이미지, 폰트
├── components/
│   ├── common/       # Button 등 범용
│   └── domain/       # 도메인 컴포넌트
├── hooks/            # 커스텀 훅
├── navigation/       # RootNavigator
├── screens/          # 화면 컴포넌트
├── stores/           # Zustand store
├── types/            # 공용 타입
├── utils/            # cn, storage 등
└── constants/        # env 헬퍼, 상수
```

## 주요 컨벤션

자세한 내용은 [`CODE_CONVENTION.md`](./CODE_CONVENTION.md) 참고.

- URL은 `buildAuthUrl()` / `buildApiUrl()` + `getEnvConfig()` 사용 (`Config.API_BASE_URL` 직접 사용 금지)
- 토큰 핸들러는 `accessToken` 함수명 유지
- Path alias `@/*` → `./src/*`
- Tailwind 클래스 병합은 `cn()` 유틸 사용

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `yarn start` | Metro 번들러 실행 |
| `yarn android` | Android 빌드 & 실행 |
| `yarn lint` | ESLint 검사 |
| `yarn format` | Prettier 포맷팅 |

## 추가 셋업 필요 항목

> 아래는 RN CLI 프로젝트 생성 후 별도로 진행해야 합니다.

1. **react-native-config 네이티브 셋업**
   - `android/app/build.gradle` 상단에 `apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"` 추가

2. **react-native-screens 셋업**
   - `MainActivity.kt`에서 `onCreate`에 `super.onCreate(null)` 적용 (RN 0.74 기준 자동 처리됨)

3. **앱 이름/패키지명**
   - `app.json`, `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle` 수정

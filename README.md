# React Native + Tailwind CSS 코드 컨벤션

> 팀 협업을 위한 공통 코딩 규칙. 신규 코드 작성 및 PR 리뷰 시 본 문서를 기준으로 합니다.

---

## 1. 폴더 구조

```
src/
├── api/              # API 호출 함수
├── assets/           # 이미지, 폰트, 아이콘
├── components/       # 재사용 컴포넌트
│   ├── common/       # Button, Input 등 범용
│   └── domain/       # 도메인별 컴포넌트
├── hooks/            # 커스텀 훅
├── navigation/       # 네비게이션 설정
├── screens/          # 화면 컴포넌트
├── stores/           # Zustand store
├── types/            # TypeScript 타입
├── utils/            # 유틸 함수
└── constants/        # 상수
```

---

## 2. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트/파일 | PascalCase | `LoginScreen.tsx`, `UserCard.tsx` |
| 함수/변수 | camelCase | `getUserInfo`, `isLoading` |
| 상수 | UPPER_SNAKE_CASE | `API_TIMEOUT`, `MAX_RETRY` |
| 타입/인터페이스 | PascalCase | `UserProfile`, `ApiResponse` |
| 훅 | use 접두사 | `useAuth`, `useFetch` |
| 불리언 | is/has/can 접두사 | `isOpen`, `hasError` |
| 이벤트 핸들러 | handle 접두사 | `handleSubmit`, `handlePress` |
| 폴더 | kebab-case | `user-profile/` |

---

## 3. 컴포넌트 작성 규칙

```tsx
// ✅ 함수형 컴포넌트 + TypeScript + named export
import { View, Text, Pressable } from 'react-native';

interface UserCardProps {
  name: string;
  age: number;
  onPress?: () => void;
}

export const UserCard = ({ name, age, onPress }: UserCardProps) => {
  return (
    <Pressable onPress={onPress} className="p-4 bg-white rounded-xl">
      <Text className="text-lg font-bold">{name}</Text>
      <Text className="text-sm text-gray-500">{age}세</Text>
    </Pressable>
  );
};
```

- 한 파일 = 한 컴포넌트 원칙
- props는 interface로 정의 (컴포넌트명 + Props)
- default export 지양, named export 사용 (자동완성/리팩토링 유리)

---

## 4. Import 순서

```tsx
// 1. React, React Native
import { useState } from 'react';
import { View, Text } from 'react-native';

// 2. 외부 라이브러리
import { useNavigation } from '@react-navigation/native';

// 3. 절대경로 (내부 모듈)
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/common/Button';

// 4. 상대경로
import { styles } from './styles';

// 5. 타입
import type { User } from '@/types/user';
```

`tsconfig.json`에 path alias 설정 권장 (`@/*` → `./src/*`)

---

## 5. NativeWind (Tailwind) 사용 규칙

```tsx
// ✅ className 순서: 레이아웃 → 박스 → 타이포 → 색상 → 기타
<View className="flex-row items-center px-4 py-2 rounded-lg bg-blue-500">

// ✅ 조건부 스타일은 clsx/twMerge 사용
import { clsx } from 'clsx';
<View className={clsx('p-4', isActive && 'bg-blue-500')}>

// ❌ 인라인 삼항 남발 금지
<View className={`p-4 ${a ? 'bg-red-500' : b ? 'bg-blue-500' : 'bg-gray-500'}`}>
```

- 임의값(`w-[123px]`)은 디자인 토큰으로 안 풀릴 때만 사용
- 반복되는 스타일은 `tailwind.config.js`의 `theme.extend`에 등록

---

## 6. State 관리 (Zustand)

```ts
// stores/authStore.ts
interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

- store는 도메인별로 분리 (authStore, userStore...)
- 컴포넌트에서는 필요한 값만 selector로 구독

```ts
const user = useAuthStore((s) => s.user);
```

---

## 7. 환경변수 (react-native-config)

```ts
// ✅ buildAuthUrl() + getEnvConfig() 컨벤션 사용
const url = buildAuthUrl('/login');

// ❌ Config 직접 사용 금지
const url = `${Config.API_BASE_URL}/login`;
```

- `accessToken` 헬퍼 함수명은 변경 금지

---

## 8. Git 컨벤션

### 브랜치 네이밍
- `feat/login`
- `fix/header-bug`
- `refactor/auth`

### 커밋 메시지

| 타입 | 설명 | 예시 |
|------|------|------|
| feat | 기능 추가 | `feat: 로그인 화면 구현` |
| fix | 버그 수정 | `fix: 헤더 정렬 버그 수정` |
| refactor | 리팩토링 | `refactor: 인증 로직 분리` |
| style | 코드 포맷 | `style: 들여쓰기 정리` |
| docs | 문서 수정 | `docs: README 업데이트` |
| chore | 기타 작업 | `chore: 패키지 업데이트` |

### PR 규칙
- `develop` 브랜치로 PR 생성
- 최소 1명 이상의 리뷰 승인 후 머지
- squash merge 사용

---

## 9. 기타 규칙

- **함수 길이**: 한 함수 50줄 이내 권장
- **매직 넘버 금지**: `constants/`에 상수로 분리
- **any 타입 금지**: 불가피하면 `unknown` 후 타입 가드 사용
- **console.log**: 커밋 전 제거 (ESLint 규칙으로 강제 권장)
- **포맷터**: Prettier + ESLint 설정 통일, `.prettierrc` 팀 공유

---

_작성일: 2026-05-20_

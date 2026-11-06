// 이미지 에셋 import 를 위한 타입 선언 (Metro 가 number(asset id)로 번들)
declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}

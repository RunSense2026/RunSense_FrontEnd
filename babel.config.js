module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    'nativewind/babel',
  ],
  plugins: [
    ['module-resolver', { root: ['./src'], alias: { '@': './src' } }],
    '@babel/plugin-transform-export-namespace-from', // zod v4가 export namespace 구문 사용
    'react-native-reanimated/plugin', // 반드시 마지막
  ],
};
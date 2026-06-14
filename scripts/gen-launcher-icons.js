// 앱 로고(src/assets/runsense-logo.png)로 안드로이드 런처 아이콘을 밀도별 생성한다.
// 사용: node scripts/gen-launcher-icons.js
const Jimp = require('jimp');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src/assets/runsense-logo.png');
const RES = path.join(ROOT, 'android/app/src/main/res');

// 밀도별 표준 런처 아이콘 크기(px)
const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  const base = await Jimp.read(SRC);

  for (const [dpi, size] of Object.entries(SIZES)) {
    const dir = path.join(RES, `mipmap-${dpi}`);

    // 정사각 아이콘
    await base.clone().resize(size, size).writeAsync(path.join(dir, 'ic_launcher.png'));

    // 원형 아이콘 (원 바깥 픽셀 알파 0 처리)
    const round = base.clone().resize(size, size);
    const r = size / 2;
    round.scan(0, 0, size, size, (x, y, idx) => {
      const dx = x - r + 0.5;
      const dy = y - r + 0.5;
      if (dx * dx + dy * dy > r * r) round.bitmap.data[idx + 3] = 0;
    });
    await round.writeAsync(path.join(dir, 'ic_launcher_round.png'));

    console.log(`mipmap-${dpi}: ${size}x${size} ✓`);
  }
  console.log('완료');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

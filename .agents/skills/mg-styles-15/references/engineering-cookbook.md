# 获奖级 MG 视频纯代码工程秘籍 (Deterministic Engineering Cookbook)

本手册提炼自 `mg-styles-15` 全部 15 支获奖级 Demo 的真实源码，涵盖渲染契约、数学缓动与物理公式、各流派核心渲染器写法，以及 `mgaudio` 帧级音画同步技巧。

---

## 一、确定性逐帧渲染契约 (`window.DEMO` & `window.renderAt(t)`)

无头浏览器渲染器 `harness/render.mjs` 要求每个网页满足**纯函数确定性契约（Pure Function of Time `t`）**——绝不依赖真实时钟 `Date.now()`、`requestAnimationFrame` 累积状态或不可控的物理引擎，确保任意时刻调用 `window.renderAt(t)` 都能 100% 精确画出第 `t` 秒的画面（并支持多进程分片并行渲染与子快门运动模糊采样）：

```html
<script>
// 1. 声明画布规格与运动模糊采样数（mb=1 关闭，mb=4 或 8 开启 180° 快门多帧混合运动模糊）
window.DEMO = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 10,
  motionBlur: { samples: 4, shutter: 0.5 }
};
</script>
<script type="module">
// 2. 预加载全部字体与 cues.json，确保无字体闪烁或豆腐块
const cues = await (await fetch('./cues.json')).json();
await document.fonts.ready;

// 3. 定义纯函数渲染入口：给定时间 t（秒），计算并绘制当前帧的全部状态
window.renderAt = async (t) => {
  // 所有位置、缩放、旋转、颜色、粒子坐标均由 t 闭式算出
};

// 4. 一切就绪后置为 true，通知 harness/render.mjs 开始逐帧截图
window.__ready = true;
</script>
```

---

## 二、灵魂数学库：种子随机数、精准三次贝塞尔与闭式阻尼弹簧

### 1. 确定性伪随机数生成器（Mulberry32）与哈希函数
绝不使用 `Math.random()`！所有随机抖动、星空粒子、乱码跳字必须使用固定种子的 `mulberry32` 或整数哈希：

```javascript
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 2. 牛顿迭代法求解任意 `cubic-bezier(x1, y1, x2, y2)`
用于实现 MG 动画最具标志性的缓动曲线：
- **MG 经典弹性过冲（Overshoot Pop）**：`bezier(0.34, 1.56, 0.64, 1)`
- **一笔画转角减速**：`bezier(0.65, 0, 0.35, 1)`
- **液态甩出前快后慢**：`bezier(0.22, 1, 0.36, 1)`
- **形变中段加速**：`bezier(0.7, 0, 0.3, 1)`

```javascript
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return u => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let t = u;
    for (let i = 0; i < 10; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t = Math.max(0, Math.min(1, t - (sx(t) - u) / d));
    }
    return sy(t);
  };
}
```

### 3. 闭式欠阻尼弹簧 + 速度驱动挤压拉伸（Velocity-Driven Squash & Stretch）
提炼自 `01-flat-vector/index.html`：同时算出弹簧位移 `spring(t)` 与瞬时速度 `springV(t)`，用速度驱动运动方向上的拉伸与垂直方向上的挤压，并在 `pin` 秒后平滑锁死到 `1.0`（防止镜头放大时出现亚像素微颤）：

```javascript
function spring(t, f = 2.4, z = 0.42) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-a * t) * (Math.cos(b * t) + (a / b) * Math.sin(b * t));
}
function springV(t, f = 2.4, z = 0.42) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return Math.exp(-a * t) * (w * w / b) * Math.sin(b * t);
}
// 返回 [scale, squashStretchDelta] -> sx = s * (1 - k), sy = s * (1 + k)
function popWithSquash(t, t0, f = 2.4, z = 0.42, amt = 0.12, pin = 0.9) {
  const tt = t - t0;
  let s = spring(tt, f, z);
  let k = Math.max(-0.3, Math.min(0.3, (springV(tt, f, z) / (2 * Math.PI * f)) * amt * 2));
  const u = Math.max(0, Math.min(1, (tt - pin * 0.7) / (pin * 0.3)));
  const w = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  return [s + (1 - s) * w, k * (1 - w)];
}
```

---

## 三、代表性风格的高阶图形实现范式

### 1. 逐帧手绘线条沸腾 (`05-cel-boil`)：3D Simplex Noise 空间沸腾 + 压感多边形笔刷
- **为什么不用普通 `ctx.stroke()`**：原生 Canvas 线条粗细死板。`05-cel-boil/js/engine.js` 将中心线重采样（`resample`）后，计算每一点的切线法向量，叠加笔压曲线（两头尖或中间粗）生成闭合多边形轮廓（Outline Polygon）再 `fill()`。
- **线条沸腾（Line Boil）**：利用 `simplex-noise` 的 `N3(x / scale, y / scale, seed * 2.371)`，把世界坐标点在噪声场中微移 `±2.4px`；因为 `seed = Math.floor(frame / 2)` 每 2 帧（24fps 下的一拍二，即 12fps）跳变一次，线条就会自然「呼吸沸腾」！

### 2. 丝滑无打结形变 (`08-morph`)：等距重采样 + 最优顶点对齐 + Oklab 混色
- **防打结核心（`bestShift`）**：把任意两个 SVG `path` 用 `getPointAtLength` 等距采样为固定 `N=240` 个顺时针顶点 `A` 和 `B`；遍历 `0..N-1` 的循环移位 `s`，找出使 $\sum \|A_i - B_{(i+s)\bmod N}\|^2$ 最小的起始顶点偏移 `bs`，从而彻底杜绝形变中途翻转打结！
- **色彩过渡不发灰**：RGB 直接线性插值在蓝→黄、红→青中途会变成脏灰色。`08-morph` 将 Hex 转为感知均匀的 **Oklab 色彩空间**做插值，色彩全程鲜亮饱满。

### 3. 液态 Metaball 与文字凝聚 (`07-liquid`)：WebGL 2 SDF Smooth-Min + 预计算字母距离场
- **2D SDF 软融合**：在片元着色器中用指数/多项式 Smooth-Min (`smin(d1, d2, k)`) 融合多个运动水滴与胶囊线段；通过有限差分求 SDF 梯度 $\nabla d$ 构造伪 3D 表面法线 $\vec{N}$，叠加高光反射（Specular）、菲涅尔边缘光（Fresnel Rim）与地面倒影。
- **文字从液体中长出**：在初始化时用离屏 Canvas 渲染品牌词（如 `drop`），通过 Euclidean Distance Transform (`js/textsdf.js`) 计算每个字母的带符号距离场（SDF 纹理打包进 RGBA 四个通道），在 6.0s~8.5s 将水滴 SDF 与字母 SDF 平滑混合。

### 4. 回形针超大画布一镜到底 (`19-paperclip`)：`d3.interpolateZoom` 锚点运镜
- 建立 `2400×5900 px` 的巨型画布 `#world`，所有贴纸、拆解零件、元素周期表、柱状图、地图全部按真实比例排布在画布不同区域。
- 摄像机切换使用 `d3.interpolateZoom.rho(0.85..1.25)` 生成双曲测地线缩放平移轨迹（先拉远再推近），配合锚点屏幕空间插值（`camFrom`）与贴纸拍落瞬间的镜头微震（`jolt(t)`），视觉极其连贯高级。

### 5. 竖屏综艺花字 (`18-hanazi`)：五层 SVG 描边挤出组件 `HZ()`
- 单层文字绝不像综艺花字！必须按从底到顶顺序在同一 `<g>` 中绘制 5 层 `<text>`：
  1. **立体厚度挤出层（Extrude ×2）**：向下偏移 `+ext` 与 `+0.5*ext`，填涂深色并加 `stroke-width: 2*(white+outer)`；
  2. **彩色外描边层（Outer Stroke）**：`stroke-width: 2*(white+outer)`，`stroke-linejoin: round`；
  3. **粗白描边层（White Stroke）**：`stroke: #fff`，`stroke-width: 2*white`；
  4. **垂直渐变填充层（Gradient Fill）**：高饱和糖果双色渐变；
  5. **上半部高光层（Gloss）**：`0% -> 46%` 白色半透明线性渐变。

---

## 四、`mgaudio` 殿堂级配乐与帧级同步黄金法则

1. **单一时间真相源（Single Source of Truth: `cues.json`）**
   - 画面代码（`index.html`）与配乐脚本（`audio.py`）必须读取同一个 `cues.json`！切勿在两边硬编码不同的秒数。
2. **理解 `sync` 同步锚点（绝不手动减前摇时间！）**
   - `mgaudio` 的每个音效都自带语义化的 `sync` 锚点：
     - `sfx.impact()` / `sfx.pop()` 的同步点在**瞬态起音（Transient）**；
     - `sfx.whoosh()` 的同步点在**掠过屏幕中心的能量峰值（Pass-by Peak）**；
     - `sfx.riser()` / `sfx.reverse_cymbal()` / `sfx.lock_on()` 的同步点在**蓄力结束的爆炸点（The Hit）**！
   - 因此，直接把视觉事件发生的精确秒数传给 `m.sfx(sound, at=t_event)` 即可，切勿手动写 `at=t_event - riser_dur`！
3. **清脆打击点提前 1 帧法则（1-Frame Lead for Crisp Pops）**
   - 对于短促的 `pop` / `click`，提前 1 帧（`at=T('hit') - 1/30` 或 `sync.place(..., early_frames=1, fps=30)`）放置，能让听觉瞬态峰值正好落在画面定格的那一帧上。
4. **大片级重击前的「60ms 抽吸静音」（Pre-Hit Suck / Music Bus Dip）**
   - 提炼自 `01-flat-vector/audio.py`：在全片最重要的 4~6 个视觉大撞击（如破窗、大转场、Drop 落地、Logo 定格）前 `60~95ms`，将背景音乐总线（`m.group('music')`）瞬间拉低 `-9 dB`，并在撞击帧 `0ms` 处瞬间弹回 `0 dB`！这会让每一次重击产生震撼的剧场级「呼吸抽吸感」：
   ```python
   HITS = [T('glass'), T('slam'), T('burst1'), T('merge'), T('logoLand')]
   pts = [(0.0, 0.0)]
   for h in HITS:
       pts += [(h - 0.095, 0.0), (h - 0.055, -9.0), (h - 0.006, -9.0), (h, 0.0)]
   m.group('music').automate('gain', pts + [(10.0, 0.0)])
   ```
5. **和声对齐的音高类音效（In-Key Tonal SFX）**
   - 使用 `m.form.chord_at(t)` 获取当前小节的和弦音，让 `ding`、`shimmer_hit`、`sparkle`、`blip` 永远落在当前调式和弦内，绝不产生刺耳的不协和音。
6. **强制零告警导出（Zero-Warning Master QC）**
   - 导出时务必生成频谱图并检查 `res['warnings']`：
   ```python
   res = m.export('out/audio.wav', lufs=-14, tp=-1.2, spectrogram='out/audio_spec.png')
   assert not res['warnings'], res['warnings']
   ```

// ans_chars.js: Hand-painted p5.brush character rigs for ANS (AI Never Stops):
//   1. dino(x, y, u, o)    — Ultra-Kawaii Marshmallow-Plush ANS Mascot Little Dino (#9BE0C5 wide rounded baby head,
//                            3 seamless rounded head bumps with no base seam line, soft cream lower-face & belly patches,
//                            big glossy kawaii eyes, rosy cheeks, stubby paws & chubby feet)
//   2. creator(x, y, u, o) — The Indie Creator / "我" (White crew-neck T-shirt 白体恤, dark short hair topped with
//                            a lush cluster of white flowers & green leaves 头上一堆花, and signature double-bridge
//                            hollow glasses 眼镜中间两个横杠、上面还有一个、中间中空)

const DINO_COLS = {
  mint: '#9BE0C5',
  mintDk: '#5BB390',
  mintLt: '#E0FCF2',
  cream: '#FFFDF6',
  creamDk: '#EFE3C6',
  cheek: '#FF8FA3'
};

const CREATOR_COLS = {
  skin: '#FADCC8',
  skinDk: '#E5B59A',
  hair: '#221E29',
  hairLt: '#3B3448',
  tee: '#FCFBF7',
  teeDk: '#DFDBD0',
  pants: '#2B2D3C',
  shoe: '#FFF8EA',
  frames: '#16131D',
  leafDk: '#2E6F40',
  leaf: '#4CAF50',
  leafLt: '#81C784',
  // Vibrant multi-color flower palette so the flower cluster is rich and unmistakably floral!
  pinkPetal: '#FF7096',
  pinkLt: '#FF9EBB',
  yellowPetal: '#FFC72C',
  yellowLt: '#FFE169',
  bluePetal: '#5CB8FF',
  blueLt: '#99D5FF',
  lavPetal: '#C084FC',
  coralCore: '#FF5D3B',
  goldCore: '#FFF056',
  whiteCore: '#FFFDF7'
};

// Deep, unmistakable multi-petal flower silhouette (5 or 6 plump individual rounded petals with deep clefts!)
function distinctFlowerPts(cx, cy, r, petals = 5, rot = 0, squashY = 0.92, j = 0) {
  const pts = [], n = petals * 14;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const a = rot + t;
    // Deep, plump rounded lobes: valley dips to 0.42*r, petal rounds out to 1.0*r
    const c = Math.cos((t * petals) * 0.5);
    const lobe = Math.pow(Math.abs(c), 0.65);
    const rad = r * (0.42 + 0.58 * lobe);
    pts.push([
      cx + Math.cos(a) * rad + jit(j),
      cy + Math.sin(a) * rad * squashY + jit(j)
    ]);
  }
  return pts;
}

// 单点形变（连续、无取整）：① 髋线以下的腿绕髋关节按"大腿角"旋转（权重沿腿长 ease 到 1、裆部中线为 0，
// 所以轮廓仍是一条连续样条，不会出现折角）② 头部绕颈点刚性微倾（下巴线以上整块一起转，眼嘴永远贴合头形）
// ③ 脚底抵消身体起伏（脚踩地不动、腿自然伸缩）。
function dinoDeformPt(px, py, G) {
  let x = px, y = py;
  const wFoot = ease(clamp((py + 2.20) / 2.20));
  y -= G.bobU * wFoot;                                   // ③
  const legW = wFoot * ease(clamp((Math.abs(px) - 0.30) / 1.10));
  if (legW > 1e-4) {                                     // ①
    const side = px >= 0 ? 1 : -1;
    const th = (side > 0 ? G.thR : G.thL) * legW;
    const lf = (side > 0 ? G.liftR : G.liftL) * legW;
    const pvx = side * 2.60, pvy = -2.20, dx = x - pvx, dy = y - pvy;
    const c = Math.cos(th), s = Math.sin(th);
    x = pvx + dx * c - dy * s;
    y = pvy + dx * s + dy * c - lf;
  }
  const headW = ease(clamp((-5.55 - py) / 0.85));
  if (headW > 1e-4 && G.head) {                          // ②
    const a = G.head * headW, pvy = -6.00, dx = x, dy = y - pvy;
    const c = Math.cos(a), s = Math.sin(a);
    x = dx * c - dy * s;
    y = pvy + dx * s + dy * c;
  }
  return [x, y];
}

// Wide, Chubby, Short-Legged Standing Baby-Dino Silhouette (保持好形状，整体加宽变胖、缩短腿长：
// 宽圆饱满的大脑袋与婴儿肥脸颊 rx=4.88u -> 宽厚圆滚滚的胖身体 rx=4.82u -> 短粗圆润有弧度的小胖短腿！)
// R13：几何常量一个都没动（V4.6 冻结），只是把腿/头的形变交给 dinoDeformPt 参数化。
function curvyStandingDinoPts(u, vName, G, J) {
  const wScale = vName === 'side' ? 0.88 : 1.0;
  const raw = [
    // Wide, round cute baby-head dome (圆润宽阔的大脑门)
    [ 0.00, -10.35],
    [ 2.58, -10.05],
    [ 4.25, -8.95],
    // Full, wide marshmallow baby cheeks (饱满宽胖脸颊 rx=4.88u)
    [ 4.86, -7.45],
    [ 4.88, -6.05],
    // Wide, chubby round torso (身体大幅加宽 rx=4.82u，告别偏瘦感！)
    [ 4.82, -4.65],
    [ 4.72, -3.28],
    // Plump lower hip rounding into SHORT, curvy chubby legs (缩短腿长，保留圆润小鸡腿弧度！)
    [ 4.22, -2.18],
    [ 3.48, -1.35],
    // Low chubby ankle taper (短腿脚踝微收弧度)
    [ 2.68, -0.82],
    // Wide, plump rounded standing paw (宽乎乎的圆润小肉脚掌)
    [ 2.95, -0.36],
    [ 2.62,  0.06],
    [ 1.42,  0.06],
    [ 0.96, -0.28],
    // Short inner right leg curving up to the low, chubby under-belly arch (-1.12u)
    [ 0.92, -0.82],
    [ 0.00, -1.12],
    // Short inner left leg curving down to the left foot
    [-0.92, -0.82],
    [-0.96, -0.28],
    [-1.42,  0.06],
    [-2.62,  0.06],
    [-2.95, -0.36],
    // Left low chubby ankle taper
    [-2.68, -0.82],
    // Left short, curvy outer leg & hip
    [-3.48, -1.35],
    [-4.22, -2.18],
    // Wide, chubby left torso & cheek
    [-4.72, -3.28],
    [-4.82, -4.65],
    [-4.88, -6.05],
    [-4.86, -7.45],
    [-4.25, -8.95],
    [-2.58, -10.05]
  ];
  return raw.map(([px, py]) => {
    const q = dinoDeformPt(px, py, G);
    return [q[0] * wScale * u + jit(J * 0.2), q[1] * u + jit(J * 0.2)];
  });
}

// Open arc points (for seamless head bumps and seamless curvy arms!)
function arcContourPts(cx, cy, rx, ry, a0, a1, n = 12, rot = 0, j = 0) {
  const pts = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;
    pts.push([
      cx + lx * c - ly * s + jit(j),
      cy + lx * s + ly * c + jit(j)
    ]);
  }
  return pts;
}

// Youthful tapered face contour for "我" (matching resume-live.jpg: clean temples + tapered jawline & chin, NOT a wide flat bun!)
function creatorFacePts(u, vName, J) {
  const w = vName === 'side' ? 0.85 : 1.0;
  const raw = [
    [ 0.00, -11.20],
    [ 2.25 * w, -10.90],
    [ 3.38 * w, -9.75],
    [ 3.52 * w, -8.35], // temple at glasses brow
    [ 3.28 * w, -7.10], // upper cheek
    [ 2.55 * w, -6.05], // tapered youthful jawline (干净利落的青年下颌线)
    [ 1.25 * w, -5.45],
    [ 0.00, -5.28],     // rounded-tapered chin (微尖圆润下巴)
    [-1.25 * w, -5.45],
    [-2.55 * w, -6.05],
    [-3.28 * w, -7.10],
    [-3.52 * w, -8.35],
    [-3.38 * w, -9.75],
    [-2.25 * w, -10.90]
  ];
  return raw.map(([px, py]) => [px * u + jit(J * 0.22), py * u + jit(J * 0.22)]);
}

// ══════════════════════════════════════════════════════════════════════════════
// R13 · 小恐龙 = 纯代码程序化绘制（唯一绘制路径；全片禁止引用 assets/dino2 精灵）
//   · 连续步态：相位 w = 位移积分 / 步幅，由 t 直接算出。24fps 每帧都在变，
//     全程不做 Math.round、不按帧取整、不贴图 → 结构上不可能"一帧一帧拼"
//   · 表情系统：expr 派生 6 种眼 × 5 种嘴 × 附加物，全部共用同一套头身几何
//   · 待机：呼吸（±1.5% / 2.4s）+ 眨眼（3–5s 一次、3 帧闭合、ease）+ 偶尔歪头
// ══════════════════════════════════════════════════════════════════════════════
const DINO_INK = '#1B2559';                    // 形象规范描边色（只作用于小恐龙，不改全局 PAL.ink）
const DINO_GAIT = {
  THIGH: 18 * Math.PI / 180,                   // 大腿摆幅 ±18°
  BOB: 3,                                      // 身体起伏 ±3px（u=24 基准，随 u 等比缩放）
  ARM: 0.34,                                   // 手臂反相摆幅（aL/aR 单位）
  TAIL: 0.20,                                  // 尾巴左右摆幅（u）
  TAIL_LAG: 0.15,                              // 尾巴滞后相位（周期比例）
  HEAD: 1.7 * Math.PI / 180,                   // 头部微倾 ±1.7°
  LIFT: 0.30,                                  // 抬脚高度（u，≈腿长 14%）
  BREATH: 2.4,                                 // 呼吸周期（s）
  BLINK: [3, 5]                                // 眨眼间隔区间（s）
};

// 一条腿的摆动：w 在 [0,.5] 前摆、[.5,1] 支撑；ease() 让两个极值处速度为 0（脚落地不滑），
// 且极值两侧导数同为 0 → 跨半周期 C1 连续，24fps 采样不会出现顿帧。
const dinoLegSwing = w => { const f = frac(w) * 2; return f < 1 ? -1 + 2 * ease(f) : 1 - 2 * ease(f - 1); };

// 一个完整周期（= 两倍步幅）的全部步态量。全部是 w 的连续函数，amp 是"走↔停"的连续权重。
function dinoGait(w, amp = 1) {
  const f = frac(w), s = Math.sin(TAU * f);
  return {
    thL: DINO_GAIT.THIGH * amp * dinoLegSwing(f),                 // 左腿大腿角（±18°）
    thR: DINO_GAIT.THIGH * amp * dinoLegSwing(f + 0.5),           // 右腿（反相）
    liftL: DINO_GAIT.LIFT * amp * Math.pow(Math.max(0, s), 1.5),  // 摆动腿抬起
    liftR: DINO_GAIT.LIFT * amp * Math.pow(Math.max(0, -s), 1.5),
    bob: -DINO_GAIT.BOB * amp * Math.sin(TAU * 2 * f),            // 身体起伏 ±3px，2 倍频
    arm: DINO_GAIT.ARM * amp * s,                                 // 手臂反相摆动
    tail: DINO_GAIT.TAIL * amp * Math.sin(TAU * (f - DINO_GAIT.TAIL_LAG)),  // 尾巴滞后 0.15 相位
    head: DINO_GAIT.HEAD * amp * Math.sin(TAU * f)                // 头部微倾（同频、幅度更小）
  };
}

// 待机 · 偶尔歪头：每 6.0–8.6s 一次，1.5s 内 ease 歪过去再回来（纯函数，帧间连续）
function dinoIdleTilt(t, seed = 0) {
  const P = 6.0 + 2.6 * hash(seed * 3.7 + 1.3), n = Math.floor(t / P), ph = t - n * P;
  const on = 0.35 + 0.45 * hash(n * 1.7 + seed * 0.7), dur = 1.5;
  const k = seg(ph, on, on + 0.26) * (1 - seg(ph, on + dur - 0.26, on + dur));
  return (hash(n * 5.1 + seed * 2.3) > 0.5 ? 1 : -1) * ease(k) * 0.055;
}
// 待机 · 眨眼：每 3–5s 一次，闭合窗 4 帧（其中 3 帧可见闭合），边缘 ease（不突然出现/消失）
function dinoBlinkAt(t, seed = 0) {
  const P = DINO_GAIT.BLINK[0] + (DINO_GAIT.BLINK[1] - DINO_GAIT.BLINK[0]) * hash(seed * 7.3 + 2.1);
  const D = 4 / 24, bt = frac((t + 0.37 * seed) / P) * P;
  if (bt >= D) return 0;
  return ease(Math.min(1, bt / (1.2 / 24)) * Math.min(1, (D - bt) / (1.2 / 24)));
}

// 表情表：expr → 眼 / 嘴 / 附加物 / 腮红 / 嘴部缩放。所有表情共用同一套头身几何，只换这几项。
const DINO_EXPR = {
  neutral: { eyes: 'dot',    mouth: 'smile', blush: 0.68, ms: 1.00 },
  happy:   { eyes: 'happy',  mouth: 'smile', blush: 0.80, ms: 1.02 },
  laugh:   { eyes: 'happy',  mouth: 'laugh', blush: 0.92, ms: 1.18 },
  cry:     { eyes: 'cry',    mouth: 'wail',  blush: 0.55, ms: 1.06, tears: 1 },
  shock:   { eyes: 'wide',   mouth: 'O',     blush: 0.42, ms: 1.12, sweat: 1 },
  daze:    { eyes: 'narrow', mouth: 'flat',  blush: 0.50, ms: 1.00, sweat: 0.55 },
  dizzy:   { eyes: 'swirl',  mouth: 'o',     blush: 0.55, ms: 1.00 },
  stone:   { eyes: 'stone',  mouth: 'flat',  blush: 0.00, ms: 1.00, grey: 1 },
  smug:    { eyes: 'narrow', mouth: 'flat',  blush: 0.62, ms: 1.00, tilt: 0.05 },
  heart:   { eyes: 'dot',    mouth: 'smile', blush: 1.00, ms: 1.02, hearts: 1 },
  popcorn: { eyes: 'dot',    mouth: 'o',     blush: 0.72, ms: 1.00, popcorn: 1 },
  angry:   { eyes: 'narrow', mouth: 'flat',  blush: 0.45, ms: 1.00, anger: 1 }
};

// 爆米花道具：纸桶 + 三颗爆米花（画在手臂末端，armL/armR 钩子坐标）
function dinoPopcornProp(u, sw, armAng = 0) {
  const ink = DINO_INK;
  push();
  rotate(-armAng);                       // 抵消手臂倾角 → 纸桶始终直立
  translate(0, 0.55 * u);
  paint(rrPts(-0.86 * u, -1.72 * u, 1.72 * u, 1.86 * u, 0.18 * u), { wash: '#FFFDF6', ink: ink, sw: sw * 0.85 });
  for (const i of [-1, 1]) paint(rectPts(i * 0.58 * u - 0.14 * u, -1.68 * u, 0.28 * u, 1.78 * u, 0.5), { wash: '#E0483C', ink: null });
  paint(rectPts(-0.86 * u, -1.72 * u, 1.72 * u, 0.30 * u, 0.6), { wash: '#E0483C', ink: null });
  for (const [px, py, r] of [[-0.50, -1.92, 0.42], [0.02, -2.12, 0.48], [0.54, -1.86, 0.38]])
    paint(ellPts(px * u, py * u, r * u, r * u * 0.92, 12), { wash: '#FFF1C9', ink: ink, sw: sw * 0.55 });
  pop();
}

// 表情附加物：泪 / 汗滴 / 怒气十字 / 爱心 —— 全部参数化矢量，不用贴图
function dinoExtras(u, o) {
  const ink = o.ink || DINO_INK, sw = o.sw || 1, EX = o.EX || {};
  if (EX.tears) {                                            // 爆哭：两道泪流 + 甩出的泪珠
    for (const s of o.sides) {
      const P = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        P.push([s * (1.95 + 0.78 * k - 0.30 * k * k) * u + Math.sin(T * 9 + i * 1.2) * 0.05 * u, (-7.15 + 2.45 * k) * u]);
      }
      paint(ribbon(P, 0.22 * u, 0.52 * u), { wash: PAL.sky, washOp: 225, fill: '#FFFFFF', fillOp: 55, ink: ink, sw: sw * 0.45 });
      for (let i = 0; i < 3; i++) {
        const ph = frac(T * 1.6 + i / 3 + (s > 0 ? 0.45 : 0));
        paint(ellPts(s * (2.55 + ph * 1.9) * u, (-6.35 + ph * 3.2) * u,
          0.15 * u * (1 - ph * 0.4), 0.21 * u * (1 - ph * 0.4), 8), { wash: PAL.sky, ink: ink, sw: sw * 0.35 });
      }
    }
  }
  if (EX.sweat) {                                            // 汗滴（太阳穴，轻微上下浮）
    const k = EX.sweat, bx = 3.95 * u, by = (-8.45 + 0.20 * Math.sin(T * 3.2)) * u;
    paint([[bx, by - 0.92 * u * k], [bx + 0.42 * u * k, by + 0.14 * u], [bx + 0.34 * u * k, by + 0.62 * u],
           [bx, by + 0.82 * u], [bx - 0.34 * u * k, by + 0.62 * u], [bx - 0.42 * u * k, by + 0.14 * u]],
      { wash: PAL.sky, fill: '#FFFFFF', fillOp: 80, ink: ink, sw: sw * 0.62, curv: 0.45 });
    paint(ellPts(bx - 0.13 * u * k, by + 0.30 * u, 0.11 * u * k, 0.17 * u, 8), { wash: PAL.cream, ink: null });
  }
  if (EX.anger) {                                            // 怒气十字（头顶右，抖动）
    push();
    translate(3.55 * u, -10.10 * u);
    rotate(0.18 * Math.sin(T * 14));
    for (const a of [0.785, -0.785]) {
      push(); rotate(a);
      paint(rrPts(-0.62 * u, -0.13 * u, 1.24 * u, 0.26 * u, 0.13 * u), { wash: '#E23E36', ink: ink, sw: sw * 0.4 });
      pop();
    }
    pop();
  }
  if (EX.hearts) {                                           // 爱心：三颗上浮（比心 / 福利）
    for (let i = 0; i < 3; i++) {
      const ph = frac(T * 0.55 + i / 3), a = Math.sin(ph * Math.PI);
      if (a < 0.15) continue;
      paint(heartPts((2.6 + 1.5 * Math.sin(ph * 4.2 + i)) * u, (-11.3 - 2.6 * ph) * u, 0.52 * u * a, 18),
        { wash: '#E2476E', fill: '#FF8FA3', fillOp: 70, ink: ink, sw: sw * 0.5 });
    }
  }
}

// ---------- 1. WIDE, CHUBBY, SHORT-LEGGED STANDING ANS LITTLE DINO (宽胖圆润 + 短粗有弧度小胖腿) ----------
// o.expr  : 'neutral'|'happy'|'laugh'|'cry'|'shock'|'daze'|'dizzy'|'stone'|'smug'|'heart'|'popcorn'|'angry'
// o.walk  : 连续相位 0..1（null = 待机）；o.walkAmp: 0..1 走↔停的连续权重（场景侧 4 帧缓入缓出）
// o.blink : 0..1（不传则按 3–5s 自动眨眼）
function dino(x, y, u, o = {}) {
  const id = o.boilKey ?? ('dino_' + (++CLAWD_N));
  const rs = part => boilSeed(id + '_' + part);
  x += (o.dx || 0) * u;
  const vName = o.view || 'front';
  const V = VIEWS[vName] || VIEWS.front;
  const dy = (o.dy || 0) * u;
  const sq = (o.sq || 0) + (o.take || 0);
  const sm = clamp(o.smear || 0);
  const sw = clamp(u / 14, 0.5, 2.3) * (o.swMul || 1);
  const J = u * 0.032;
  const INK = o.inkCol || DINO_INK;
  const seed = o.seed || 0;

  // ── 表情（expr 为唯一权威；未给 expr 时沿用旧 eyes/mouth 直传，兼容设定图）──
  const EX = DINO_EXPR[o.expr] || DINO_EXPR.neutral;
  const eKind = o.expr ? EX.eyes : (o.eyes || 'dot');
  const mKind = o.expr ? EX.mouth : (o.mouth === undefined ? 'smile' : o.mouth);
  const greyK = clamp(EX.grey || 0);

  // ── 步态 / 待机（wAmp 连续混合：走 → 停不会跳变）──
  const wAmp = o.walk == null ? 0 : clamp(o.walkAmp ?? 1);
  const G = dinoGait(o.walk ?? 0, wAmp);
  G.tail = lerp(0.085 * Math.sin(TAU * T / 3.1 + seed), G.tail, wAmp);          // 待机也有慢摆尾
  G.head = lerp(dinoIdleTilt(T, seed), G.head, wAmp) + (EX.tilt || 0);
  G.bobU = G.bob / 24;
  const blink = o.blink != null ? clamp(o.blink) : dinoBlinkAt(T, seed);
  const br = Math.sin(TAU * T / DINO_GAIT.BREATH + seed * 0.37) * (1 - wAmp) * (o.breath === false ? 0 : 1);

  const col = greyK > 0 ? mixCol(o.dinoCol || DINO_COLS.mint, '#C9CFD7', 0.74) : (o.dinoCol || DINO_COLS.mint);
  const dk = greyK > 0 ? mixCol(o.dinoDk || DINO_COLS.mintDk, '#AEB5BF', 0.74) : (o.dinoDk || DINO_COLS.mintDk);
  const lt = greyK > 0 ? mixCol(o.dinoLt || DINO_COLS.mintLt, '#E4E8ED', 0.74) : (o.dinoLt || DINO_COLS.mintLt);

  // Ground shadow under wide chubby standing feet（投影保留，不随身体起伏移动）
  rs('shadow');
  if (!o.noShadow) {
    const f = 1 - Math.min(0.5, Math.abs(o.dy || 0) * 0.06);
    paint(ellPts(x, y + u * 0.16, u * 5.2 * f, u * 0.92 * f, 20), {
      fill: PAL.ink, fillOp: 78, bleed: 0.2, tex: 0.3, border: 0.1, ink: null
    });
  }
  // 每只脚一块接触阴影：跟着脚走，抬脚时变小变淡 → 走路时"脚在动"一眼可读
  if (!o.noShadow && wAmp > 0.01) {
    for (const s of [-1, 1]) {
      const fp = dinoDeformPt(s * 2.0, 0.06, G);
      const lf = clamp((s > 0 ? G.liftR : G.liftL) / DINO_GAIT.LIFT);
      paint(ellPts(x + fp[0] * u, y + dy + fp[1] * u + G.bobU * u, u * (0.92 - 0.34 * lf), u * (0.22 - 0.09 * lf), 12), {
        fill: PAL.ink, fillOp: 58 * (1 - 0.5 * lf), bleed: 0.25, tex: 0.3, ink: null
      });
    }
  }
  if (sm > 0.05) smearTrail(x, y + dy, u, V, sm, o.smearDir ?? (o.flip ? -1 : 1), col);

  push();
  translate(x, y + dy + G.bobU * u);                       // 身体起伏（脚底在形变里被抵消）
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * 0.5) * (1 + sm * 0.28) * (1 + 0.010 * br),
        (o.sy ?? 1) * (1 - sq) * (1 + 0.015 * br));        // 呼吸：整体 ±1.5% 缩放

  // 头部图层统一绕颈点微倾 —— 眼/嘴/腮红/凸起与头轮廓永远同一套几何
  const headXf = fn => { push(); translate(0, -6.00 * u); rotate(G.head); translate(0, 6.00 * u); fn(); pop(); };

  // 1. Plump, Upturned Dino Tail attached low on the wide hip (-2.48u to -1.02u)，滞后 0.15 相位摆动
  rs('tail');
  const wag = G.tail * u;
  const tailDir = (vName === 'side' || vName === 'q' || vName === 'qback') ? -1 : 1;
  const tBaseX = tailDir * (vName === 'side' ? 3.15 : 3.65) * u;
  const tailPts = [
    [tBaseX, -2.48 * u],
    [tBaseX + tailDir * 1.52 * u, -2.55 * u + wag * 0.35],
    [tBaseX + tailDir * 2.28 * u, -2.02 * u + wag * 0.70],
    [tBaseX + tailDir * 1.96 * u, -1.18 * u + wag * 0.45],
    [tBaseX + tailDir * 0.98 * u, -1.02 * u + wag * 0.20],
    [tBaseX - tailDir * 0.20 * u, -1.32 * u]
  ];
  paint(tailPts, {
    wash: mixCol(col, dk, 0.14), washOp: 255, fill: dk, fillOp: 70, bleed: 0.15,
    ink: INK, sw: sw * 0.88, curv: 0.55
  });

  // 2. Unified Wide Chubby Body + Short Curvy Legs + Cute Paws（腿按步态相位连续形变）
  rs('body');
  const bodyPts = curvyStandingDinoPts(u, vName, G, J);
  paint(bodyPts, { wash: col, washOp: 255, ink: null });

  // Soft 3D watercolor highlights (wide forehead & plump side) and gentle lower-body shading
  paint(ellPts(-1.55 * u, -8.85 * u, 2.65 * u, 1.25 * u, 16, J), {
    fill: lt, fillOp: 135, bleed: 0.22, tex: 0.6, border: 0.5, ink: null
  });
  paint(ellPts(2.05 * u, -2.85 * u, 2.65 * u, 1.45 * u, 16, J), {
    fill: dk, fillOp: 85, bleed: 0.18, tex: 0.55, border: 0.5, ink: null
  });
  for (const s of [-1, 1]) {
    paint(ellPts(s * 3.12 * u, -1.95 * u, 0.78 * u, 0.82 * u, 12), {
      fill: lt, fillOp: 105, bleed: 0.18, ink: null
    });
    paint(ellPts(s * 2.02 * u, -0.26 * u, 0.95 * u, 0.26 * u, 12), {
      fill: dk, fillOp: 110, bleed: 0.14, ink: null
    });
  }

  // 3. Wide, Plump Round Cream Belly Patch (#FFFDF6, sitting low and full on the chubby tummy!)
  if (!V.back && vName !== 'qback') {
    rs('belly');
    const fCx = (V.face ? V.face.cx * 0.4 : 0) * u;
    const fW = V.face ? V.face.fw : 1;
    paint(ellPts(fCx, -3.05 * u, 3.08 * fW * u, 1.62 * u, 24, J * 0.2), {
      wash: DINO_COLS.cream, washOp: 255, ink: null
    });
    paint(ellPts(fCx, -1.62 * u, 2.35 * fW * u, 0.34 * u, 16, J * 0.15), {
      fill: DINO_COLS.creamDk, fillOp: 120, bleed: 0.15, ink: null
    });
  }

  // 4. Wide Horizontal Cream Lower-Face Patch + Kawaii Baby-Schema Face（所有表情共用这一套几何）
  if (V.face) {
    const F = V.face;
    headXf(() => {
      push();
      translate(F.cx * 0.42 * u, 0);
      scale(F.fw, 1);

      rs('muzzle');
      paint(ellPts(0, -6.32 * u, 3.68 * u, 1.24 * u, 26, J * 0.18), {
        wash: DINO_COLS.cream, washOp: 255, ink: null
      });
      paint(ellPts(0, -5.02 * u, 2.35 * u, 0.22 * u, 14, J * 0.14), {
        fill: DINO_COLS.creamDk, fillOp: 110, bleed: 0.15, ink: null
      });

      // Soft Pink Kawaii Cheek Blushes（强度由 expr 给：石化 = 0）
      rs('blush');
      const bAmt = clamp(o.expr ? (EX.blush ?? 0.68) : Math.max(0.68, o.blush === true ? 1 : (o.blush || 0)));
      if (bAmt > 0.02) for (const s of F.sides) {
        paint(ellPts(s * 2.88 * u, -6.65 * u, 0.76 * u, 0.38 * u, 14), {
          fill: DINO_COLS.cheek, fillOp: 175 * bAmt, bleed: 0.22, ink: null
        });
      }

      // Kawaii eyes: 6 kinds + 眨眼（连续 squash，不突然切换）
      rs('eyes');
      dinoEyes(u, { ...o, inkCol: INK, blink }, sw, F.sides, eKind);

      // Cute Little Mouth (U 笑 / 张嘴 O / 大笑 / 波浪哭 / 一字平)
      rs('mouth');
      push();
      translate(F.mx * 0.45 * u, -2.02 * u);
      mouth(u * 0.84 * (EX.ms || 1), mKind, sw * 0.92, INK);
      pop();
      pop();

      // 附加物（泪 / 汗 / 怒气 / 爱心）—— 跟着头一起微倾
      rs('extras');
      dinoExtras(u, { EX, sides: F.sides, sw, ink: INK });
    });
  }

  // 5. Continuous Smooth Ink Outline (curv: 0.58)
  rs('body_ink');
  paint(bodyPts, { ink: INK, sw: sw * 0.98, curv: 0.58 });

  // 6. 3 Seamless Soft Rounded Mint-Green Head Bumps ON TOP of the wide head border (-9.6u to -10.55u)
  headXf(() => {
    rs('bumps');
    const bumpShift = vName === 'side' ? -0.28 : 0;
    const bumps = [
      [2.38 + bumpShift, -9.58, 0.66, 0.74, 0.42],
      [1.26 + bumpShift, -10.22, 0.92, 1.02, 0.20],
      [-0.08 + bumpShift, -10.55, 1.22, 1.30, 0.02]
    ];
    for (const [bx, by, brx, bry, brot] of bumps) {
      paint(ellPts(bx * u, by * u, brx * u, bry * u, 18, J * 0.2, brot), {
        wash: col, washOp: 255, ink: null
      });
      const arcPts = arcContourPts(bx * u, by * u, brx * u, bry * u, -Math.PI * 0.94, -Math.PI * 0.06, 11, brot, J * 0.16);
      inkLine(arcPts, sw * 0.92, INK, 'ink', 0.45);
    }
  });

  // 7. Plump, Curvy Outward-Flipper Arms（手臂反相摆动，与腿的节奏同源）
  const drawDinoPaw = (px, dir, which) => {
    rs('arm' + which);
    const rawA = which === 'L' ? (o.aL ?? 0.15) : (o.aR ?? 0.15);
    const gaitA = which === 'L' ? G.arm : -G.arm;
    const lift = clamp((rawA + gaitA - 0.15) * 1.15, -0.15, 1.85);
    const hook = which === 'L' ? o.armL : (o.armR || (EX.popcorn ? dinoPopcornProp : undefined));

    push();
    translate(px * u, -4.55 * u);
    if (dir === 0) {
      const ang = 0.95 - lift * 0.85;
      rotate(ang);
      paint(ellPts(0.25 * u, 0, 0.76 * u, 0.66 * u, 14), { wash: col, washOp: 255, ink: null });
      paint(ellPts(0.95 * u, 0, 1.06 * u, 0.68 * u, 18, J * 0.2), { wash: col, washOp: 255, ink: null });
      inkLine(arcContourPts(0.95 * u, 0, 1.06 * u, 0.68 * u, -Math.PI * 0.55, Math.PI * 0.65, 12, 0, J * 0.16), sw * 0.86, INK, 'ink', 0.45);
      if (hook) { translate(1.85 * u, 0); hook(u, sw); }
    } else {
      const swing = 0.72 + lift * 0.78;
      rotate(dir < 0 ? swing : -swing);

      // Seamless shoulder root wash erases the body line under the shoulder
      paint(ellPts(0, 0.10 * u, 0.82 * u, 0.76 * u, 14), { wash: col, washOp: 255, ink: null });

      // Plump curved teardrop flipper extending along local +Y
      const pawCy = 0.94 * u, pawRx = 0.68 * u, pawRy = 1.05 * u;
      paint(ellPts(0, pawCy, pawRx, pawRy, 18, J * 0.2), { wash: col, washOp: 255, ink: null });
      paint(ellPts(dir * 0.14 * u, pawCy - 0.20 * u, 0.34 * u, 0.44 * u, 10), {
        fill: lt, fillOp: 115, bleed: 0.16, ink: null
      });
      paint(ellPts(-dir * 0.08 * u, pawCy + 0.40 * u, 0.44 * u, 0.32 * u, 10), {
        fill: dk, fillOp: 115, bleed: 0.15, ink: null
      });
      const pawArc = arcContourPts(0, pawCy, pawRx, pawRy, -Math.PI * 0.12, Math.PI * 1.12, 14, 0, J * 0.16);
      inkLine(pawArc, sw * 0.88, INK, 'ink', 0.42);

      if (hook) {
        translate(0, pawCy + pawRy * 0.85);
        if (dir < 0) scale(-1, 1);
        hook(u, sw, dir < 0 ? swing : -swing);
      }
    }
    pop();
  };

  if (vName === 'side') {
    drawDinoPaw(0.65, 0, 'L');
  } else {
    drawDinoPaw(-4.38, -1, 'L');
    drawDinoPaw(4.38, 1, 'R');
  }

  if (o.hat) {
    rs('hat');
    push(); translate(V.hat * u, -3.0 * u); scale(V.hw, 1); hat(u, o.hat, sw); pop();
  }

  rs('draw');
  if (o.draw) o.draw(u, sw);
  pop();

  // Emote above head
  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    const ex = top ? x + dir * V.hat * u : x + dir * (V.R + 0.3) * u;
    const ey = y + dy + (top ? -12.6 : -10.8) * u * (1 - sq);
    emote(o.emote, ex, ey, u * 0.9, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// 眼睛 6 种（豆豆 / 弯眼笑 / 半眯无语 / 空心大眼震惊 / 螺旋 / 灰白石化）+ 哭眼。
// 全部共用同一对锚点 (±2.02u, -7.45u) 与同一套眨眼逻辑 → 换表情时头部几何零变化。
function dinoEyes(u, o, sw, sides, kind) {
  const ink = o.inkCol || DINO_INK, blink = clamp(o.blink || 0);
  const ey = -7.45 * u, sc = 1 - 0.94 * blink;
  const lx = (o.lookX || 0) * u * 0.30, ly = (o.lookY || 0) * u * 0.24;
  const K = kind || 'dot';
  if (K === 'cry') {                                   // 爆哭：紧闭的 ><（泪流由 dinoExtras 画）
    for (const s of sides) {
      push(); translate(s * 2.02 * u, ey);
      inkLine([[-0.62 * s * u, -0.34 * u], [0.10 * s * u, 0], [-0.62 * s * u, 0.34 * u]], sw * 1.15, ink, 'ink', 0.1);
      pop();
    }
    return;
  }
  for (const s of sides) {
    push();
    translate(s * 2.02 * u + lx, ey + ly);
    if (K === 'dot') {                                 // 黑豆眼带高光
      paint(ellPts(0, 0, 0.58 * u, 0.62 * u * sc, 16), { wash: ink, ink: null });
      if (u > 8 && sc > 0.35) {
        paint(ellPts(-0.19 * u, -0.20 * u * sc, 0.21 * u, 0.23 * u * sc, 8), { wash: PAL.cream, ink: null });
        paint(ellPts(0.17 * u, 0.18 * u * sc, 0.10 * u, 0.10 * u, 8), { wash: PAL.cream, ink: null });
      }
    } else if (K === 'happy') {                        // 弯眼笑：∩ 双弧
      inkLine([[-0.66 * u, 0.20 * u], [-0.30 * u, -0.30 * u], [0.30 * u, -0.30 * u], [0.66 * u, 0.20 * u]],
        sw * 1.2, ink, 'ink', 0.55);
    } else if (K === 'narrow') {                       // 半眯无语：厚横缝 + 上眼睑
      paint(ellPts(0, 0, 0.62 * u, 0.14 * u * (1 - 0.6 * blink), 14), { wash: ink, ink: null });
      inkLine([[-0.70 * u, -0.30 * u], [0, -0.40 * u], [0.70 * u, -0.30 * u]], sw * 0.85, ink, 'ink', 0.4);
    } else if (K === 'wide') {                         // 空心大眼震惊：白眼球 + 小瞳孔 + 高光
      paint(ellPts(0, 0, 0.76 * u, 0.86 * u * sc, 18), { wash: PAL.cream, ink: ink, sw: sw * 0.85 });
      paint(ellPts(0, 0.08 * u, 0.28 * u, 0.32 * u * sc, 12), { wash: ink, ink: null });
      if (sc > 0.4) paint(ellPts(-0.11 * u, -0.10 * u * sc, 0.11 * u, 0.12 * u, 8), { wash: PAL.cream, ink: null });
    } else if (K === 'swirl') {                        // 螺旋
      const sp = [];
      for (let i = 0; i < 15; i++) {
        const a = i * 0.72 + T * 5.5 * s, r = (0.08 + i * 0.043) * u;
        sp.push([Math.cos(a) * r, Math.sin(a) * r * sc]);
      }
      inkLine(sp, sw * 0.68, ink, 'inkfine', 0.55);
    } else if (K === 'stone') {                        // 灰白石化
      paint(ellPts(0, 0, 0.60 * u, 0.64 * u * sc, 14), { wash: '#C7CCD4', ink: ink, sw: sw * 0.7 });
      inkLine([[0.06 * u, -0.48 * u * sc], [-0.10 * u, -0.04 * u], [0.12 * u, 0.16 * u], [0.00 * u, 0.52 * u * sc]],
        sw * 0.5, '#8A9099', 'inkfine', 0.15);
    } else {                                           // 旧名字直传（设定图 / creator 兼容）
      eye(K, s, u * 0.78, o, sw);
    }
    pop();
  }
  if (blink > 0.5) {                                   // 闭眼线随 blink 连续淡入（不会突然出现）
    const a = ease((blink - 0.5) / 0.5);
    if (a > 0.04) for (const s of sides)
      inkLine([[s * 2.02 * u - 0.62 * u, ey], [s * 2.02 * u + 0.62 * u, ey]], sw * 1.05 * a, ink, 'ink', 0);
  }
}

// ---------- 2. THE INDIE CREATOR / "我" (还原 resume-live.jpg 青年神韵 + 印有 ANS 的白T恤 + 两侧簪花蓬松黑发 + 双梁大黑框眼镜) ----------
function creator(x, y, u, o = {}) {
  const id = o.boilKey ?? ('creator_' + (++CLAWD_N));
  const rs = part => boilSeed(`${id}_${part}`);
  x += (o.dx || 0) * u;
  const vName = o.view || 'front';
  const V = VIEWS[vName] || VIEWS.front;
  const dy = (o.dy || 0) * u;
  const sq = (o.sq || 0) + (o.take || 0);
  const sm = clamp(o.smear || 0);
  const sw = clamp(u / 14, 0.5, 2.4) * (o.swMul || 1);
  const J = u * 0.045;

  const tCol = o.teeCol || CREATOR_COLS.tee;
  const tDk = o.teeDk || CREATOR_COLS.teeDk;

  // Ground shadow
  rs('shadow');
  if (!o.noShadow) {
    const f = 1 - Math.min(0.5, Math.abs(o.dy || 0) * 0.06);
    paint(ellPts(x, y + u * 0.18, u * 4.3 * f, u * 0.92 * f, 20), {
      fill: PAL.ink, fillOp: 80, bleed: 0.22, tex: 0.3, border: 0.1, ink: null
    });
  }
  if (sm > 0.05) smearTrail(x, y + dy, u, V, sm, o.smearDir ?? (o.flip ? -1 : 1), tCol);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * 0.5) * (1 + sm * 0.3), (o.sy ?? 1) * (1 - sq));

  // Helper for White T-Shirt short sleeve + bare forearm & hand
  const drawCreatorArm = (px, dir, which, layer) => {
    rs('arm' + which);
    const rawA = which === 'L' ? (o.aL ?? 0.15) : (o.aR ?? 0.15);
    const a = rawA - 0.55;
    const hook = which === 'L' ? o.armL : o.armR;
    push();
    translate(px * u, -4.75 * u);
    if (dir === 0) {
      rotate(0.45 - a);
      paint(rrPts(0.6 * u, -0.40 * u, 1.85 * u, 0.80 * u, 0.36 * u, J * 0.4), {
        wash: CREATOR_COLS.skin, washOp: 255, ink: PAL.ink, sw: sw * 0.8
      });
      paint(rrPts(-0.2 * u, -0.54 * u, 1.32 * u, 1.08 * u, 0.34 * u, J * 0.4), {
        wash: tCol, washOp: 255, ink: PAL.ink, sw: sw * 0.85
      });
      if (hook) { translate(2.50 * u, 0); hook(u, sw); }
    } else {
      rotate(dir < 0 ? a : -a);
      const armX = dir < 0 ? -2.40 * u : 0.55 * u;
      const slvX = dir < 0 ? -1.22 * u : -0.1 * u;
      paint(rrPts(armX, -0.40 * u, 1.85 * u, 0.80 * u, 0.36 * u, J * 0.4), {
        wash: CREATOR_COLS.skin, washOp: 255, ink: PAL.ink, sw: sw * 0.8
      });
      paint(ellPts(dir * 2.35 * u, 0, 0.52 * u, 0.46 * u, 12), {
        wash: CREATOR_COLS.skin, washOp: 255, ink: PAL.ink, sw: sw * 0.75
      });
      paint(rrPts(slvX, -0.54 * u, 1.32 * u, 1.08 * u, 0.34 * u, J * 0.4), {
        wash: layer === 2 ? mixCol(tCol, tDk, 0.35) : tCol,
        washOp: 255, ink: PAL.ink, sw: sw * 0.85
      });
      if (hook) { translate(dir * 2.55 * u, 0); if (dir < 0) scale(-1, 1); hook(u, sw); }
    }
    pop();
  };

  if (vName === 'q') drawCreatorArm(3.05, 1, 'R', 2);
  else if (vName === 'front' || vName === 'back') {
    drawCreatorArm(-3.08, -1, 'L', 0);
    drawCreatorArm(3.08, 1, 'R', 0);
  }

  // Legs & Sneakers (-2.4u to 0)
  if (!o.noLegs) {
    const legPos = vName === 'side' ? [[-0.6, 1], [0.6, 0]] : [[-1.42, 0], [1.42, 0]];
    legPos.forEach(([lx, isFar], i) => {
      rs('leg' + i);
      let liftY = 0, shiftX = 0;
      if (o.walk != null) {
        const ph = (o.walk + (i % 2 ? 0.5 : 0)) * TAU;
        shiftX = Math.sin(ph) * 0.55;
        liftY = -Math.max(0, Math.cos(ph)) * 0.75;
      }
      const legX = (lx + shiftX) * u;
      paint(rectPts(legX - 0.62 * u, (-2.45 + liftY) * u, 1.24 * u, 1.85 * u, J * 0.4), {
        wash: isFar ? mixCol(CREATOR_COLS.pants, PAL.ink, 0.3) : CREATOR_COLS.pants,
        washOp: 255, ink: PAL.ink, sw: sw * 0.85
      });
      paint(rrPts(legX - 0.72 * u, (-0.75 + liftY) * u, 1.58 * u, 0.75 * u, 0.3 * u, J * 0.3), {
        wash: CREATOR_COLS.shoe, washOp: 255, ink: PAL.ink, sw: sw * 0.8
      });
    });
  }

  // White Crew-Neck T-Shirt Torso with bold "ANS" logo across the chest (白体恤 + 胸前印有 ANS)
  rs('torso');
  const tw = vName === 'side' ? 4.6 * u : 6.25 * u;
  const torsoPts = rrPts(-tw / 2, -5.68 * u, tw, 3.55 * u, 0.72 * u, J * 0.5);
  paint(torsoPts, {
    wash: tCol, washOp: 255, fill: tDk, fillOp: 65, bleed: 0.1, tex: 0.42, ink: PAL.ink, sw: sw * 1.0
  });
  if (!V.back && vName !== 'qback') {
    const fShift = (V.face ? V.face.cx * 0.35 : 0) * u;
    // Clean crew-neck collar + neck skin
    paint(ellPts(fShift, -5.58 * u, 1.05 * u, 0.50 * u, 12), {
      wash: CREATOR_COLS.skin, ink: PAL.ink, sw: sw * 0.7
    });
    inkLine([[fShift - 1.28 * u, -5.48 * u], [fShift, -4.92 * u], [fShift + 1.28 * u, -5.48 * u]], sw * 0.92, PAL.ink, 'ink', 0.5);

    // Bold, crisp "ANS" graphic printed across the center of the white T-shirt!
    rs('ans_shirt_logo');
    // Subtle mint-green accent bar beneath the ANS chest print
    paint(rrPts(fShift - 1.78 * u, -3.08 * u, 3.56 * u, 0.32 * u, 0.16 * u, J * 0.10), {
      wash: DINO_COLS.mint, washOp: 255, ink: null
    });
    const lx = fShift, ly = -3.95 * u, lsw = sw * 0.90;
    // Letter 'A' (centered at lx - 1.22u)
    inkLine([[lx - 1.62 * u, ly + 0.54 * u], [lx - 1.22 * u, ly - 0.54 * u], [lx - 0.82 * u, ly + 0.54 * u]], lsw, PAL.ink, 'ink', 0.05);
    inkLine([[lx - 1.48 * u, ly + 0.14 * u], [lx - 0.96 * u, ly + 0.14 * u]], lsw * 0.88, PAL.ink, 'ink', 0);
    // Letter 'N' (centered at lx)
    inkLine([
      [lx - 0.36 * u, ly + 0.54 * u],
      [lx - 0.36 * u, ly - 0.54 * u],
      [lx + 0.36 * u, ly + 0.54 * u],
      [lx + 0.36 * u, ly - 0.54 * u]
    ], lsw, PAL.ink, 'ink', 0.04);
    // Letter 'S' (centered at lx + 1.22u)
    inkLine([
      [lx + 1.56 * u, ly - 0.36 * u],
      [lx + 1.22 * u, ly - 0.56 * u],
      [lx + 0.88 * u, ly - 0.24 * u],
      [lx + 1.56 * u, ly + 0.20 * u],
      [lx + 1.22 * u, ly + 0.56 * u],
      [lx + 0.86 * u, ly + 0.34 * u]
    ], lsw, PAL.ink, 'ink', 0.38);
  }

  if (vName === 'q') drawCreatorArm(-3.05, -1, 'L', 1);
  else if (vName === 'side') drawCreatorArm(0.4, 0, 'L', 1);

  // Youthful Head & Tapered Jawline (-11.2u to -5.28u, matching resume-live.jpg!)
  rs('head');
  const headRx = (vName === 'side' ? 3.05 : 3.52) * u;
  const headCy = -8.25 * u;

  // Ears
  if (vName !== 'side') {
    for (const s of [-1, 1]) {
      paint(ellPts(s * (headRx - 0.05 * u), headCy + 0.25 * u, 0.58 * u, 0.82 * u, 12), {
        wash: CREATOR_COLS.skin, ink: PAL.ink, sw: sw * 0.78
      });
    }
  } else {
    paint(ellPts(-0.8 * u, headCy + 0.25 * u, 0.58 * u, 0.82 * u, 12), {
      wash: CREATOR_COLS.skin, ink: PAL.ink, sw: sw * 0.78
    });
  }

  // Youthful Tapered Head Contour (干净帅气的青年窄下颌轮廓)
  const headPts = creatorFacePts(u, vName, J);
  paint(headPts, {
    wash: CREATOR_COLS.skin, washOp: 255, fill: CREATOR_COLS.skinDk, fillOp: 42, bleed: 0.12, tex: 0.38,
    ink: PAL.ink, sw: sw * 0.98, curv: 0.48
  });

  // Lush Natural Center-Parted Dark Hair + Colorful Floral Crown (drawn BEFORE glasses so the double-bridge hollow gap is 100% crisp and unobstructed!)
  rs('hair');
  drawCreatorHairAndFlowers(u, sw, vName, headRx, headCy, J, rs);

  // Face features + Wayfarer Double-Bridge Hollow Glasses
  if (V.face) {
    const F = V.face;
    push();
    translate(F.cx * 0.45 * u, 0);
    scale(F.fw, 1);

    // Subtle warm cheek tone
    for (const s of F.sides) {
      paint(ellPts(s * 2.35 * u, -6.82 * u, 0.52 * u, 0.28 * u, 12), {
        fill: PAL.rose, fillOp: 95, bleed: 0.2, ink: null
      });
    }

    // Clean, handsome young-man nose contour (NO purple ball on the nose!)
    inkLine([[0.04 * u, -7.22 * u], [-0.05 * u, -6.75 * u], [0.16 * u, -6.68 * u]], sw * 0.58, CREATOR_COLS.skinDk, 'ink', 0.25);

    // Subtle tiny cheek sticker on the right cheek (referencing resume-live.jpg without cluttering the nose)
    if (u > 13) {
      paint(starPts(2.38 * u, -6.85 * u, 0.32 * u, 0.46, 5, 0.2), {
        wash: '#60A5FA', ink: PAL.ink, sw: sw * 0.32
      });
    }

    // SIGNATURE WAYFARER DOUBLE-BRIDGE HOLLOW GLASSES (眼镜中间是两个横杠，上面还有一个，中间中空)
    rs('glasses');
    drawDoubleBridgeGlassesAndEyes(u, o, sw, F.sides, sm, J, rs);

    // Youthful Mouth at y = -6.05u
    rs('mouth');
    push();
    translate(F.mx * 0.45 * u, -2.18 * u);
    mouth(u * 0.80, o.mouth === undefined ? 'smile' : o.mouth, sw * 0.92);
    pop();

    pop();
  }

  rs('draw');
  if (o.draw) o.draw(u, sw);
  pop();

  // Emote above head
  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    const ex = top ? x + dir * V.hat * u : x + dir * 4.5 * u;
    const ey = y + dy + (top ? -14.3 : -12.5) * u * (1 - sq);
    emote(o.emote, ex, ey, u * 0.9, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// Stylish Wayfarer/Aviator Double-Bridge Glasses (matching resume-live.jpg: wider upper brow, rounded lower lens, TWO horizontal bridges with a clear hollow gap!)
function drawDoubleBridgeGlassesAndEyes(u, o, sw, sides, smear, J, rs) {
  const gy = -7.88 * u;
  const kinds = Array.isArray(o.eyes) ? o.eyes : o.eyes === 'wink' ? ['happy', 'normal'] : [o.eyes || 'normal', o.eyes || 'normal'];
  const sqz = clamp(o.squint || 0);

  for (const s of sides) {
    const gx = s * 1.76 * u;
    // Wayfarer trapezoidal-rounded lens contour (wider at top brow, slightly tapered at bottom cheek like in resume-live.jpg)
    const framePts = [
      [gx - s * 0.96 * u, gy - 0.74 * u],
      [gx + s * 1.06 * u, gy - 0.70 * u],
      [gx + s * 0.94 * u, gy + 0.56 * u],
      [gx + s * 0.35 * u, gy + 0.76 * u],
      [gx - s * 0.45 * u, gy + 0.74 * u],
      [gx - s * 0.88 * u, gy + 0.48 * u]
    ].map(([px, py]) => [px + jit(J * 0.14), py + jit(J * 0.14)]);

    paint(framePts, {
      wash: '#EAF4FA', washOp: 65, ink: null, curv: 0.35
    });

    // Natural dark eyebrow visible at top of lens
    inkLine([
      [gx - 0.56 * u, gy - 0.48 * u],
      [gx, gy - 0.58 * u],
      [gx + 0.56 * u, gy - 0.46 * u]
    ], sw * 0.85, CREATOR_COLS.hair, 'ink', 0.3);

    rs('eye_' + s);
    push();
    translate(gx, gy + 0.08 * u);
    const k = kinds[s < 0 ? 0 : 1];
    if (smear > 0.5 || sqz > 0.8) {
      inkLine([[-0.52 * u, 0], [0.52 * u, 0]], sw * 1.1, PAL.ink, 'ink', 0);
    } else if (k === 'normal' || k === 'look' || k === 'wide') {
      // Handsome young-man eye with upper eyelid line & glossy dark iris
      const lx = (o.lookX || 0) * u * 0.22, ly = (o.lookY || 0) * u * 0.18;
      inkLine([[-0.52 * u, -0.14 * u], [0, -0.25 * u], [0.52 * u, -0.10 * u]], sw * 0.78, PAL.ink, 'ink', 0.35);
      paint(ellPts(lx, ly + 0.04 * u, 0.35 * u, 0.39 * u, 14), { wash: PAL.ink, ink: null });
      if (u > 8) {
        paint(ellPts(lx - 0.11 * u, ly - 0.08 * u, 0.12 * u, 0.13 * u, 8), { wash: PAL.cream, ink: null });
      }
    } else {
      if (sqz > 0) scale(1 + sqz * 0.15, 1 - sqz);
      eye(k, s, u * 0.48, o, sw * 0.82);
    }
    pop();

    rs('frame_' + s);
    paint(framePts, {
      ink: CREATOR_COLS.frames, sw: sw * 1.35, curv: 0.35
    });
    inkLine([[gx - 0.62 * u, gy - 0.36 * u], [gx - 0.20 * u, gy - 0.50 * u]], sw * 0.48, PAL.cream, 'inkfine', 0);
  }

  if (sides.length > 1) {
    rs('double_bridge');
    // 1. TOP HORIZONTAL BROW BAR (上面一个横杠, connecting the top-inner corners at gy - 0.72u)
    inkLine([[-0.82 * u, gy - 0.72 * u], [0, gy - 0.74 * u], [0.82 * u, gy - 0.72 * u]], sw * 1.15, CREATOR_COLS.frames, 'ink', 0);
    // 2. LOWER HORIZONTAL NOSE BAR (中间第二个横杠, at gy - 0.06u, leaving a crisp hollow window 中间中空 between them!)
    inkLine([[-0.76 * u, gy - 0.06 * u], [0, gy - 0.08 * u], [0.76 * u, gy - 0.06 * u]], sw * 1.15, CREATOR_COLS.frames, 'ink', 0);
    // Temple arms going out to ears
    inkLine([[-2.80 * u, gy - 0.32 * u], [-3.52 * u, gy - 0.12 * u]], sw * 1.15, CREATOR_COLS.frames, 'ink', 0);
    inkLine([[2.80 * u, gy - 0.32 * u], [3.52 * u, gy - 0.12 * u]], sw * 1.15, CREATOR_COLS.frames, 'ink', 0);
  } else {
    inkLine([[0.64 * u, gy - 0.2 * u], [-1.2 * u, gy - 0.05 * u]], sw * 1.2, CREATOR_COLS.frames, 'ink', 0);
  }
}

// Natural Fluffy Dark Bangs + Colorful Floral Cluster (中间微中分刘海自然露出眼镜双横梁中空，上方簇拥色彩鲜明的多品种花朵，两侧不伸出绿帽檐叶片！)
function drawCreatorHairAndFlowers(u, sw, vName, headRx, headCy, J, rs) {
  const P = pts => pts.map(([a, b]) => [a * u + jit(J * 0.22), b * u + jit(J * 0.22)]);
  if (vName === 'side') {
    const sideHair = P([
      [-3.2, -7.7], [-3.4, -9.6], [-2.2, -11.3], [0.2, -11.6],
      [2.4, -10.9], [3.3, -9.5], [2.1, -9.1], [0.8, -9.4],
      [-0.6, -9.0], [-1.4, -7.8], [-2.4, -8.2]
    ]);
    paint(sideHair, {
      wash: CREATOR_COLS.hair, washOp: 255, ink: PAL.ink, sw: sw * 0.95, curv: 0.35
    });
  } else {
    // Lush dark hair with natural center-parted bangs that arch above the double-bridge hollow gap (-9.18u in center) while framing the temples and outer brows!
    const frontHair = P([
      [-3.55, -7.85], // left sideburn
      [-3.78, -9.55],
      [-2.85, -11.15],
      [-1.05, -11.68],
      [ 0.00, -11.75],
      [ 1.05, -11.68],
      [ 2.85, -11.15],
      [ 3.78, -9.55],
      [ 3.55, -7.85], // right sideburn
      [ 3.05, -8.92],
      [ 2.15, -8.78], // right outer bang lock
      [ 1.35, -9.22],
      [ 0.82, -9.05], // stays above gy - 0.72u (-8.60u) so the top bridge bar is 100% clear!
      [ 0.00, -9.42], // natural center part
      [-0.82, -9.05],
      [-1.35, -9.22],
      [-2.15, -8.78], // left outer bang lock
      [-3.05, -8.92]
    ]);
    paint(frontHair, {
      wash: CREATOR_COLS.hair, washOp: 255, fill: CREATOR_COLS.hairLt, fillOp: 65, bleed: 0.1,
      ink: PAL.ink, sw: sw * 0.92, curv: 0.28
    });
  }

  rs('head_flowers');
  const sway = Math.sin(T * 4) * 0.04 * u;

  // 1. Tucked Emerald & Lime Foliage Leaves (angled upward on the crown, NO horizontal hat-brim leaves!)
  const leaves = [
    [-3.15, -10.85, 0.92, 0.40, -0.45, CREATOR_COLS.leafDk],
    [-1.25, -12.15, 0.95, 0.42, -0.18, CREATOR_COLS.leafLt],
    [ 1.25, -12.10, 0.92, 0.40,  0.22, CREATOR_COLS.leaf],
    [ 3.15, -10.80, 0.90, 0.38,  0.45, CREATOR_COLS.leafDk]
  ];
  for (const [lx, ly, lrx, lry, lrot, lcol] of leaves) {
    paint(ellPts(lx * u + sway, ly * u, lrx * u, lry * u, 14, J * 0.14, lrot), {
      wash: lcol, washOp: 255, ink: PAL.ink, sw: sw * 0.58
    });
  }

  // 2. FAR-RIGHT BLOOM: Soft Lavender-Purple 5-Petal Blossom (#C084FC)
  const f4x = 2.55 * u + sway, f4y = -10.62 * u;
  paint(distinctFlowerPts(f4x, f4y, 1.08 * u, 5, 0.25, 0.92, J * 0.12), {
    wash: CREATOR_COLS.lavPetal, washOp: 255, ink: PAL.ink, sw: sw * 0.65, curv: 0.42
  });
  paint(ellPts(f4x, f4y, 0.30 * u, 0.28 * u, 10), {
    wash: CREATOR_COLS.goldCore, washOp: 255, ink: PAL.ink, sw: sw * 0.48
  });

  // 3. RIGHT HERO BLOOM: Crisp 4-Petal Sky-Blue Hydrangea (#5CB8FF)
  const f3x = 1.32 * u + sway, f3y = -11.25 * u;
  paint(distinctFlowerPts(f3x, f3y, 1.34 * u, 4, 0.38, 0.92, J * 0.14), {
    wash: CREATOR_COLS.bluePetal, washOp: 255, fill: CREATOR_COLS.blueLt, fillOp: 95, bleed: 0.12,
    ink: PAL.ink, sw: sw * 0.70, curv: 0.45
  });
  paint(ellPts(f3x, f3y, 0.36 * u, 0.34 * u, 10), {
    wash: CREATOR_COLS.whiteCore, washOp: 255, ink: PAL.ink, sw: sw * 0.52
  });

  // 4. TOP-CENTER HERO BLOOM: Sunny Marigold Yellow 6-Petal Blossom (#FFC72C with warm coral-red heart #FF5D3B)
  const f2x = -0.28 * u + sway, f2y = -11.58 * u;
  paint(distinctFlowerPts(f2x, f2y, 1.44 * u, 6, 0.15, 0.88, J * 0.14), {
    wash: CREATOR_COLS.yellowPetal, washOp: 255, fill: CREATOR_COLS.yellowLt, fillOp: 95, bleed: 0.14,
    ink: PAL.ink, sw: sw * 0.72, curv: 0.44
  });
  paint(ellPts(f2x, f2y, 0.42 * u, 0.38 * u, 12), {
    wash: CREATOR_COLS.coralCore, washOp: 255, ink: PAL.ink, sw: sw * 0.54
  });

  // 5. LEFT HERO BLOOM: Large Lush 5-Petal Coral-Rose Peony (#FF7096 with soft inner blush wash & golden center)
  const f1x = -2.05 * u + sway, f1y = -10.85 * u;
  paint(distinctFlowerPts(f1x, f1y, 1.56 * u, 5, -0.22, 0.92, J * 0.15), {
    wash: CREATOR_COLS.pinkPetal, washOp: 255, ink: PAL.ink, sw: sw * 0.74, curv: 0.45
  });
  paint(distinctFlowerPts(f1x + 0.04 * u, f1y - 0.03 * u, 0.98 * u, 5, 0.42, 0.90, J * 0.10), {
    wash: CREATOR_COLS.pinkLt, washOp: 255, ink: null
  });
  paint(ellPts(f1x + 0.03 * u, f1y - 0.02 * u, 0.40 * u, 0.36 * u, 12), {
    wash: CREATOR_COLS.goldCore, washOp: 255, ink: PAL.ink, sw: sw * 0.56
  });
}







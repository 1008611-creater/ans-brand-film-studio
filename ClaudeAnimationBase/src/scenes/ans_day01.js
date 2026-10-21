// ans_day01.js: Richly layered hand-painted p5.js + p5.brush animation for
// "🟢 Day 01 / 28 · ANS (AI Never Stops) 正式上线 (https://ans.cauai.fun)"
// Starring:
//   - creator(x, y, u, o) : "我" (White crew-neck T-shirt 白体恤, head flower cluster 头上一堆花, double-bridge hollow glasses)
//   - dino(x, y, u, o)    : "小恐龙" (Ultra-Kawaii Marshmallow-Plush ANS Mascot #9BE0C5)
(() => {
  // 全片只有一种转场（遮罩式笔刷擦除，见 maskWipe）；旧的 brushWipe/iris/墨点/whip 语言已全部移除。

  // ============================================================================
  // TIMELINE — the ONE place to re-time the film against the real voice-over (±0.5s).
  // SHOT_T0 + FILM_DUR drive the shot list, every shot's length, and (through SHOT_DUR)
  // every action beat inside every shot. BEATS/SPAN hold those beats as FRACTIONS of the
  // shot's own dur, so changing SHOT_T0 can never desync an action from its shot, and
  // every dur-relative effect (brushWipe at dur-0.3, shot 5's iris at dur-0.55, the
  // camera kf curves) stretches along with it. No shot-relative second is hard-coded.
  //   beatAt(dur, .40) → "40% of the way into this shot", in seconds since its start.
  // ============================================================================
  const FILM_DUR = 45.9;                                    // must equal PROJECT.duration (src/config.js)
  // s1..s5 就是口播五幕边界（锁定）；s6 是纯画面新增的落版段（end card），不占口播。
  const SHOT_T0 = { s1: 0.0, s2: 7.027, s3: 14.760, s4: 23.786, s5: 29.143, s6: 43.70 };
  const SHOT_DUR = {
    s1: SHOT_T0.s2 - SHOT_T0.s1,                          //  7.027s 痛点暴击
    s2: SHOT_T0.s3 - SHOT_T0.s2,                          //  7.733s 顶配模型
    s3: SHOT_T0.s4 - SHOT_T0.s3,                          //  9.026s 一键成品
    s4: SHOT_T0.s5 - SHOT_T0.s4,                          //  5.357s 算力福利
    s5: SHOT_T0.s6 - SHOT_T0.s5,                          // 14.557s 28天 Flag：日历缓推+落章 / 插旗 / Full Reset
    s6: FILM_DUR - SHOT_T0.s6                             //  2.200s 落版 end card（D8：加长到 2.2s）
  };
  // 缓动补件（core.js 只有 ease/easeOut/easeIn/backOut/elasticOut）
  const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeInOutQuart = x => { x = clamp(x); return x < .5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2; };
  const easeInOutQuint = x => { x = clamp(x); return x < .5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2; };
  const beatAt = (dur, frac) => dur * frac;               // fraction of this shot → seconds since its start
  // Act5 内部节拍改用「幕内绝对秒」：口播边界与落版段起点都是绝对时间，比例会随 dur 漂移，绝对秒不会。
  const at5 = sec => sec - SHOT_T0.s5;                    // 绝对秒 → Act5 幕内秒
  const T5 = {
    push: at5(29.600),        // 0.457s  日历 20 帧 1.00→1.14 ease-out cubic 缓推起点
    stampTop: at5(30.566),    // 1.423s  落章上抬顶点（其前 3 帧 = 上抬预备，起点 30.441s 紧接缓推到位）
    stamp: at5(30.733),       // 1.590s  落章接触帧 —— hero moment（其后 4 帧 = 砸下，30.566→30.733）
    pullBack: at5(31.350),    // 2.207s  拉回广角起点
    pullBackEnd: at5(32.200), // 3.057s  回到广角
    flagStart: at5(31.900),   // 2.757s  旗杆开始落下
    plant: at5(33.000),       // 3.857s  插旗入地 + 金色爆发
    reset: at5(38.500)        // 9.357s  FULL RESET 警示 + 双主角宣誓
  };
  const STAMP = { x: 184, y: 447, lift: 3 / 24, slam: 4 / 24, flash: 3 / 24, splat: 0.42 };
  // WHEN a beat fires, as a fraction of that shot's own dur.
  const BEATS = {
    s1: { dinoIn: .10, sweep: .40, spark2: .74 },                                  // 入场 / 扫除吃灰 / 二次迸发
    s2: { pull: .22, cheer: .72 },                                                 // 拉满血总闸 / 全员庆祝
    s3: { kick: .06, kickEnd: .21, press: .26, cheer: .80 },                       // 踢线团 / 按按钮 / (卡片连出) / 验收庆祝
    s4: { gift: .20, ticketIn: .03, cheer: .68 }                                   // 算力券飞入 / 券起 / 金币再撒一轮
  };
  // HOW LONG a beat's own action takes, also as a fraction of the same dur.
  const SPAN = {
    s2: { chamberStagger: .04, chamberLight: .12 },
    s3: { cardFly: .05, cardGap: .035, cardSettle: .04, cheerBurst: .12 }
  };
  // ============================================================================
  // 统一转场语言（全片唯一一种）：遮罩式笔刷擦除
  //   笔刷宽 1400px、边缘噪声 ±24px、自左下 30° 扫过、单侧 10 帧 easeInOutQuart。
  //   k=0 全露 → k=1 全遮；上一幕出 k:0→1、下一幕入 k:1→0，切点两侧连续。
  //   遮罩带按帧移位的鬃毛划痕（f = 当前帧号），相邻帧永不重复（D11）。
  // ============================================================================
  const TX = { span: 10 / 24, ang: -30 * Math.PI / 180, half: 1150, noise: 24 };   // half 700→1150：切镜帧全幅盖住，消除整幅 pop
  function maskWipe(k, seedKey) {
    k = clamp(k);
    if (k <= 0.002) return;
    const f = Math.floor(T * 24);
    boilSeed('mask_' + seedKey);
    push();
    translate(W / 2, H / 2);
    rotate(TX.ang);
    translate(-W / 2, -H / 2);
    const X = lerp(-2400, 2400, easeInOutQuart(k));
    const yTop = -900, yBot = H + 900, edge = [];
    for (let y = yTop; y <= yBot; y += 120) {
      const n = (hash(Math.floor(y / 120) * 7.3 + f * 0.37) - 0.5) * 2 * TX.noise
        + Math.sin(y * 0.011 + f * 0.63) * TX.noise * 0.5;
      edge.push([X + n, y]);
    }
    paint([[-2600, yTop]].concat(edge, [[-2600, yBot]]), {
      wash: '#9BE0C5', washOp: 255, fill: '#68B896', fillOp: 70, bleed: 0.12, tex: 0.6, ink: null, curv: 0.35
    });
    for (let i = 0; i < 9; i++) {                       // 前缘鬃毛细舌：强化"刷过去"的方向感
      const yy = yTop + ((i + 0.5) / 9) * (yBot - yTop) + (hash(i * 3.1 + f * 0.7) - 0.5) * 70;
      paint(rectPts(X - 12, yy, 40 + hash(i * 5.7 + f * 0.31) * 130, 10 + hash(i + f * 0.19) * 18, 5),
        { wash: '#9BE0C5', washOp: 235, ink: null });
    }
    pop();
  }
  // ============================================================================
  // 片头（D10）：0–6 帧深墨线 #1E2A33 的 ANS 字标（纸底对比 ≈14:1）→ 6–14 帧薄荷笔刷自下而上
  //   扫过留白 → 14–26 帧画面自右下角有机撕开，露出夜景第一幕。首次可辨识画面 = 第 0 帧。
  // ============================================================================
  const OPEN = { sweep0: 6 / 24, sweep1: 14 / 24, tear0: 14 / 24, tear1: 26 / 24 };
  function openingCard(lt) {
    if (lt >= OPEN.tear1) return;
    flushLetters();                            // 先把本幕场景里的字落到底下，纸底才盖得住
    const tearK = Math.sqrt(easeInOutQuint(seg(lt, OPEN.tear0, OPEN.tear1)));   // √：面积线性增长 → 每帧帧差均匀
    if (tearK < 0.999) {                       // 未撕开区域 = 纸底（有机边缘，右下角留洞）
      const Cx = W + 240, Cy = H + 240, R = 200 + 2500 * tearK;
      const s = Math.sqrt(Math.max(0, R * R - 240 * 240));
      boilSeed('open_tear');
      const poly = [[-340, -340], [W + 340, -340], [W + 340, Cy - s]];
      for (let i = 0; i <= 14; i++) {
        const a = -Math.PI / 2 + (i / 14) * Math.PI / 2;
        const rr = R * (1 + 0.14 * Math.sin(i * 2.1 + 1.3));
        poly.push([Cx + Math.cos(a) * rr, Cy + Math.sin(a) * rr]);
      }
      poly.push([Cx - s, H + 340], [-340, H + 340]);
      paint(poly, { wash: '#FFFDF6', washOp: 255, fill: '#F2E5CE', fillOp: 45, bleed: 0.1, tex: 0.5, ink: null, curv: 0.3 });
    }
    const markA = 1 - seg(lt, OPEN.sweep0, OPEN.sweep0 + 0.10);
    if (markA > 0.02) letter('ANS', 960, 470, 210, '#1E2A33', { screen: true, ink: false, alpha: markA, rot: -0.015 });
    const swK = easeInOutQuart(seg(lt, OPEN.sweep0, OPEN.sweep1));
    if (swK > 0 && swK < 1) {                  // 薄荷笔刷自下而上扫过，把纸面留白
      const yc = lerp(H + 460, -460, swK), yBot = yc + 300, edge = [];
      for (let x = -420; x <= W + 420; x += 130)
        edge.push([x, yc - 300 + (hash(Math.floor(x / 130) * 3.7) - 0.5) * 46 + Math.sin(x * 0.008 + 2) * 16]);
      boilSeed('open_sweep');
      paint([[-420, yBot]].concat(edge, [[W + 420, yBot]]), {
        wash: '#9BE0C5', washOp: 255, fill: '#68B896', fillOp: 60, bleed: 0.14, tex: 0.6, ink: null, curv: 0.4
      });
    }
  }

  // 幕尾/幕首统一调用：出 k 0→1、入 k 1→0（10 帧，两侧在切点连续）
  const wipeOut = (lt, dur) => { if (lt > dur - TX.span) maskWipe((lt - (dur - TX.span)) / TX.span, 'out'); };
  const wipeIn = lt => { if (lt < TX.span) maskWipe(1 - lt / TX.span, 'in'); };

  // ============================================================================
  // HUD（屏幕空间，画在 camEnd 之后 → 永远压住场景里的旗杆等元素，D3）
  //   · 顶部横幅：6 帧自右 easeOutCubic 滑入 → 停 2 帧 → 收到 520×64 左上角标（0.9 不透明度）
  //   · 底部字幕胶囊：逐句进 6 帧 easeOutCubic / 出 4 帧淡出；章节 chip 只在幕首 1.2s
  // ============================================================================
  const HUD = { bw: 1040, bh: 88, bx: 440, by: 48, sw: 520, sh: 64, sx: 64, sy: 48, inF: 6, holdF: 8, shrinkF: 16 };
  function hudBrand(lt, topic) {
    const inK = easeOutCubic(seg(lt, 0, HUD.inF / 24));
    const bgK = easeOutCubic(seg(lt, HUD.holdF / 24, HUD.shrinkF / 24));
    if (inK <= 0.01) return;
    const bw = lerp(HUD.bw, HUD.sw, bgK), bh = lerp(HUD.bh, HUD.sh, bgK);
    const bx = lerp(HUD.bx + 980 * (1 - inK), HUD.sx, bgK), by = lerp(HUD.by, HUD.sy, bgK);
    const a = lerp(1, 0.9, bgK);
    boilSeed('hud_brand');
    paint(rrPts(bx, by, bw, bh, lerp(22, 16, bgK), 1.4), {
      wash: '#2B2233', washOp: 250 * a, fill: PAL.indigo, fillOp: 90 * a, ink: PAL.ink, sw: 1.5 * a
    });
    const cx = bx + bw / 2, cy = by + bh / 2;
    // 宽幅期只放 ≤9 字的幕标题 —— 禁止复述字幕句（上一轮盲审点名的"顶栏与字幕同句重复"）
    const topicA = inK * (1 - seg(bgK, 0.25, 0.7));
    if (topicA > 0.02) letter(topic, cx, cy, 30, DINO_COLS.mint, { alpha: topicA, ink: false });
    // 角标期：品牌锁定 + URL。URL 只在横幅完全落位（inK=1，右端 1480）之后才出现，永不被画框裁切
    const badgeA = seg(bgK, 0.55, 1) * seg(inK, 0.92, 1);
    if (badgeA > 0.02) {
      letter('ANS · AI Never Stops', HUD.sx + HUD.sw / 2, HUD.sy + 22, 24, DINO_COLS.mint, { alpha: badgeA, ink: false });
      letter('ans.cauai.fun', HUD.sx + HUD.sw / 2, HUD.sy + 46, 16, DINO_COLS.mint, { alpha: badgeA * 0.85, ink: false });
    }
  }
  // 文本限宽（复用 letter 的字体度量，超出加省略号；D7-②）
  const _measCtx = document.createElement('canvas').getContext('2d');
  function fitText(txt, size, maxW) {
    _measCtx.font = 'bold ' + size + 'px "Permanent Marker", "ZCOOL KuaiLe", "PingFang SC", cursive, sans-serif';
    if (_measCtx.measureText(txt).width <= maxW) return txt;
    let s = txt;
    while (s.length > 1 && _measCtx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  // D6 场景层缓解：角色外侧同类色湿边渗化（垫在角色之下，不碰角色几何/坐标）
  function wetHalo(x, y, u, col) {
    boilSeed('halo_' + col);                       // 稳定种子：不随位置逐帧重随机
    paint(ellPts(x, y - 4.7 * u, 5.55 * u, 6.35 * u, 22, 2.6), {
      wash: col, washOp: 26, fill: col, fillOp: 20, bleed: 0.62, tex: 0.8, border: 0.9, ink: null
    });
  }
  // Dev guard: SHOT_T0/SHOT_DUR and the two film lengths must agree (change one, not three).
  const shotSum = SHOT_DUR.s1 + SHOT_DUR.s2 + SHOT_DUR.s3 + SHOT_DUR.s4 + SHOT_DUR.s5 + SHOT_DUR.s6;
  if (Math.abs(shotSum - FILM_DUR) > 1e-6 || Math.abs(DUR - FILM_DUR) > 1e-6)
    console.warn('ans_day01: timeline mismatch — SHOT_T0 sums to ' + shotSum.toFixed(2) +
      's, FILM_DUR is ' + FILM_DUR + 's, PROJECT.duration is ' + DUR + 's');

  // 静态种子：给大面积水彩底纹用。它们不参与 boil —— 否则整片空旷区每 3 帧重抖一次，
  // 在 1080p 1:1 下就是"背景乱闪"。线稿/道具仍走 boilSeed，手绘抖动保留。
  const staticSeed = key => {
    let h = 2166136261;
    for (const c of key + '|static') h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    randomSeed(h >>> 0);
  };

  // Sparkle burst helper
  function sparkle(x, y, r, k, col = PAL.cream) {
    if (k <= 0 || k >= 1) return;
    const s = r * backOut(clamp(k * 2.2)) * (1 - k * 0.55);
    paint(starPts(x, y, s, 0.28, 4, k * 1.8), {
      wash: col, washOp: Math.round(255 * (1 - k * k)), ink: PAL.ink, sw: 0.5
    });
  }

  // Hand-painted fluffy cloud helper
  function paintCloud(cx, cy, rx, ry, col = PAL.cream, seedKey = 'c') {
    boilSeed('cloud_' + seedKey);
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      const up = Math.sin(a) < 0;
      const bump = up ? 1 + 0.32 * Math.abs(Math.sin(a * 3)) : 1;
      pts.push([cx + Math.cos(a) * rx * bump, cy + Math.sin(a) * ry * (up ? bump : 0.65)]);
    }
    paint(pts, { wash: col, washOp: 235, ink: PAL.ink, sw: 0.85, curv: 0.35 });
  }

  // Hand-painted potted botanical plant helper
  function paintPlant(x, y, s, t, seedKey = 'p') {
    boilSeed('plant_' + seedKey);
    const sw = wob(t, 0.6, hash(seedKey.length) * 3) * 6 * s;
    // Leaves
    const leaves = [
      [-28, -68, 22, 42, -0.45],
      [0, -82, 24, 48, 0.05],
      [28, -65, 22, 40, 0.48]
    ];
    for (const [lx, ly, rx, ry, rot] of leaves) {
      paint(ellPts(x + lx * s + sw * 0.5, y + ly * s, rx * s, ry * s, 14, 0.8, rot), {
        wash: '#6E9F58', fill: '#3A9C98', fillOp: 70, ink: PAL.ink, sw: 0.9
      });
    }
    // Terracotta pot
    paint([[x - 28 * s, y - 42 * s], [x + 28 * s, y - 42 * s], [x + 22 * s, y], [x - 22 * s, y]], {
      wash: PAL.clay, fill: PAL.clayDk, fillOp: 80, ink: PAL.ink, sw: 1.0
    });
    paint(rrPts(x - 32 * s, y - 50 * s, 64 * s, 12 * s, 4 * s, 0.5), {
      wash: PAL.clayLt, ink: PAL.ink, sw: 0.9
    });
  }

  // Festive hanging string lights across the top of a room/stage
  function paintStringLights(y0, sag, count, t, glowCol = '#FFE066', seedKey = 'lights') {
    boilSeed('str_' + seedKey);
    const P = [];
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const x = lerp(80, W - 80, u);
      const y = y0 + Math.sin(u * Math.PI) * sag;
      P.push([x, y]);
    }
    inkLine(P, 1.1, PAL.ink, 'ink', 0.5);
    for (let i = 1; i < count; i++) {
      const [bx, by] = P[i];
      // 锁在小节（4 拍 = 1.94s）上的慢呼吸。原来是 5 rad/s 自由振荡，在 1080p 下就是"全片乱闪"
      const pulseA = 0.74 + 0.26 * Math.sin(TAU * bpOf(t) / 4 + i * 0.55);
      glow(bx, by + 12, 42, glowCol, 0.5 * pulseA);
      paint(ellPts(bx, by + 12, 9, 12, 10), {
        wash: i % 2 ? glowCol : DINO_COLS.mint, ink: PAL.ink, sw: 0.7
      });
    }
  }

  // Hand-painted floor planks & woven rug
  function paintFloorAndRug(floorY, floorCol, floorDk, rugCol1, rugCol2, seedKey = 'fl') {
    boilSeed('floor_' + seedKey);
    paint(rectPts(-300, floorY, W + 600, H - floorY + 300, 3), {
      wash: floorCol, fill: floorDk, fillOp: 85, bleed: 0.08, tex: 0.5, ink: null
    });
    inkLine([[-300, floorY], [W * 0.5, floorY - 3], [W + 300, floorY + 2]], 1.4, PAL.ink, 'ink', 0.4);
    // Perspective plank lines
    for (let i = -3; i <= 3; i++) {
      const xTop = W / 2 + i * 260, xBot = W / 2 + i * 380;
      inkLine([[xTop, floorY + 2], [xBot, H + 40]], 0.6, mixCol(floorDk, PAL.ink, 0.35), 'inkfine', 0);
    }
    // Cozy woven studio rug under the characters
    boilSeed('rug_' + seedKey);
    paint(ellPts(W / 2, floorY + 26, 480, 44, 28, 1.5), {
      wash: rugCol1, fill: rugCol2, fillOp: 90, ink: PAL.ink, sw: 1.1
    });
    paint(ellPts(W / 2, floorY + 26, 370, 28, 22, 1.0), {
      wash: PAL.cream, ink: PAL.ink, sw: 0.7
    });
  }

  // ============================================================================
  // 字幕（与口播逐字一致）—— 唯一权威来源 audio/day01_timeline.json
  //   · text  = segments[].tts，一字不改、不概括、不加标点（句末标点沿用原文）
  //   · 窗口  = segment.start .. start + voice_dur（= end − start），字幕只在这段里出现
  //   · 子句  = 按 。！？ 与 —— 切分，条内位置用与 Python 侧同款 text_units() 字数权重分配
  //            （音频侧给出 sub_clause_plan 后把 SUBS[].clauses 换成它即可，渲染代码不动）
  // ============================================================================
  function textUnits(s) {
    let u = 0;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c >= 0x4e00 && c <= 0x9fff) u += 1.0;
      else if (c < 128 && /[0-9A-Za-z]/.test(ch)) u += 0.5;
      else if ('。！？'.includes(ch)) u += 3.0;
      else if ('，、；：'.includes(ch)) u += 1.6;
      else u += 0.8;
    }
    return u;
  }
  function clausePlan(text, t0, dur) {
    const parts = [];
    for (const h of text.split(/(?<=[。！？])/)) {
      if (!h.trim()) continue;
      for (const s of h.split(/(?<=——)/)) if (s.trim()) parts.push(s);
    }
    const total = parts.reduce((a, p) => a + textUnits(p), 0);
    let cum = 0;
    return parts.map((p, i) => {
      const st = t0 + dur * (cum / total);
      cum += textUnits(p);
      return { text: p, t0: st, dur: (i === parts.length - 1 ? t0 + dur : t0 + dur * (cum / total)) - st };
    });
  }
  // plan = 音频侧 sub_clause_plan（source=silence，非插值），[起, 止, 文本]；文本与 segments[].tts 同源。
  const SUBS = {
    S1: { t0: 0.25, vdur: 6.327, ch: '第 01 幕', title: '痛点暴击',
      text: '刷了那么多 AI，最后只剩下 99+ 的吃灰收藏夹和一堆聊天记录。别慌，ANS 来了。',
      plan: [[0.250, 5.114, '刷了那么多 AI，最后只剩下 99+ 的吃灰收藏夹和一堆聊天记录。'],
             [5.114, 6.577, '别慌，ANS 来了。']] },
    S2: { t0: 7.477, vdur: 6.833, ch: '第 02 幕', title: '第一件 · 顶配模型',
      text: '第一件，顶配旗舰模型一站直连。GPT-6-Astra、大肥鱼 v4.1、Opus 5.5，全部满血开跑。',
      plan: [[7.477, 9.896, '第一件，顶配旗舰模型一站直连。'],
             [9.896, 14.310, 'GPT-6-Astra、大肥鱼 v4.1、Opus 5.5，全部满血开跑。']] },
    S3: { t0: 15.21, vdur: 8.126, ch: '第 03 幕', title: '第二件 · 一键成品',
      text: '第二件，最快时间上手顶级 AI 项目。不用到处翻教程配环境。全网最火的硬核 AI 玩法，进来就能用最快速度跑通，做出自己的成品。',
      plan: [[15.210, 17.627, '第二件，最快时间上手顶级 AI 项目。'],
             [17.627, 19.316, '不用到处翻教程配环境。'],
             [19.316, 23.336, '全网最火的硬核 AI 玩法，进来就能用最快速度跑通，做出自己的成品。']] },
    S4: { t0: 24.236, vdur: 4.457, ch: '第 04 幕', title: '第三件 · 算力福利',
      text: '第三件，注册即送算力福利。进来就有免费额度，直接开造，不玩套路。',
      plan: [[24.236, 26.180, '第三件，注册即送算力福利。'],
             [26.180, 28.693, '进来就有免费额度，直接开造，不玩套路。']] },
    S5: { t0: 29.593, vdur: 13.801, ch: '第 05 幕', title: '28 天 Flag',
      text: '立个 28 天的 Flag：接下来的 28 天里，每一天我们只做两件事中的一件——要么上线一项对大多数 ANS 用户都清晰有感、真正切中需求的改进，要么直接来一次全员额度重置（Full Reset 认罚发算力）。让改进开始吧。',
      plan: [[29.593, 34.199, '立个 28 天的 Flag：接下来的 28 天里，每一天我们只做两件事中的一件——'],
             [34.199, 42.416, '要么上线一项对大多数 ANS 用户都清晰有感、真正切中需求的改进，要么直接来一次全员额度重置（Full Reset 认罚发算力）。'],
             [42.416, 43.394, '让改进开始吧。']] }
  };
  // 有权威 plan 就用它；将来某段缺 plan 时退回 clausePlan() 的字数权重推算。
  for (const k in SUBS) {
    const S = SUBS[k];
    S.clauses0 = S.plan ? S.plan.map(([a, b, txt]) => ({ text: txt, t0: a, dur: b - a }))
      : clausePlan(S.text, S.t0, S.vdur);
  }
  // 懒加载：字体测量要等字体加载完，故第一次绘制时才做宽度校验。
  // 仍放不下的条按最近的逗号再切一刀，两半在原子句窗内按字数权重分窗（显示窗永远是原子句窗的子集）。
  function clausesOf(subId) {
    const S = SUBS[subId];
    if (S.clauses) return S.clauses;
    const out = [];
    for (const c of S.clauses0) {
      if (capSize(c.text, CAP.size, CAP.maxW) > CAP.minSize) { out.push(c); continue; }
      const cuts = [];
      for (let i = 0; i < c.text.length; i++) if ('，、；'.includes(c.text[i])) cuts.push(i + 1);
      if (!cuts.length) { out.push(c); continue; }
      const mid = c.text.length / 2;
      const cut = cuts.reduce((a, b) => Math.abs(b - mid) < Math.abs(a - mid) ? b : a, cuts[0]);
      const a = c.text.slice(0, cut), b = c.text.slice(cut);
      const ua = textUnits(a), ub = textUnits(b), tot = ua + ub;
      out.push({ text: a, t0: c.t0, dur: c.dur * (ua / tot) });
      out.push({ text: b, t0: c.t0 + c.dur * (ua / tot), dur: c.dur * (ub / tot) });
    }
    S.clauses = out;
    return out;
  }

  // 底部字幕胶囊（屏幕空间，转场之前 flush）
  //   · 整条窗口 = 该幕的段窗口；进 6 帧 easeOutCubic / 出 4 帧淡出
  //   · 长句按子句逐条切换，条间 2 帧交叉淡化；字号按胶囊宽度自适应（24–34px）
  //   · 左侧章节 chip 只在幕首 1.2s 出现，退场后胶囊收窄 264px
  const CAP = { y: 1004, wChip: 1520, wNoChip: 1256, h: 82, chipW: 270, inF: 6, outF: 4, xf: 2,
                chipHold: 1.2, chipOff: 0.22, size: 34, minSize: 22, maxW: 1216 };   // maxW = 无 chip 胶囊内宽
  function capSize(txt, size, maxW) {
    _measCtx.font = 'bold ' + size + 'px "Permanent Marker", "ZCOOL KuaiLe", "PingFang SC", cursive, sans-serif';
    const w = _measCtx.measureText(txt).width;
    return w <= maxW ? size : Math.max(CAP.minSize, Math.floor(size * maxW / w));
  }
  function storyRibbon(subId, t, lt, dur) {
    const S = SUBS[subId];
    const a = easeOutCubic(seg(t, S.t0, S.t0 + CAP.inF / 24))
      * (1 - seg(t, S.t0 + S.vdur - CAP.outF / 24, S.t0 + S.vdur));
    if (a <= 0.004) { flushLetters(); return; }          // 仍然清一次 letter 队列，避免字浮在转场之上
    const CL = clausesOf(subId);
    let ci = 0;                                          // 当前子句
    while (ci + 1 < CL.length && t >= CL[ci + 1].t0) ci++;
    // 子句切换 = 硬切 + 2 帧轻微上移/放大进场（alpha 从切换后第 1 帧就是 1.0）。
    // 任意一帧只有一条字幕可见（重叠 0%）。不采用"P 淡出后再 C 淡入"的顺序淡变：
    // 2 帧淡出在 24fps 采样下的最后一帧 alpha 恰为 0，而淡入首帧也是 0 → 交界处会留一个空帧；
    // 硬切式进场既满足"绝不重叠"，也不会出现空帧或两行叠印。
    const C = CL[ci], xf = CAP.xf / 24;
    const enterK = ci === 0 ? 1 : easeOutCubic(seg(t, C.t0, C.t0 + xf));
    const chipK = 1 - easeOutCubic(seg(lt, CAP.chipHold, CAP.chipHold + CAP.chipOff));
    const rw = lerp(CAP.wNoChip, CAP.wChip, chipK), rh = CAP.h;
    boilSeed('ribbon_' + subId);
    push();
    translate(W / 2, CAP.y);
    scale(0.96 + 0.04 * a, a);
    paint(rrPts(-rw / 2, -rh / 2, rw, rh, 22, 1.8), {
      wash: '#FFFDF6', washOp: 246 * a, fill: '#F2E5CE', fillOp: 70 * a, bleed: 0.08,
      ink: a > 0.02 ? PAL.ink : null, sw: 1.5 * a
    });
    if (chipK > 0.02) paint(rrPts(-CAP.wChip / 2 + 14, -rh / 2 + 12, CAP.chipW, rh - 24, 15, 1.2), {
      wash: DINO_COLS.mint, washOp: 255 * chipK * a, fill: DINO_COLS.mintDk, fillOp: 65 * chipK * a,
      ink: PAL.ink, sw: 1.2 * a
    });
    pop();
    const tx = lerp(W / 2 + 12, W / 2 + 125, chipK);
    // 章节 chip 只放"第 N 幕"，不复述幕标题、更不复述字幕句
    letter(S.ch, W / 2 - CAP.wChip / 2 + 149, CAP.y + 2, 29, PAL.ink, { screen: true, ink: false, alpha: a * chipK });
    // 正文带墨影：中文全角标点（U+FF0C 等）在小字号下墨迹偏细，加墨影后不再被读成半角。
    // 只画当前这一条 —— 结构性保证"任意一帧都不可能出现两条字幕叠加"。
    letter(C.text, tx, CAP.y + 2 + (1 - enterK) * 10, capSize(C.text, CAP.size, CAP.maxW) * (0.986 + 0.014 * enterK),
      PAL.ink, { screen: true, alpha: a });
    flushLetters();
  }

  // ============================================================================
  // SHOT 1 (SHOT_T0.s1 → SHOT_T0.s2, 6.8s): 痛点暴击 — "90% 的人每天都在刷 AI，最后只剩聊天记录和收藏夹吃灰"
  //   节拍① 0.68s 小恐龙入场 → 节拍② 2.72s 扫除吃灰 → 节拍③ 5.03s 二次灵感迸发，
  //   节拍之间用上浮微粒 / 吊灯呼吸 / 窗外晨光 / 摄像缓移保持画面持续运动。
  // ============================================================================
  function drawDustyTower(baseX, baseY, side, t, blastK, idKey) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      boilSeed(`tower_${idKey}_${i}`);
      const w = 225 - i * 8, h = 52;
      const sway = Math.sin(t * 3.2 + i * 0.7 + side) * (4 + i * 3.5);
      const startPos = [baseX + sway + (hash(i * 11 + side) - 0.5) * 22, baseY - (i + 0.5) * (h + 6)];
      const endPos = [baseX + side * (80 + i * 18), baseY - 75 - i * 50];
      const pos = blastK > 0 ? arcPt(startPos, endPos, 80 + i * 14, easeOut(blastK)) : startPos;
      const rot = (hash(i * 7 + side) - 0.5) * 0.14 + (blastK > 0 ? side * blastK * (0.5 + i * 0.1) : sway * 0.004);
      const cols = ['#6D657C', '#867B6E', '#5D5A72', '#7E7468'];
      const c = cols[i % cols.length];
      push();
      translate(pos[0], pos[1]);
      rotate(rot);
      paint(rrPts(-w / 2, -h / 2, w, h, 10, 1.5), {
        wash: c, washOp: 255, fill: '#322C3E', fillOp: 100, bleed: 0.1, tex: 0.6,
        ink: PAL.ink, sw: 1.2
      });
      paint(rectPts(-w * 0.36, -h * 0.18, w * 0.72, h * 0.34, 0.8), {
        wash: '#D8CFC2', washOp: 215, ink: null
      });
      pop();
      if (i === 2) {
        // 限宽 ≤ 底片宽−24px 并加省略（原文字溢出底片右端、被邻卡压住）
        const subTxt = side < 0 ? '📁 AI 教程收藏（未看）' : '💬 历史对话 999+';
        letter(fitText(subTxt, 20, w - 24), pos[0], pos[1], 20, PAL.ink, { rot, ink: false });
      }
      if (i === 6) {
        const labelTxt = fitText(side < 0 ? '★ 99+ 收藏夹吃灰' : '一堆聊天记录吃灰', 26, 276);
        paint(rrPts(pos[0] - 150, pos[1] - 90, 300, 50, 12, 1.2), {
          wash: '#2B2233', ink: PAL.ink, sw: 1.2
        });
        letter(labelTxt, pos[0], pos[1] - 65, 26, PAL.ochre);
      }
    }
  }

  function shot1Bookmarks(t, lt, dur) {            // dur = SHOT_DUR.s1 (7.027s)
    const b = BEATS.s1;
    const tIn = beatAt(dur, b.dinoIn);             // 0.68s 节拍①·小恐龙入场
    const tSweep = beatAt(dur, b.sweep);           // 2.72s 节拍②·扫除吃灰
    const tSpark2 = beatAt(dur, b.spark2);         // 5.03s 节拍③·二次灵感迸发
    // 节拍之间的次级动效：吃灰碎屑化作灵感微粒持续上浮（纯 lt 驱动）
    const motes = [];
    for (let i = 0; i < 7; i++) {
      const k = frac(lt / 3.4 + i / 7);
      motes.push([300 + i * 232 + Math.sin(lt * 0.8 + i * 1.7) * 26, 860 - k * 520, Math.sin(k * Math.PI) * 0.7]);
    }
    const sweepK = seg(lt, tSweep, tSweep + beatAt(dur, .18));
    const shake = lt > tSweep && lt < tSweep + beatAt(dur, .08) ? shakeXY(t, 9 * Math.exp(-(lt - tSweep) * 6)) : [0, 0];
    camBegin(
      // warpT：预备期（屏息窗）摄像时钟被扣住 → 画面连同摄像一起静止
      960 + shake[0] + 12 * Math.sin((warpT(t) - SHOT_T0.s1) * 0.9),
      kf(warpT(t), [[SHOT_T0.s1, 540], [SHOT_T0.s1 + tIn, 532], [SHOT_T0.s1 + tSweep, 522], [SHOT_T0.s1 + tSpark2, 512], [SHOT_T0.s1 + dur, 506]]) + shake[1],
      kf(warpT(t), [[SHOT_T0.s1, 1.00], [SHOT_T0.s1 + tSweep, 1.045], [evOf('spark').t, 1.075], [SHOT_T0.s1 + dur, 1.09]])   // 9% 单调推近
    );

    // Rich Twilight Study Room Background
    staticSeed('shot1_wall');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#282538', ink: null });
    paint(ellPts(W * 0.5, H * 0.42, W * 0.68, H * 0.44, 28, 12), {
      fill: '#3D3758', fillOp: 115, bleed: 0.28, tex: 0.6, ink: null
    });

    // Arched Studio Window on Center-Left Wall (Night Moon → Golden-Mint Dawn!)
    boilSeed('shot1_window');
    const wx = 720, wy = 240, ww = 210, wh = 290;
    paint(rrPts(wx - ww / 2, wy, ww, wh, 95, 1.5), {
      wash: mixCol('#1B2042', '#7CE0C3', sweepK * 0.7),
      fill: sweepK > 0.1 ? '#FFE082' : PAL.indigo, fillOp: 95, ink: PAL.ink, sw: 1.6
    });
    // Crescent moon & stars inside window
    paint(ellPts(wx - 35, wy + 85, 28, 28, 14), { wash: '#FFE899', ink: PAL.ink, sw: 0.8 });
    paint(starPts(wx + 42, wy + 70, 11, 0.38, 4, t), { wash: PAL.cream, ink: null });
    paint(starPts(wx + 25, wy + 135, 9, 0.38, 4, -t), { wash: PAL.cream, ink: null });
    // Window muntin crossbars & sill
    inkLine([[wx, wy + 8], [wx, wy + wh - 6]], 1.4, PAL.ink, 'ink', 0);
    inkLine([[wx - ww / 2 + 6, wy + wh * 0.52], [wx + ww / 2 - 6, wy + wh * 0.52]], 1.4, PAL.ink, 'ink', 0);
    paint(rrPts(wx - ww * 0.58, wy + wh - 8, ww * 1.16, 22, 6, 1.0), { wash: '#5A4A42', ink: PAL.ink, sw: 1.2 });

    // Wooden Bookshelf on Right-Center Wall
    boilSeed('shot1_shelf');
    const sx = 1190, sy = 250, swW = 200, shH = 320;
    paint(rrPts(sx - swW / 2, sy, swW, shH, 10, 1.5), {
      wash: '#4E3E3A', fill: '#332624', fillOp: 95, ink: PAL.ink, sw: 1.4
    });
    for (let r = 0; r < 3; r++) {
      const ry = sy + 95 + r * 95;
      inkLine([[sx - swW / 2 + 8, ry], [sx + swW / 2 - 8, ry]], 1.4, PAL.ink, 'ink', 0);
      const bookCols = [PAL.rose, PAL.ochre, PAL.teal, DINO_COLS.mint, PAL.sky];
      for (let b = 0; b < 5; b++) {
        paint(rrPts(sx - 78 + b * 31, ry - 68, 26, 66, 4, 0.6), {
          wash: bookCols[(r * 2 + b) % bookCols.length], ink: PAL.ink, sw: 0.8
        });
      }
    }

    // Hanging Edison Pendant Lamp in Top Center
    boilSeed('shot1_lamp');
    inkLine([[960, -40], [960, 175]], 1.2, PAL.ink, 'ink', 0);
    paint([[925, 195], [995, 195], [975, 168], [945, 168]], { wash: '#3B4254', ink: PAL.ink, sw: 1.1 });
    glow(960, 215, 180 + 260 * sweepK + 14 * Math.sin(TAU * bpOf(t) / 4), '#FFE082',
      (0.65 + 0.3 * sweepK) * (0.92 + 0.08 * Math.sin(TAU * bpOf(t) / 4)));   // 锁小节（4 拍）
    paint(ellPts(960, 206, 16, 18, 12), { wash: '#FFE885', ink: PAL.ink, sw: 0.9 });

    // Floor, Rug & Potted Plants
    paintFloorAndRug(855, '#383246', '#241F30', '#524868', '#3B9C98', 's1');
    paintPlant(140, 855, 1.05, t, 's1L');
    paintPlant(1780, 855, 1.05, t, 's1R');

    if (sweepK > 0.01) {
      glow(930, 590, 360 + 520 * easeOut(sweepK), DINO_COLS.mint, 0.85 * sweepK);
    }

    // ── 星形粒子层：统一画在道具与角色之下（星点不再压在小恐龙肚皮/道具上）──────────
    const burst2 = seg(lt, tSpark2, tSpark2 + beatAt(dur, .16));
    if (sweepK > 0) {
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI * 0.85 + (i / 8) * Math.PI * 0.7;
        const dist = 150 + 340 * sweepK;
        sparkle(900 + Math.cos(ang) * dist, 600 + Math.sin(ang) * dist * 0.6, 26, sweepK * 0.8, DINO_COLS.mint);
      }
    }
    if (burst2 > 0 && burst2 < 1) {
      for (let i = 0; i < 7; i++) {
        const a2 = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
        sparkle(900 + Math.cos(a2) * (170 + 320 * burst2), 610 + Math.sin(a2) * (200 + 190 * burst2), 22, burst2, PAL.cream);
      }
    }
    const beatK = 0.40 + 0.60 * pulseF(t);                // 拍点提亮（帧对齐）：第 1 幕也有可对照的拍点闪烁
    for (const [mx, my, mk] of motes) sparkle(mx, my, 13, mk * beatK, DINO_COLS.mint);

    // 顶部品牌横幅已移至屏幕空间 HUD（hudBrand），不再画在摄像机里 → 旗杆等场景元素永远压不住它

    // Left and right dusty bookmark towers
    drawDustyTower(430, 855, -1, lt, sweepK, 'L');
    drawDustyTower(1490, 855, 1, lt, sweepK, 'R');

    // Creator ("我") in center: sleepy/buried → startled take → bright idea!
    const myMood = emotions(lt, [
      [0, 'sleepy', { emote: 'cloud' }],
      [beatAt(dur, .10), 'dizzy'],
      [tSweep, 'surprised', { lookX: -0.7 }],
      [tSweep + beatAt(dur, .04), 'idea'],
      [tSpark2, 'excited'],
      [tSpark2 + beatAt(dur, .07), 'starstruck']
    ]);
    wetHalo(1060, 855, 25, '#EFC3AE');
    creator(1060, 855, 25, myMood);

    // ANS Little Dino ("小恐龙") leaps in from left with a glowing mint paintbrush-broom!
    const dinoEnter = easeOut(seg(lt, tIn, tSweep));
    const dinoX = lerp(240, 755, dinoEnter);
    const dinoHop = jump(lt, tIn + beatAt(dur, .025), tSweep + beatAt(dur, .02), 2.6);
    const dinoHop2 = jump(lt, tSpark2, tSpark2 + beatAt(dur, .07), 1.9);      // 节拍③·再蹦一次
    const dinoMood = emotions(lt, [
      [0, 'determined'],
      [tSweep - beatAt(dur, .015), 'excited'],
      [tSweep + beatAt(dur, .10), 'happy'],
      [tSpark2, 'starstruck'],
      [tSpark2 + beatAt(dur, .06), 'excited']
    ]);
    wetHalo(dinoX, 855, 24, DINO_COLS.mint);
    dino(dinoX, 855, 24, {
      ...dinoMood,
      view: lt < tSweep + beatAt(dur, .04) ? 'q' : 'front',
      dy: (dinoMood.dy || 0) + dinoHop.dy + dinoHop2.dy,
      sq: (dinoMood.sq || 0) + dinoHop.sq + dinoHop2.sq,
      aR: lt > tSweep - beatAt(dur, .015) && lt < tSweep + beatAt(dur, .08) ? 0.9 + 0.45 * Math.sin((lt - tSweep) * 14)
        : lt > tSpark2 - beatAt(dur, .02) && lt < tSpark2 + beatAt(dur, .10) ? 0.95 + 0.5 * Math.sin((lt - tSpark2) * 12)
        : 0.7,
      armR: (u, sw) => {
        boilSeed('dino_broom');
        paint(rectPts(0, -0.22 * u, 2.8 * u, 0.44 * u, 0.8), { wash: PAL.ochre, ink: PAL.ink, sw: sw * 0.8 });
        paint(ellPts(3.2 * u, 0, 1.15 * u, 0.85 * u, 16), {
          wash: DINO_COLS.mint, fill: PAL.cream, fillOp: 90, ink: PAL.ink, sw: sw * 0.85
        });
      }
    });

    if (sweepK > 0) sfx('✨ 告别收藏夹吃灰 → ans.cauai.fun', 960, 165, 36, DINO_COLS.mint, lt - tSweep, { life: 1.5, rot: -0.02 });
    if (burst2 > 0 && burst2 < 1) sfx('💡 灵感来了 · 现在就开造', 960, 168, 34, PAL.ochre, lt - tSpark2, { life: 1.6, rot: 0.02 });

  stageLayer(1, t);                           // 第六轮 · 99+ 堆积 / 桌面清空 / ANS 字标落地
    camEnd();

    openingCard(lt);                                    // D10 片头：深墨字标 → 薄荷扫过 → 右下角撕开
    hudBrand(lt, SUBS.S1.title);
    storyRibbon('S1', t, lt, dur);
    wipeOut(lt, dur);                                   // 统一转场：遮罩式笔刷擦除
  }

  // ============================================================================
  // SHOT 2 (SHOT_T0.s2 → SHOT_T0.s3, 5.6s): 第一件事 — "顶配模型直接爽玩：GPT-6-Astra · 大肥鱼 v4.1 · Opus 5.5"
  //   节拍① 1.23s 拉下 MAX 满血总闸（三舱错峰点亮）→ 节拍② 4.03s 全员欢呼，
  //   节拍之间电缆电流持续流动 + 三舱能量脉冲星点 + 培养舱核心自转。
  // ============================================================================
  function drawFlagshipChamber(cx, cy, title, badge, accentCol, activeK, idx, t) {
    boilSeed('chamber_' + idx);
    const w = 320, h = 355;
    const bounce = activeK > 0 ? spring(activeK, 0.05, 5, 16) * 12 : 0;
    const y0 = cy - h + bounce;

    if (activeK > 0.05) {
      glow(cx, cy - h * 0.55, 220 * activeK + 12 * Math.sin(t * 3 + idx), accentCol,
        0.85 * activeK * (0.85 + 0.15 * Math.sin(t * 2.6 + idx)));
    }

    paint(rrPts(cx - w / 2, y0, w, h, 34, 2.0), {
      wash: activeK > 0.1 ? mixCol('#FFFDF6', accentCol, 0.25 * activeK) : '#EAE2D3',
      washOp: 248,
      fill: activeK > 0.1 ? accentCol : '#C9BFA8',
      fillOp: activeK > 0.1 ? 120 : 65,
      bleed: 0.18, tex: 0.55, ink: PAL.ink, sw: 1.5
    });

    paint(rrPts(cx - w * 0.36, y0 - 24, w * 0.72, 28, 10, 1.2), {
      wash: '#3B4254', ink: PAL.ink, sw: 1.2
    });
    paint(ellPts(cx, y0 - 40, 16, 16, 12), {
      wash: activeK > 0.2 ? accentCol : '#8A8E9E', ink: PAL.ink, sw: 1.0
    });

    const coreR = (50 + 12 * activeK) * (1 + 0.06 * Math.sin(TAU * bpOf(t) / 2 + idx));   // 锁 2 拍，原 t*10 自由振荡
    paint(starPts(cx, y0 + 112, coreR, 0.45, 5, t * (activeK > 0.2 ? 2.5 : 0.3)), {
      wash: activeK > 0.2 ? PAL.cream : '#B8B0A0',
      fill: accentCol, fillOp: 130 * activeK, ink: PAL.ink, sw: 1.2
    });

    paint(rrPts(cx - 110, y0 + 192, 220, 26, 10, 1.0), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.0
    });
    const fillW = Math.max(24, 212 * easeOut(activeK));
    paint(rrPts(cx - 106, y0 + 196, fillW, 18, 8, 0.8), {
      wash: activeK > 0.1 ? accentCol : '#7A7485', ink: null
    });

    paint(rrPts(cx - w * 0.54, cy - 66 + bounce, w * 1.08, 66, 14, 1.5), {
      wash: '#2F3648', fill: PAL.ink, fillOp: 80, ink: PAL.ink, sw: 1.4
    });

    letter(title, cx, cy - 33 + bounce, 29, PAL.cream);
    letter(activeK > 0.3 ? `⚡ ${badge} · 满血 100%` : badge, cx, y0 + 254, 23, PAL.ink, { ink: false });

    if (activeK > 0.15 && activeK < 0.95) {
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k - 1.5) * 0.65;
        sparkle(cx + Math.cos(a) * 165 * activeK, y0 + 100 + Math.sin(a) * 115 * activeK, 20, activeK, accentCol);
      }
    }
  }

  function shot2Models(t, lt, dur) {              // dur = SHOT_DUR.s2 (7.733s)
    const b = BEATS.s2, sp = SPAN.s2;
    const tPull = beatAt(dur, b.pull);             // 1.23s 节拍①·拉下 MAX 满血总闸
    const tCheer = beatAt(dur, b.cheer);           // 4.03s 节拍②·全员欢呼
    const shake = lt > tPull && lt < tPull + beatAt(dur, .09) ? shakeXY(t, 7 * Math.exp(-(lt - tPull) * 6)) : [0, 0];
    camBegin(
      960 + shake[0] + 12 * Math.sin((warpT(t) - SHOT_T0.s2) * 0.7),
      kf(warpT(t), [[SHOT_T0.s2, 535], [SHOT_T0.s2 + tPull, 520], [SHOT_T0.s2 + tCheer, 512], [SHOT_T0.s2 + dur, 506]]) + shake[1],
      kf(warpT(t), [[SHOT_T0.s2, 1.00], [SHOT_T0.s2 + tPull + beatAt(dur, .05), 1.04], [evOf('card2').t, 1.075], [SHOT_T0.s2 + dur, 1.10]])   // 10% 单调推近
    );

    // Rich Inventor Workshop Environment
    staticSeed('shot2_bg');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#F6EFE0', ink: null });
    // Soft architectural wainscot wall & skylight clouds
    paint(ellPts(W * 0.5, 220, 820, 210, 28, 10), {
      fill: '#BFE8F5', fillOp: 110, bleed: 0.28, tex: 0.55, ink: null
    });
    paintCloud(260 + Math.sin(t * 0.4) * 20, 175, 110, 42, '#FFFFFF', 's2c1');
    paintCloud(1660 - Math.sin(t * 0.4) * 20, 165, 120, 45, '#FFFFFF', 's2c2');
    // Wainscot wooden lower wall panel
    boilSeed('shot2_wainscot');
    paint(rectPts(-200, 620, W + 400, 245, 2), {
      wash: '#E5D8C1', fill: '#CBB898', fillOp: 70, ink: PAL.ink, sw: 1.1
    });
    paintFloorAndRug(865, '#D8C5A8', '#B89F7D', '#68B896', '#3A9C98', 's2');
    paintStringLights(95, 55, 10, t, '#FFE066', 's2');
    paintPlant(135, 865, 1.1, t, 's2L');
    paintPlant(1785, 865, 1.1, t, 's2R');

    // Braided Power Cables connecting Master Switch to the 3 Chambers
    boilSeed('shot2_cables');
    inkLine([[960, 840], [640, 740], [420, 575]], 2.2, '#2B2233', 'ink', 0.5);
    inkLine([[960, 840], [960, 575]], 2.2, '#2B2233', 'ink', 0.3);
    inkLine([[960, 840], [1280, 740], [1500, 575]], 2.2, '#2B2233', 'ink', 0.5);

    // 顶部横幅 → 屏幕空间 HUD

    // Three Flagship Model Chambers
    const cStagger = beatAt(dur, sp.chamberStagger), cLight = beatAt(dur, sp.chamberLight);
    const k1 = seg(lt, tPull, tPull + cLight);
    const k2 = seg(lt, tPull + cStagger, tPull + cStagger + cLight);
    const k3 = seg(lt, tPull + 2 * cStagger, tPull + 2 * cStagger + cLight);
    // ── 星形粒子层：画在培养舱之下（星点不再压在舱体上）──────────────────────
    if (lt > tPull + cLight) {
      const acc = ['#56B4E9', '#E8AA38', '#E27A92'];
      for (let i = 0; i < 3; i++) {
        const pk = pulseF(t);                                     // 帧对齐拍点：同拍同闪，非拍点不闪
        const age = 0.28 + 0.66 * (1 - pk) + 0.03 * i;            // 上限 0.97 + 逐颗粒 0.03 错峰：峰值仍在拍点帧
        sparkle(420 + i * 540 + (hash(i * 7) - 0.5) * 40, 470 + (hash(i * 13) - 0.5) * 30, 24, age, acc[i]);
      }
    }

    drawFlagshipChamber(420, 575, 'GPT-6-Astra', '旗舰推理王', '#56B4E9', k1, 0, t);
    drawFlagshipChamber(960, 575, '大肥鱼 v4.1-1017', '中文与创意王', '#E8AA38', k2, 1, t);
    drawFlagshipChamber(1500, 575, 'Opus 5.5', '全栈工程王', '#E27A92', k3, 2, t);

    // 次级动效：总闸拉下后电流沿三根电缆持续流动。端点用 sin 淡入淡出 ——
    // 电缆起点 (960,840) 紧邻 MAX 总闸，端点残留会变成"拉杆旁的游离青点"，故 q→0 时不可见。
    const flowA = seg(lt, tPull, tPull + beatAt(dur, .15));
    if (flowA > 0) {
      const cables = [[[960, 840], [640, 740], [420, 575]], [[960, 840], [960, 575]], [[960, 840], [1280, 740], [1500, 575]]];
      for (let i = 0; i < 3; i++) {
        const P = cables[i], fk = frac(t * 0.5 + i / 3) * (P.length - 1);
        const si = Math.min(P.length - 2, Math.floor(fk)), uk = fk - si;
        const q = Math.sin(Math.PI * fk);
        if (q <= 0.03) continue;
        const dx2 = lerp(P[si][0], P[si + 1][0], uk), dy2 = lerp(P[si][1], P[si + 1][1], uk);
        glow(dx2, dy2, 46 * q, DINO_COLS.mint, 0.7 * flowA * q);
        paint(ellPts(dx2, dy2, 7 * q, 7 * q, 10), { wash: DINO_COLS.mint, ink: null });
      }
    }

    // Foreground Master Power Switch
    boilSeed('master_switch');
    const swX = 960, swY = 865;
    const leverAng = lerp(-0.55, 0.55, backOut(seg(lt, tPull - beatAt(dur, .025), tPull + beatAt(dur, .045))));
    push();
    translate(swX, swY - 25);
    rotate(leverAng);
    paint(rectPts(-9, -95, 18, 95, 1.0), { wash: '#3B4254', ink: PAL.ink, sw: 1.2 });
    paint(ellPts(0, -105, 28, 28, 16), { wash: '#E23E36', fill: PAL.ochre, fillOp: 80, ink: PAL.ink, sw: 1.3 });
    pop();
    paint(rrPts(swX - 85, swY - 46, 170, 52, 14, 1.2), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 80, ink: PAL.ink, sw: 1.3
    });
    letter('MAX 满血总闸', swX, swY - 20, 22, PAL.ink, { ink: false });

    // Creator ("我") on left-center pulling the lever & cheering
    const myHop = jump(lt, tPull - beatAt(dur, .025), tPull + beatAt(dur, .06), 2.0);
    const myHop2 = jump(lt, tCheer, tCheer + beatAt(dur, .07), 1.8);          // 节拍②·再欢呼一次
    const myMood = emotions(lt, [
      [0, 'determined'],
      [tPull + beatAt(dur, .02), 'excited'],
      [tPull + beatAt(dur, .20), 'happy'],
      [tCheer, 'starstruck'],
      [tCheer + beatAt(dur, .07), 'excited']
    ]);
    wetHalo(670, 868, 22, '#EFC3AE');
    creator(670, 868, 22, {
      ...myMood,
      dy: (myMood.dy || 0) + myHop.dy + myHop2.dy,
      sq: (myMood.sq || 0) + myHop.sq + myHop2.sq,
      aL: lt > tCheer ? 1.3 + 0.4 * Math.sin(t * 7) : lt > tPull ? 1.3 : 0.8,   // 双臂镜像同姿
      aR: lt > tCheer ? 1.3 + 0.4 * Math.sin(t * 7) : lt > tPull ? 1.3 : 0.8
    });

    // Little Dino ("小恐龙") on right-center cheering with starstruck eyes!
    const dinoHop = jump(lt, tPull, tPull + beatAt(dur, .09), 2.4);
    const dinoHop2 = jump(lt, tCheer, tCheer + beatAt(dur, .07), 2.0);        // 节拍②·再蹦一次
    const dinoMood = emotions(lt, [
      [0, 'happy'],
      [tPull + beatAt(dur, .03), 'starstruck'],
      [tPull + beatAt(dur, .21), 'excited'],
      [tCheer, 'love'],
      [tCheer + beatAt(dur, .08), 'starstruck']
    ]);
    wetHalo(1250, 868, 22, DINO_COLS.mint);
    dino(1250, 868, 22, {
      ...dinoMood,
      flip: true,
      dy: (dinoMood.dy || 0) + dinoHop.dy + dinoHop2.dy,
      sq: (dinoMood.sq || 0) + dinoHop.sq + dinoHop2.sq
    });

  stageLayer(2, t);                           // 第六轮 · 三卡逐张点亮 + ONLINE 横幅 + 总闸
    camEnd();
    flushLetters();                                     // 场景字先落定，再盖入场遮罩
    wipeIn(lt);                                         // 统一转场：上一幕的擦除在本幕头 10 帧收走
    hudBrand(lt, SUBS.S2.title);
    storyRibbon('S2', t, lt, dur);
    wipeOut(lt, dur);
  }

  // ============================================================================
  // SHOT 3 (SHOT_T0.s3 → SHOT_T0.s4, 12.4s): 第二件事 — "最快时间上手顶级 AI 项目，免翻教程配环境，直接出成品"
  //   长幕 4 节拍：① 0.74s 踢飞 ✗配环境线团 → ② 3.22s 按下「ANS 一键跑通」→ ③ 3.53s 起三张成品卡依次出膛
  //   → ④ 9.92s 成品验收庆祝；节拍之间卡片持续轻浮、出料口余温火花、能量脉冲、摄像缓推。
  // ============================================================================
  function drawProjectCard(x, y, title, sub, col, popK, rot, t = 0) {
    if (popK <= 0.02) return;
    boilSeed('proj_' + title);
    const s = backOut(popK);
    push();
    translate(x, y);
    rotate(rot);
    scale(s);
    glow(0, 0, 140 + 16 * Math.sin(t * 2.4), col, 0.55 * popK * (0.9 + 0.1 * Math.sin(t * 3.1)));
    paint(rrPts(-160, -105, 320, 210, 20, 1.8), {
      wash: '#FFFDF7', washOp: 252, fill: col, fillOp: 55, bleed: 0.12,
      ink: PAL.ink, sw: 1.5
    });
    paint(rrPts(-142, -88, 284, 42, 10, 1.0), {
      wash: col, washOp: 255, ink: PAL.ink, sw: 1.0
    });
    paint(starPts(-98, 18, 34, 0.45, 5, 0.2), {
      wash: PAL.ochre, fill: PAL.cream, fillOp: 80, ink: PAL.ink, sw: 0.9
    });
    paint(rrPts(-45, -8, 175, 52, 10, 0.8), {
      wash: '#2B2233', ink: PAL.ink, sw: 0.9
    });
    pop();
    // 文字与卡体同一帧出现、同一 pop 曲线放大：卡体成形时文字必在场（不再有空白粉条/黑标签）
    if (popK > 0.02) {
      letter(title, x, y - 66, 26, PAL.ink, { rot, ink: false, pop: popK });
      letter(sub, x + 42, y + 18, 24, DINO_COLS.mint, { rot, pop: popK });
      letter('✓ 成品已生成', x, y + 72, 22, PAL.sap, { rot, ink: false, pop: popK });
    }
  }

  function shot3Projects(t, lt, dur) {           // dur = SHOT_DUR.s3 (9.026s)
    const b = BEATS.s3, sp = SPAN.s3;
    const tKick = beatAt(dur, b.kick), tKickEnd = beatAt(dur, b.kickEnd);   // 0.74→2.60s 节拍①·踢飞报错线团
    const tPress = beatAt(dur, b.press);                                   // 3.22s 节拍②·按下 ANS 一键跑通
    const cardFly = beatAt(dur, sp.cardFly), cardGap = beatAt(dur, sp.cardGap);
    const card0 = tPress + beatAt(dur, .025);                              // 3.53s 节拍③·第一张成品卡出膛
    const tCard3 = card0 + 2 * cardGap + cardFly;                          // 5.01s 三张全部落位
    const tCheer = beatAt(dur, b.cheer);                                   // 9.92s 节拍④·成品验收庆祝
    const shake = lt > tPress && lt < tPress + beatAt(dur, .03) ? shakeXY(t, 7 * Math.exp(-(lt - tPress) * 6)) : [0, 0];
    const bgDx = 38 * ease(seg(lt, beatAt(dur, .08), beatAt(dur, .92)));      // 背景层 2% 水平视差漂移
    camBegin(
      960 + shake[0] + 12 * Math.sin((warpT(t) - SHOT_T0.s3) * 0.75),
      kf(warpT(t), [[SHOT_T0.s3, 535], [SHOT_T0.s3 + tKick, 530], [SHOT_T0.s3 + tPress, 524], [SHOT_T0.s3 + tCard3, 508], [SHOT_T0.s3 + tCheer, 502], [SHOT_T0.s3 + dur, 512]]) + shake[1],
      kf(warpT(t), [[SHOT_T0.s3, 1.02], [SHOT_T0.s3 + tPress + beatAt(dur, .02), 1.055], [evOf('lay3').t, 1.095], [SHOT_T0.s3 + dur, 1.11]])   // 第三层落下时推近
    );
    push(); translate(bgDx, 0);                                               // 背景层（墙/窗/洞洞板）独立视差

    // Rich Sunlit Art Studio with Panoramic Window & Pegboard Wall
    staticSeed('shot3_bg');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#F5EDE0', ink: null });
    // Arched studio window on left-center showing blue sky & green hills outside
    paint(rrPts(420, 155, 380, 340, 40, 1.5), {
      wash: '#B8E3F8', fill: PAL.sky, fillOp: 90, ink: PAL.ink, sw: 1.5
    });
    paint(ellPts(610, 495, 210, 95, 22, 1.5), { wash: '#78B86A', ink: PAL.ink, sw: 1.0 });
    paintCloud(540 + Math.sin(t * 0.32) * 30, 240 + Math.sin(t * 0.21) * 8, 75, 28, '#FFFFFF', 's3w');
    inkLine([[610, 160], [610, 490]], 1.4, PAL.ink, 'ink', 0);
    inkLine([[425, 325], [795, 325]], 1.4, PAL.ink, 'ink', 0);

    // Wooden Pegboard on Right-Center Wall
    boilSeed('shot3_pegboard');
    paint(rrPts(920, 175, 420, 260, 16, 1.5), {
      wash: '#E2CFAF', fill: '#C8B08A', fillOp: 80, ink: PAL.ink, sw: 1.3
    });
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        paint(ellPts(965 + c * 64, 215 + r * 72, 5, 5, 8), { wash: PAL.ink, ink: null });
      }
    }

    pop();                                                                    // 背景层视差结束（地面/前景不动）

    paintFloorAndRug(865, '#D8C5A8', '#B89F7D', '#E8AA38', '#E27A92', 's3');
    paintStringLights(90, 50, 10, t, '#9BE0C5', 's3');
    paintPlant(1790, 865, 1.15, t, 's3R');

    // 顶部横幅 → 屏幕空间 HUD

    // Left: Tangled "✗ 配环境报错" wire monster kicked into the left corner!
    boilSeed('wire_monster');
    const kickK = easeOut(seg(lt, tKick, tKickEnd));
    const wx = lerp(310, 175, kickK), wy = lerp(680, 470, kickK) - 70 * Math.sin(kickK * Math.PI);
    push();
    translate(wx, wy);
    rotate(-kickK * 0.45);
    paint(ellPts(0, 0, 115, 88, 22, 5), {
      wash: '#6C667A', fill: '#3B3548', fillOp: 120, ink: PAL.ink, sw: 1.3
    });
    for (let i = 0; i < 6; i++) {
      inkLine([[-75 + i * 24, -45], [20 - i * 16, 55], [65 - i * 20, -25]], 1.4, PAL.ink, 'ink', 0.7);
    }
    pop();
    paint(rrPts(wx - 115, wy - 135, 230, 46, 10, 1.0), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.1
    });
    letter('✗ 免翻教程配环境', wx, wy - 112, 23, '#FF6B6B');
    // 节拍①的次级动效：踢飞瞬间扬起的灰尘碎屑
    const dustK = seg(lt, tKick + beatAt(dur, .03), tKick + beatAt(dur, .17));
    if (dustK > 0 && dustK < 1) {
      for (let i = 0; i < 6; i++) {
        const a2 = -Math.PI * 0.15 - (i / 5) * Math.PI * 0.7;
        sparkle(wx + Math.cos(a2) * (60 + 190 * dustK), wy + 40 + Math.sin(a2) * (40 + 90 * dustK), 18, dustK, '#C9BFA8');
      }
    }

    // Center: Hand-painted "ANS 一键造物机"
    boilSeed('maker_machine');
    const mX = 790, mY = 865;
    const mSq = spring(lt, tPress, 6, 18) * 0.14 + 0.012 * Math.sin(t * 1.7);   // 含待机呼吸（次级动效）
    push();
    translate(mX, mY);
    scale(1 + mSq, 1 - mSq);
    paint(rrPts(-170, -250, 340, 250, 28, 2.0), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 95, bleed: 0.12, tex: 0.55,
      ink: PAL.ink, sw: 1.6
    });
    paint(rrPts(-125, -205, 250, 115, 16, 1.2), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.3
    });
    const btnDrop = lt > tPress ? 22 * easeOut(seg(lt, tPress, tPress + beatAt(dur, .012))) * (1 - 0.5 * seg(lt, tPress + beatAt(dur, .016), tPress + beatAt(dur, .05))) : 0;
    paint(rectPts(-35, -285 + btnDrop, 70, 40, 1.0), { wash: '#3B4254', ink: PAL.ink, sw: 1.2 });
    paint(ellPts(0, -295 + btnDrop, 72, 28, 20), {
      wash: '#E23E36', fill: PAL.ochre, fillOp: 85, ink: PAL.ink, sw: 1.4
    });
    paint([[165, -180], [235, -215], [235, -95], [165, -130]], {
      wash: PAL.ochre, fill: '#C88520', fillOp: 85, ink: PAL.ink, sw: 1.4
    });
    pop();
    letter('ANS 一键跑通', mX, mY - 148, 30, DINO_COLS.mint);
    letter('最快出自己成品', mX, mY - 52, 24, PAL.ink, { ink: false });

    // Three Finished Project Cards popping out of the chute on arcs!（节拍③）
    const chute = [mX + 220, mY - 155];
    const cards = [
      { title: '3D 个人作品集', sub: '一键同款上线', col: '#9BE0C5', target: [1260, 290], t0: card0, rot: -0.04 },
      { title: '4K 漫剧与视频', sub: '分镜直出成片', col: '#FFE082', target: [1610, 460], t0: card0 + cardGap, rot: 0.05 },
      { title: 'CAUAI 无限画布', sub: '多节点工作流', col: '#F4A6B8', target: [1345, 650], t0: card0 + 2 * cardGap, rot: -0.03 }
    ];
    const cardSettle = beatAt(dur, sp.cardSettle);
    // ── 星形粒子层：画在成品卡与角色之下（星点不再压在卡面/角色身上）────────────
    glow(chute[0], chute[1], 96 + 30 * Math.sin(t * 2.6), DINO_COLS.mint, 0.3 + 0.22 * Math.sin(t * 2.6));
    if (lt > tCard3) {
      for (let i = 0; i < 3; i++) {
        const pk = pulseF(t), age = 0.28 + 0.66 * (1 - pk) + 0.03 * i, [tx2, ty2] = cards[i].target;   // 峰值仍在拍点帧
        sparkle(tx2 + (hash(i) - 0.5) * 120, ty2 - 118 + (hash(i + 5) - 0.5) * 60, 22, age, cards[i].col);
      }
    }
    const cheerK = seg(lt, tCheer, tCheer + beatAt(dur, sp.cheerBurst));
    if (cheerK > 0 && cheerK < 1) {
      for (let i = 0; i < 3; i++) {
        const [tx2, ty2] = cards[i].target;
        for (let k2 = 0; k2 < 4; k2++) {
          const a2 = -Math.PI / 2 + (k2 - 1.5) * 0.62;
          sparkle(tx2 + Math.cos(a2) * (205 + 135 * cheerK), ty2 + Math.sin(a2) * (155 + 115 * cheerK), 24, cheerK, cards[i].col);
        }
      }
    }

    for (let ci = 0; ci < cards.length; ci++) {
      const c = cards[ci];
      const fk = easeOut(seg(lt, c.t0, c.t0 + cardFly));
      if (fk > 0) {
        const settled = seg(lt, c.t0 + cardFly, c.t0 + cardFly + cardSettle);
        const bob = settled * 8 * Math.sin(t * 1.7 + ci * 1.9);            // 落位后持续轻浮（次级动效）
        const wob = settled * 0.03 * Math.sin(t * 1.2 + ci * 2.3);
        const pt = arcPt(chute, c.target, 140, fk);
        drawProjectCard(pt[0], pt[1] + bob, c.title, c.sub, c.col, fk, c.rot + wob, t);
      }
    }
    // 节拍④的星芒已在卡片之下绘制（见上），此处只保留文字层

    // Little Dino ("小恐龙") on left celebrating
    wetHalo(345, 865, 23, DINO_COLS.mint);
    dino(345, 865, 23, {
      ...emotions(lt, [[0, 'determined'], [tPress, 'excited'], [tPress + beatAt(dur, .06), 'happy'],
        [tCheer, 'starstruck'], [tCheer + beatAt(dur, .12), 'excited']]),
      aR: lt > tCheer - beatAt(dur, .02) && lt < tCheer + beatAt(dur, .3) ? 1.25 + 0.35 * Math.sin((lt - tCheer) * 9) : 1.25
    });

    // Creator ("我") beside the machine pressing the button & cheering
    const myJump = jump(lt, tPress - beatAt(dur, .01), tPress + beatAt(dur, .03), 2.2);
    const myJump2 = jump(lt, tCheer, tCheer + beatAt(dur, .06), 2.0);          // 节拍④·验收庆祝再跳一次
    const myMood = emotions(lt, [[0, 'idea'], [tPress, 'excited'], [tPress + beatAt(dur, .065), 'happy'],
      [tCheer - beatAt(dur, .02), 'surprised'], [tCheer + beatAt(dur, .04), 'laugh'], [tCheer + beatAt(dur, .16), 'excited']]);
    wetHalo(565, 865, 23, '#EFC3AE');
    creator(565, 865, 23, {
      ...myMood,
      dy: (myMood.dy || 0) + myJump.dy + myJump2.dy,
      sq: (myMood.sq || 0) + myJump.sq + myJump2.sq,
      aL: lt > tPress - beatAt(dur, .01) && lt < tPress + beatAt(dur, .03) ? 1.45
        : lt > tCheer ? 1.35 + 0.3 * Math.sin(t * 8) : 1.05,                  // 双臂镜像同姿
      aR: lt > tPress - beatAt(dur, .01) && lt < tPress + beatAt(dur, .03) ? 1.45
        : lt > tCheer ? 1.35 + 0.3 * Math.sin(t * 8) : 1.05
    });

  stageLayer(3, t);                           // 第六轮 · 教程塔逐层拆解 / 成品 / 展示
    camEnd();
    flushLetters();                                     // 场景字先落定，再盖入场遮罩
    wipeIn(lt);                                         // 统一转场：遮罩式笔刷擦除（10 帧 easeInOutQuart）
    hudBrand(lt, SUBS.S3.title);
    storyRibbon('S3', t, lt, dur);
    wipeOut(lt, dur);
  }

  // ============================================================================
  // SHOT 4 (SHOT_T0.s4 → SHOT_T0.s5 = 23.786 → 29.143, 5.357s) · R12 因果动作链
  //   584 礼物舱落到台面 → 608 舱盖打开·算力券飘出（全片唯一焦点物）→
  //   631 盖章「已到账」→ 654 券喂进右侧算力机槽口·槽口亮起 → 677 计数器 100→1000 + 小恐龙欢呼
  //   构图红线（第一优先，高于任何指标）：
  //     ① 主体永不被裁切：道具/角色全部完整落在画幅内，安全边 ≥64px；
  //     ② 两个角色始终可见：主理人 x≈400（左）· 小恐龙 x≈1360（右），不被任何道具遮挡；
  //     ③ 每帧只有一个焦点物，焦点物宽度 ≤ 35% 画幅（算力券 490px = 25.5%）；
  //     ④ 镜头 zoom 1.000–1.020（含单帧冲击 + EV 冲击叠加），绝不推近到裁切；
  //     ⑤ 禁止全幅色块 / 跑马灯 / 未裁切残留 / 单帧白闪。
  //   舞台坐标（zoom=1.00 时世界坐标 = 屏幕坐标）：
  //     主理人 400 · 台座/礼物舱/算力券 870 · 小恐龙 1360 · 算力机 1592..1822
  // ============================================================================
  const S4 = {
    landF: 584, openF: 608, stampF: 631, feedF: 654, countF: 677,
    land: 584 / 24, open: 608 / 24, stamp: 631 / 24, feed: 654 / 24, count: 677 / 24,
    cx: 870, plinthTop: 800, floorY: 865,
    creatorX: 400, dinoX: 1360,
    // 算力机右缘必须留 ≥64px 安全边：zoom 1.026（含 EV 冲击）时右缘 1822 → 屏幕 1853（67px）
    mx: 1598, my: 380, mw: 210, mh: 480,
    tw: 490, th: 250, ty: 430, slotY: 445
  };
  // 帧精确爆发冲击：只在这五帧给整层世界一记单帧位移（下一帧 34% 衰减）。
  // EV 的 joltAt 落在 124BPM 拍网格上（与爆发帧差 ±0.5 帧），这里补一记正好踩在爆发帧上的冲击。
  function s4Kick(t) {
    const f = Math.round(t * 24);
    let dx = 0, dy = 0, z = 1;
    for (const f0 of [S4.landF, S4.openF, S4.stampF, S4.feedF, S4.countF]) {
      const d = f - f0;
      if (d < 0 || d > 1) continue;
      const a = d === 0 ? 1 : 0.34;
      dx += 7 * a * Math.sin(f0 * 1.7);
      dy += 6 * a * Math.cos(f0 * 2.3);
      z += 0.014 * a;
    }
    return { dx, dy, zoom: z };
  }
  // 单记冲击环（≤8 帧）：14 个手绘墨点沿椭圆外扩 —— 只在道具局部，绝不横扫全幅
  function s4Ring(t, f, x, y, R, col, life = 7, flat = 0.42) {
    const a = (t - f / 24) * 24;
    if (a < 0 || a > life) return;
    const k = 1 - a / life, rk = easeOut(1 - k);
    boilSeed('s4ring_' + f);
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * TAU + 0.21, rr = R * (0.42 + 0.78 * rk);
      paint(ellPts(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * flat, 13 + 11 * k, 8 + 6 * k, 10, 1.6),
        { wash: col, washOp: 205 * k, ink: null });
    }
  }

  function shot4Credits(t, lt, dur) {
    const kk = s4Kick(t);
    const pushK = ease(clamp(lt / dur));
    camBegin(960 + kk.dx, 540 - 8 * pushK + kk.dy, (1.000 + 0.006 * pushK) * kk.zoom);

    // ── 背景（降饱和 / 降对比：全部压成背景层，不与焦点物抢）──
    staticSeed('shot4_sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#DDF2FA', ink: null });
    paint(ellPts(870, 470, 760, 400, 30, 12), { fill: '#FFE8A3', fillOp: 84, bleed: 0.3, tex: 0.55, ink: null });
    const cw = warpT(t) * 0.22;
    paintCloud(250 + Math.sin(cw) * 22, 205, 128, 46, '#FFFDF7', 's4c1');
    paintCloud(1690 - Math.sin(cw) * 22, 190, 138, 50, '#FFFDF7', 's4c2');
    paintCloud(520, 330, 92, 34, '#FFFDF7', 's4c3');
    staticSeed('shot4_hills');
    paint(ellPts(380, 930, 720, 230, 36, 2), { wash: '#88C978', fill: '#5E9E54', fillOp: 70, bleed: 0.1, ink: PAL.ink, sw: 1.1 });
    paint(ellPts(1560, 930, 720, 230, 36, 2), { wash: '#7CC070', fill: '#52924A', fillOp: 70, bleed: 0.1, ink: PAL.ink, sw: 1.1 });
    paintFloorAndRug(865, '#C8E6B2', '#95C47C', '#E23E36', '#E8AA38', 's4');
    paintStringLights(105, 65, 12, warpT(t), '#FFE066', 's4');

    // ── 主理人（左，永不被道具遮挡：所有道具都在 x≥625）──
    const myMood = emotions(lt, [
      [0, 'happy'],
      [S4.land - SHOT_T0.s4, 'surprised'],
      [S4.land - SHOT_T0.s4 + 2 / 24, 'starstruck'],
      [S4.open - SHOT_T0.s4, 'laugh'],
      [S4.stamp - SHOT_T0.s4, 'surprised'],
      [S4.feed - SHOT_T0.s4, 'love'],
      [S4.count - SHOT_T0.s4, 'excited']
    ]);
    const myHop = jump(lt, S4.count - SHOT_T0.s4, S4.count - SHOT_T0.s4 + 7 / 24, 2.0);
    wetHalo(S4.creatorX, 865, 25, '#EFC3AE');
    creator(S4.creatorX, 865, 25, {
      ...myMood,
      dy: (myMood.dy || 0) + myHop.dy,
      sq: (myMood.sq || 0) + myHop.sq,
      aL: 1.10, aR: 1.10
    });

    // ── 小恐龙（右，像素精灵在 2D 合成层，结构上不会被任何道具压住）──
    wetHalo(S4.dinoX, 865, 26, DINO_COLS.mint);
    dino(S4.dinoX, 865, 26, { flip: true, aL: 1.15, aR: 1.15 });

    stageLayer(4, t);                           // 五个道具：礼物舱 / 算力券 / 印章 / 算力机 / 计数器
    camEnd();
    flushLetters();                             // 场景字先落定，再盖入场遮罩
    wipeIn(lt);                                 // 统一转场：遮罩式笔刷擦除
    hudBrand(lt, SUBS.S4.title);
    storyRibbon('S4', t, lt, dur);
    wipeOut(lt, dur);
  }

  // ============================================================================
  // SHOT 5 (SHOT_T0.s5 → SHOT_T0.s6 = 29.143 → 43.700, 14.557s): 终章立 Flag — 重构成三段
  //   段① 29.600s 起 20 帧日历 1.00→1.14 ease-out cubic 缓推 → 30.733s 「Day 01」hero 落章
  //        （3 帧上抬预备 → 4 帧砸下 → 接触帧 squash 1.25x/0.8x → 2 帧白闪 → 全屏墨点溅开）
  //   段② 31.350s 拉回广角 → 33.000s 插旗入地 + 金色爆发
  //   段③ 38.500s FULL RESET 警示 + 双主角宣誓 → 43.400s 起薄荷笔刷扫走舞台，交给落版段
  //   本幕不再有虹膜收黑；节拍全部写成幕内绝对秒（口播边界与落版起点都是绝对时间）。
  // ============================================================================
  function shot5Flag(t, lt, dur) {               // dur = SHOT_DUR.s5 (14.557s)
    const tPush = T5.push, tStampTop = T5.stampTop, tImpact = T5.stamp;
    const tPullBack = T5.pullBack, tPullBackEnd = T5.pullBackEnd;
    const tFlagStart = T5.flagStart, tPlant = T5.plant, tReset = T5.reset;
    const poleX = 960;
    // 三段式摄像：广角开场 → 20 帧缓推日历 → 落章保持 → 拉回广角 → 宣誓再缓推
    const pushK = easeOut(seg(lt, tPush, tPush + 20 / 24));        // ease-out cubic，20 帧 1.00→1.14
    const backK = ease(seg(lt, tPullBack, tPullBackEnd));
    const shake = lt > tPlant && lt < tPlant + 0.16 ? shakeXY(t, 9 * Math.exp(-(lt - tPlant) * 6)) : [0, 0];
    camBegin(
      lerp(lerp(960, 450, pushK), 968, backK) + shake[0] + 10 * Math.sin((warpT(t) - SHOT_T0.s5) * 0.7),
      lerp(lerp(544, 490, pushK), 512, backK) + shake[1] + 6 * Math.sin((warpT(t) - SHOT_T0.s5) * 0.5),
      lerp(lerp(0.98, 1.14, pushK), 1.06, backK)
    );

    // Rich Sunrise Celebration Horizon & Layered Mountains
    staticSeed('shot5_sky');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#FFF4DC', ink: null });
    paint(ellPts(W * 0.5, 420, 1050, 380, 30, 12), {
      fill: '#FFD599', fillOp: 120, bleed: 0.3, tex: 0.55, ink: null
    });
    paint(ellPts(W * 0.5, 180, 750, 220, 26, 10), {
      fill: '#B5EDD8', fillOp: 110, bleed: 0.28, tex: 0.5, ink: null
    });
    // Distant sunrise hills behind stage
    staticSeed('shot5_hills');
    paint(ellPts(960, 910, 980, 210, 36, 2), {
      wash: '#9BD6B8', fill: '#6AB092', fillOp: 80, ink: PAL.ink, sw: 1.1
    });
    paintCloud(220 + Math.sin(t * 0.28) * 34, 185 + Math.sin(t * 0.19) * 9, 115, 42, '#FFFFFF', 's5c1');
    paintCloud(1700 - Math.sin(t * 0.28) * 34, 185 + Math.cos(t * 0.17) * 9, 115, 42, '#FFFFFF', 's5c2');

    paintFloorAndRug(865, '#DFCFAF', '#BFA882', '#9BE0C5', '#E8AA38', 's5');
    paintStringLights(98, 55, 12, t, '#FFE066', 's5');

    // ── 星形粒子层：统一画在日历卡/Reset 板与双主角之下（星点不再压在卡框上、肚皮上）──
    if (lt > tPlant) {
      for (let i = 0; i < 5; i++) {
        const k2 = frac(lt / 3.6 + i / 5);
        sparkle(poleX - 200 + i * 100 + Math.sin(lt * 0.9 + i) * 30, 800 - k2 * 520, 12, Math.sin(k2 * Math.PI) * 0.7, PAL.cream);
      }
    }

    // 顶部品牌锁定 → 屏幕空间 HUD（hudBrand），滑入落位后才显示 URL（D4）

    // LEFT BOARD: Option A — "28-Day Daily Meaningful Upgrade Calendar"
    boilSeed('board_calendar');
    paint(rrPts(120, 260, 450, 430, 24, 2.0), {
      wash: '#FFFDF5', washOp: 250, fill: '#CDEFE1', fillOp: 85, bleed: 0.15,
      ink: PAL.ink, sw: 1.6
    });
    paint(rrPts(145, 285, 400, 68, 14, 1.2), {
      wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 80, ink: PAL.ink, sw: 1.2
    });
    letter('① 每日上线真改进', 345, 319, 30, PAL.ink, { ink: false });
    letter('清晰有感 · 切中需求', 345, 388, 24, PAL.teal, { ink: false });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        const dIdx = r * 7 + c;
        const gx = 162 + c * 53, gy = 425 + r * 56;
        const isDay1 = dIdx === 0;
        // Day 01 格子在打卡节拍之前保持呼吸微光（节拍之间画面不冻结）
        const breathe = isDay1 ? 1 + 0.03 * Math.sin(t * 2.6) : 1;
        paint(rrPts(gx + 22 - 22 * breathe, gy + 22 - 22 * breathe, 44 * breathe, 44 * breathe, 8, 0.6), {
          wash: isDay1 ? '#FFE066' : '#E8E0D0',
          fill: isDay1 ? DINO_COLS.mint : null,
          fillOp: 120,
          ink: PAL.ink, sw: isDay1 ? 1.3 : 0.7
        });
      }
    }
    // ── 节拍③ · 「Day 01」hero 落章（接触帧 30.733s）────────────────────────────
    //    3 帧上抬预备 → 4 帧砸下（easeIn 加速）→ 接触帧 squash 1.25x/0.8x → 弹簧回弹。
    //    白闪与墨点溅开在屏幕空间绘制（见 camEnd 之后），保证全屏冲击力。
    const liftK = seg(lt, tStampTop - STAMP.lift, tStampTop);
    const slamK = easeIn(seg(lt, tStampTop, tImpact));
    if (lt > tStampTop - STAMP.lift) {
      const rise = liftK * (1 - slamK);                       // 0→1→0：抬起到顶点再砸下
      const age = lt - tImpact;
      const sqK = age >= 0 ? Math.exp(-13 * age) : 0;         // 接触帧 = 1
      const wob = spring(lt, tImpact, 5, 16);                 // 落地回弹（t<tImpact 时为 0）
      push();
      translate(STAMP.x, STAMP.y - 92 * rise);
      scale((1 + 0.42 * rise) * (1 + 0.25 * sqK + 0.10 * wob),
            (1 + 0.42 * rise) * (1 - 0.20 * sqK - 0.10 * wob));
      glow(0, 0, 60 + 210 * sqK + 40 * rise, PAL.sap, 0.5 + 0.5 * sqK);
      paint(starPts(0, 0, 47, 0.42, 5, -Math.PI / 2 + 0.55 * rise), {
        wash: PAL.sap, fill: PAL.cream, fillOp: 85, ink: PAL.ink, sw: 1.3
      });
      paint(ellPts(0, 0, 20, 20, 16), { wash: DINO_COLS.mint, washOp: 235, ink: PAL.ink, sw: 1.0 });
      pop();
    }
    letter('✓ Day 01 已打卡！', 345, 660, 26, PAL.sap, { pop: seg(lt, tImpact, tImpact + 0.18) });

    // RIGHT BOARD: Option B — "⚡ FULL RESET 全员额度重置认罚拉闸"
    boilSeed('board_reset');
    paint(rrPts(1350, 260, 450, 430, 24, 2.0), {
      wash: '#FFFDF5', washOp: 250, fill: '#FFD8CC', fillOp: 90, bleed: 0.15,
      ink: PAL.ink, sw: 1.6
    });
    paint(rrPts(1375, 285, 400, 68, 14, 1.2), {
      wash: '#E23E36', fill: PAL.ochre, fillOp: 70, ink: PAL.ink, sw: 1.2
    });
    letter('② 否则 Full Reset', 1575, 319, 30, PAL.cream);
    letter('全员额度重置 · 认罚发算力', 1575, 388, 24, '#D8394E', { ink: false });
    paint(rrPts(1435, 425, 280, 195, 20, 1.4), {
      wash: '#2B2233', ink: PAL.ink, sw: 1.4
    });
    // 节拍④：FULL RESET 警示脉冲 — 既有元素原地发光/轻颤，坐标体系与造型完全不变
    const resetA = seg(lt, tReset, tReset + beatAt(dur, .04));
    const jigX = resetA * 6 * Math.sin(t * 17), jigY = resetA * 5 * Math.sin(t * 14 + 1);
    if (resetA > 0) glow(1575 + jigX, 522 + jigY, 150 + 70 * (0.5 + 0.5 * Math.sin(t * 5.5)) * resetA, '#E23E36', 0.85 * resetA);
    paint(ellPts(1575 + jigX, 522 + jigY, 86, 78, 24, 1.2), {
      wash: '#FFE066', fill: '#E23E36', fillOp: 95, ink: PAL.ink, sw: 1.5
    });
    letter('FULL RESET', 1575 + jigX, 522 + jigY, 22, PAL.ink, { ink: false });
    letter('绝不鸽 · 每天二选一', 1575, 655, 26, PAL.ink, { pop: seg(lt, tReset + beatAt(dur, .012), tReset + beatAt(dur, .045)) });

    // CENTER: The Giant "🟢 Day 01 / 28" Flag planted by Creator ("我") & Little Dino ("小恐龙")!
    boilSeed('center_flag');
    const flagDrop = easeOut(seg(lt, tFlagStart, tPlant));
    const flagBounce = spring(lt, tPlant, 6, 18) * 18;
    const poleBottom = lerp(220, 865, flagDrop) + flagBounce;
    const poleTop = poleBottom - 640;

    // 节拍②：插旗瞬间的金色粒子爆发（持续上浮的金色余芒已移到"角色之下"的粒子层）
    if (lt >= tPlant) {
      glow(poleX, poleTop + 130, 340 + 34 * Math.sin(t * 2.2), '#FFE066', 0.85 * (0.85 + 0.15 * Math.sin(t * 1.9)));
      for (let i = 0; i < 8; i++) {
        const q = seg(lt - tPlant, i * 0.03, 0.9 + i * 0.03);
        const a = -Math.PI * 0.9 + (i / 7) * Math.PI * 0.8;
        sparkle(poleX + Math.cos(a) * 260 * q, poleTop + 120 + Math.sin(a) * 180 * q, 26, q, '#FFE066');
      }
    }

    paint(rectPts(poleX - 9, poleTop, 18, poleBottom - poleTop, 1.2), {
      wash: PAL.ochre, ink: PAL.ink, sw: 1.3
    });
    paint(ellPts(poleX, poleTop - 12, 22, 22, 14), {
      wash: '#FFE066', ink: PAL.ink, sw: 1.2
    });
    if (flagDrop > 0.85) {
      paint(rrPts(poleX - 95, 835, 190, 38, 12, 1.2), {
        wash: '#3B4254', ink: PAL.ink, sw: 1.3
      });
    }

    const wave = Math.sin(t * 7) * (12 + 8 * pulse2F(t));        // 旗帜随拍加幅（帧对齐拍点）
    const flagPts = [
      [poleX + 10, poleTop + 15],
      [poleX + 190, poleTop + 5 + wave],
      [poleX + 355, poleTop + 30 - wave * 0.7],
      [poleX + 320, poleTop + 110],
      [poleX + 360, poleTop + 185 + wave * 0.8],
      [poleX + 185, poleTop + 195 - wave],
      [poleX + 10, poleTop + 180]
    ];
    paint(flagPts, {
      wash: DINO_COLS.mint, washOp: 255, fill: '#FFE066', fillOp: 85, bleed: 0.15, tex: 0.55,
      ink: PAL.ink, sw: 1.6, curv: 0.25
    });
    letter('🟢 Day 01 / 28', poleX + 185, poleTop + 78, 34, PAL.ink, { ink: false });
    letter('让改进开始吧！', poleX + 185, poleTop + 138, 28, '#D8394E', { ink: false, pop: seg(lt, tPlant + beatAt(dur, .012), tPlant + beatAt(dur, .04)) });

    // Creator ("我") on left of flagpole
    // 双臂取同一角度（镜像同姿）：左右两臂的绘制代码完全一致，只有姿态角 aL/aR 不同才会
    // 出现"一臂更细/肩关节开缝"的观感 —— 同姿后两侧必然等粗、关节一致（几何在 ans_chars.js 内，不改）
    const myArm = lt > tPlant + 0.9 ? 1.06 + 0.26 * Math.sin(t * 8) * (0.55 + 0.45 * Math.sin(t * 0.9)) : 1.25;
    const myHop = jump(lt, tPlant - 0.95, tPlant, 2.5);
    const myHop2 = jump(lt, tImpact, tImpact + 0.22, 2.0);                    // 节拍③·落章欢呼
    const myHop3 = jump(lt, tReset + 0.12, tReset + 0.34, 2.3);               // 节拍④·宣誓起跳
    const myMood = emotions(lt, [
      [0, 'determined'], [tPlant, 'excited'], [tPlant + 0.35, 'happy'],
      [tImpact, 'starstruck'], [tImpact + 0.45, 'excited'],
      [tReset, 'determined'], [tReset + 0.35, 'laugh']
    ]);
    wetHalo(760, 865, 25, '#EFC3AE');
    creator(760, 865, 25, {
      ...myMood,
      dy: (myMood.dy || 0) + myHop.dy + myHop2.dy + myHop3.dy,
      sq: (myMood.sq || 0) + myHop.sq + myHop2.sq + myHop3.sq,
      aL: myArm,
      aR: myArm
    });

    // Little Dino ("小恐龙") on right of flagpole
    const dinoHop = jump(lt, tPlant - 0.85, tPlant + 0.15, 3.0);
    const dinoHop2 = jump(lt, tImpact, tImpact + 0.22, 2.2);                  // 节拍③·落章欢呼
    const dinoHop3 = jump(lt, tReset + 0.12, tReset + 0.34, 2.3);             // 节拍④·宣誓起跳
    const dinoMood = emotions(lt, [
      [0, 'excited'], [tPlant + 0.15, 'starstruck'], [tPlant + 0.60, 'love'],
      [tImpact, 'excited'], [tImpact + 0.50, 'starstruck'],
      [tReset, 'determined'], [tReset + 0.35, 'excited']
    ]);
    wetHalo(1160, 865, 25, DINO_COLS.mint);
    dino(1160, 865, 25, {
      ...dinoMood,
      flip: true,
      dy: (dinoMood.dy || 0) + dinoHop.dy + dinoHop2.dy + dinoHop3.dy,
      sq: (dinoMood.sq || 0) + dinoHop.sq + dinoHop2.sq + dinoHop3.sq,
      aL: 1.25,
      aR: lt > tPlant + beatAt(dur, .16) ? 1.0 + 0.6 * Math.sin(t * 9 + 1) * (0.55 + 0.45 * Math.sin(t * 0.9 + 1)) : 0.8
    });

    const stampScreen = toScreen(STAMP.x, STAMP.y);
  stageLayer(5, t);                           // 第六轮 · 日历逐格盖章 + 宣告板 + 宣誓条
    camEnd();

    // 节拍④的红光警示（屏幕空间一次性闪光；沿用既有 flash，不改造型）
    if (lt > tReset && lt < tReset + 0.18) flash(0.16 * (1 - seg(lt, tReset, tReset + 0.18)), '#E23E36');

    // 落章 hero 的收尾：接触后 2 帧白闪 + 全屏墨点溅开（屏幕空间，冲击力优先）
    const impAge = lt - tImpact;
    if (impAge > 0) {
      const flashK = seg(impAge, 0, 1 / 24) * (1 - seg(impAge, 1 / 24, STAMP.flash));
      if (flashK > 0) flash(0.88 * flashK, '#FFFDF6');
      const spK = seg(impAge, 0, STAMP.splat);
      if (spK > 0 && spK < 1) {
        boilSeed('stamp_splat');
        for (let i = 0; i < 22; i++) {
          const a2 = (i / 22) * TAU + hash(i) * 0.7;
          const rr = (70 + 780 * hash(i + 7)) * easeOut(spK);
          const sz = (7 + 20 * hash(i + 13)) * (1 - spK * 0.3);
          paint(ellPts(stampScreen[0] + Math.cos(a2) * rr, stampScreen[1] + Math.sin(a2) * rr * 0.92, sz * 1.3, sz, 12, 0.9),
            { wash: PAL.ink, washOp: 255 * (1 - spK * 0.2), ink: null });
        }
      }
    }

    flushLetters();                                     // 场景字先落定，再盖入场遮罩
    wipeIn(lt);                                         // 统一转场：遮罩式笔刷擦除
    hudBrand(lt, SUBS.S5.title);
    storyRibbon('S5', t, lt, dur);
    wipeOut(lt, dur);                                   // 43.400s 起扫走舞台 → 落版段接棒
  }

  // ============================================================================
  // END CARD (SHOT_T0.s6 → FILM_DUR = 43.700 → 45.900, 2.20s) — 专属落版段（D8 加长，微动不断帧）
  //   Act5 的薄荷笔刷在 43.700s 铺满，本段头 0.6s 让同一批笔触拖开，露出奶油纸底的字锁版：
  //   「ANS · AI Never Stops」+「ans.cauai.fun」+「Day 01 / 28」+ 小字 CTA「注册即送算力 · 0 套路」。
  //   全部手绘笔触（ribbon 大笔扫 / paint 圆角条 / letter）+ 4 角星点。最后一帧 = 完整落版定格。
  // ============================================================================
  function endCardLockup(t, lt, dur) {           // dur = SHOT_DUR.s6 (2.200s)
    staticSeed('end_paper');
    paint(rectPts(-400, -300, W + 800, H + 600), { wash: '#FFFDF6', ink: null });
    paint(ellPts(W * 0.5, 430, 980, 620, 30, 14), {
      fill: DINO_COLS.mint, fillOp: 72, bleed: 0.32, tex: 0.5, ink: null
    });
    paint(ellPts(330, 235, 520, 300, 26, 12), { fill: '#FFE082', fillOp: 85, bleed: 0.3, tex: 0.5, ink: null });
    paint(ellPts(1640, 895, 560, 320, 26, 12), { fill: PAL.rose, fillOp: 55, bleed: 0.3, tex: 0.5, ink: null });

    // 手绘薄荷大笔扫（落版主视觉笔触）——缓慢呼吸位移，定格期间画面不死
    const drift = 10 * Math.sin(lt * 2.2);
    boilSeed('end_swash');
    // 薄荷大笔扫 = 字锁版的手绘高光底：不描边，任何墨线都不会穿过字身
    paint(ribbon([[300 + drift, 366], [700 + drift, 348], [1160 + drift, 362], [1620 + drift, 336]], 138, 108), {
      wash: DINO_COLS.mint, washOp: 225, fill: DINO_COLS.mintDk, fillOp: 38, bleed: 0.18, tex: 0.5, ink: null
    });
    // 金色手绘下划线：压 URL 之下，同样不穿字
    paint(ribbon([[520 - drift, 542], [960, 532], [1400 - drift, 540]], 18, 10), {
      wash: PAL.ochre, washOp: 255, bleed: 0.1, tex: 0.4, ink: PAL.ochre, sw: 0.6, curv: 0.5
    });
    // 金色小星点（在字之下）
    for (let i = 0; i < 6; i++) {                                  // 连续缓动，不做拍点跳变（无单帧亮度突变）
      const gl = 0.5 + 0.5 * Math.sin(lt * 2.4 + i * 1.7);
      sparkle(230 + i * 290 + (hash(i) - 0.5) * 90, 250 + (hash(i + 5) - 0.5) * 210 + Math.sin(lt * 0.9 + i) * 14,
        20, 0.30 + 0.30 * gl, '#FFE066');
    }
    // D8：落版期间每帧都有 ≥0.03 的连续微动（扫光带 + 上浮微粒），杜绝 12fps 步进/整帧复制
    const sweepX = lerp(-620, W + 620, frac(lt / 2.7));
    glow(sweepX, 420, 560, '#FFE066', 0.30);
    glow(sweepX - 180, 300, 380, DINO_COLS.mint, 0.22);
    for (let i = 0; i < 7; i++) {
      const k2 = frac(lt / 2.1 + i / 7);
      sparkle(300 + i * 220 + Math.sin(lt * 1.3 + i) * 26, 940 - k2 * 760, 11, Math.sin(k2 * Math.PI) * 0.6, DINO_COLS.mint);
    }

    // 字锁版
    boilSeed('end_lockup');
    // D8：锁版四件套在 43.70–44.50 全部就位，留 1.4s 可读停留
    const ENDCARD = { lg: .068, url: .127, chip: .191, cta: .250, span: .114 };   // ×dur(2.2s) = 0.15/0.28/0.42/0.55s
    const lgK = backOut(seg(lt, beatAt(dur, ENDCARD.lg), beatAt(dur, ENDCARD.lg + ENDCARD.span)));
    const urlK = backOut(seg(lt, beatAt(dur, ENDCARD.url), beatAt(dur, ENDCARD.url + ENDCARD.span)));
    const chipK = backOut(seg(lt, beatAt(dur, ENDCARD.chip), beatAt(dur, ENDCARD.chip + ENDCARD.span)));
    const ctaK = backOut(seg(lt, beatAt(dur, ENDCARD.cta), beatAt(dur, ENDCARD.cta + ENDCARD.span)));
    glow(960, 360, 420 + 30 * Math.sin(t * 2.4), DINO_COLS.mint, 0.55);
    letter('ANS · AI Never Stops', 960, 366, 104, PAL.ink, { pop: lgK });
    letter('ans.cauai.fun', 960, 486, 54, '#2B7A72', { pop: urlK });          // 深松绿 + 墨影，奶油底上可读
    push();
    translate(960, 620);
    scale(1, chipK);
    paint(rrPts(-212, -40, 424, 80, 20, 1.4), {
      wash: '#2B2233', washOp: 252, ink: PAL.ink, sw: 1.4
    });
    pop();
    if (chipK > 0.3) letter('🟢 Day 01 / 28', 960, 620, 44, DINO_COLS.mint, { pop: chipK, ink: false });
    letter('注册即送算力 · 0 套路', 960, 716, 34, '#D8394E', { pop: ctaK, ink: false });

    flushLetters();                                     // 锁版字先落定，再让擦除收走（避免字浮在遮罩上）
    wipeIn(lt);                                         // 统一转场：起手 10 帧把舞台的擦除收走
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 第六轮 · 画面节奏引擎：强结构事件 + 「预备 → 爆发 → 余韵」
  //   验收工具 tools/picture_rhythm.py 的判据：事件帧结构变化 s≥0.18 且 diff ≥2×幕均，
  //   事件前 6 帧 diff ≤0.5×幕均（预备/屏息），事件后 10 帧 ≤0.8×幕均（余韵）。
  //   屏息不靠加静止帧，而是：①boil 时钟冻结（线稿完全静止）②摄像/粒子减速
  //   ③画面压暗 4.5%（爆发帧释放，本身也构成爆发的对比）。
  // ══════════════════════════════════════════════════════════════════════════════
  const MUS_OFF = PROJECT.offset, MUS_BEAT = 60 / PROJECT.bpm;
  const EVPRE = 7 / 24, EVPOST = 9 / 24;      // 7 帧：屏息覆盖"事件前 6 帧"（工具窗口）且不含爆发帧
  const EV = [
    { t: 1.30, w: 'pile' }, { t: 2.20, w: 'pile2' }, { t: 2.95, w: 'sweep' }, { t: 3.92, w: 'clean' },
    { t: 5.15, w: 'spark' }, { t: 5.96, w: 'mark' },
    { t: 7.15, w: 'arrive' }, { t: 8.28, w: 'power' }, { t: 9.30, w: 'card1' }, { t: 10.75, w: 'card2' },
    { t: 12.22, w: 'card3' }, { t: 13.62, w: 'surge' },
    { t: 15.20, w: 'arrive' }, { t: 16.65, w: 'lay1' }, { t: 18.05, w: 'lay2' }, { t: 19.52, w: 'lay3' },
    { t: 21.10, w: 'build' }, { t: 22.45, w: 'show' },
    // Act4 五个爆发帧：584 舱落台面 / 608 开盖出券 / 631 盖章 / 654 进槽口 / 677 计数跳数
    // （原来的 'arrive' 是幕首转场事件，被 e.calm 排除 → 换成 'land' 才能拿到"预备屏息"）
    { t: 24.15, w: 'land' }, { t: 25.35, w: 'hatch' }, { t: 26.35, w: 'prop1' }, { t: 27.35, w: 'prop2' }, { t: 28.25, w: 'prop3' },
    { t: 29.75, w: 'cal' }, { t: 30.85, w: 'stamp' }, { t: 31.95, w: 'flag' }, { t: 33.15, w: 'cell1' },
    { t: 33.55, w: 'cell4' }, { t: 34.62, w: 'cell2' }, { t: 35.25, w: 'cell5' }, { t: 36.05, w: 'cell3' },
    { t: 37.45, w: 'reset' }, { t: 38.95, w: 'board' },
    { t: 40.45, w: 'salute' }, { t: 43.58, w: 'wipe' }
  ];
  for (const e of EV) {
    e.t = MUS_OFF + Math.round((e.t - MUS_OFF) / MUS_BEAT) * MUS_BEAT; e.f = Math.round(e.t * 24);
    e.calm = !(e.w === 'arrive' || e.w === 'wipe');       // 转场事件不参与屏息（否则擦除会被推迟）
  }
  const CALM_EV = () => EV.filter(e => e.calm);

  function evPre(t) {                                   // 预备：事件前 6 帧（1 帧内进入屏息）
    let k = 0;
    for (const e of EV) if (e.calm && t > e.t - EVPRE && t < e.t) k = 1;   // 第 1 帧进入屏息；爆发帧本身不屏息
    return k;
  }
  function evPost(t) {                                  // 余韵：事件后 9 帧
    let k = 0;
    for (const e of EV) if (e.calm && t >= e.t && t < e.t + EVPOST) k = Math.max(k, 1 - seg(t, e.t, e.t + EVPOST));
    return k;
  }
  const calmK = t => Math.max(evPre(t), 0.5 * evPost(t));
  const holdDamp = t => 1 - 0.75 * evPre(t);            // 预备期拍点闪烁压到 25%（相位不变，仍可逐帧核对）
  function calmHeld(t) {                                // 被屏息"扣掉"的时间（boil/摄像/粒子用）
    let h = 0;
    for (const e of EV) {
      if (!e.calm) continue;
      const a = e.t - EVPRE, b = e.t;
      if (t >= b) h += b - a; else if (t > a) h += t - a;
    }
    return h;
  }
  const warpT = t => t - calmHeld(t);
  function joltAt(t) {                                  // 爆发帧镜头冲击（2 帧衰减）
    for (const e of EV) {
      const d = t - e.t;
      if (d >= 0 && d < 2 / 24) {
        const k = 1 - d * 12;
        return { zoom: 1 + 0.016 * k, dx: 8 * k * Math.sin(e.f * 1.7), dy: 6 * k * Math.cos(e.f * 2.3) };
      }
    }
    return null;
  }
  setBoilClock(warpT);
  setWarp(warpT);                                     // 幕内动画也走演出时钟（屏息期整体减速）
  setJolt(() => joltAt(T));
  // 预备期压暗：3 帧渐入（1.4%/帧）、爆发后 2 帧释放（2.1%/帧）—— 都在"单帧亮度跳变 ≤3%"红线内
  function shadeAt(t) {
    let k = 0;
    for (const e of EV) {
      if (e.calm && t > e.t - EVPRE - 3 / 24 && t <= e.t + 2 / 24) {
        const inK = seg(t, e.t - EVPRE - 3 / 24, e.t - EVPRE - 0.2 / 24);
        const outK = 1 - seg(t, e.t, e.t + 2 / 24);
        k = Math.max(k, inK * outK);
      }
    }
    return 0.042 * k;
  }
  setShade(shadeAt);
  const evOf = w => EV.find(e => e.w === w);

  // ── 姿态档位：每个强事件一套不同剪影（举手/指向/蹲身/侧身/摊手），每幕因此有 ≥5 套姿态 ──
  const POSE_DEF = [
    { aL: 1.58, aR: 1.58, sq: 0.11, eyes: 'happy', mouth: 'open', emote: 'spark' },
    { aL: 0.22, aR: 1.78, sq: -0.06, eyes: 'wide', mouth: 'O' },
    { aL: 1.34, aR: 1.34, sq: 0.18, eyes: 'squeeze', mouth: 'grin' },
    { aL: 1.80, aR: 0.30, sq: -0.08, eyes: 'wink', mouth: 'smile' },
    { aL: 0.92, aR: 0.92, sq: 0.08, eyes: 'shine', mouth: 'cat', emote: 'spark' }
  ];
  function poseAt(t) {
    let best = null, bk = 0;
    for (let i = 0; i < EV.length; i++) {
      const d = t - EV[i].t;
      if (d < -0.05 || d > 0.55) continue;
      const k = d < 0 ? 0.65 : Math.max(0, 1 - d / 0.55);
      if (k > bk) { bk = k; best = POSE_DEF[i % POSE_DEF.length]; }
    }
    return bk > 0.22 ? best : {};
  }
  setPoseHook(poseAt);

  // 爆发冲击层：墨环 + 放射笔触 + 高光（每个强事件共用，2-3 帧）
  function hitFX(t, x, y, R, col) {
    for (const e of EV) {
      const d = t - e.t;
      if (d < 0 || d > 3 / 24) continue;
      if (t - e.t > 3 / 24) break;
      const k = clamp(1 - d * 8), rk = easeOut(1 - k);
      boilSeed('hit_' + e.w + e.f);
      const rr = R * (0.30 + 1.45 * rk);
      push(); translate(x, y);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + hash(i + e.f) * 0.1;
        const w = R * 0.11 * (1 - rk * 0.55) * (0.55 + hash(i * 3 + e.f) * 0.9);
        paint(rectPts(Math.cos(a) * rr - w / 2, Math.sin(a) * rr * 0.72 - w / 2, w, w * 0.85, 5, 1.5),
          { wash: i % 2 ? col : PAL.ink, washOp: 240 * k, ink: null });
      }
      pop();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.28, l0 = rr * 0.55, l1 = l0 + R * 0.55 * (1 - k * 0.4);
        paint([[x + Math.cos(a) * l0, y + Math.sin(a) * l0 * 0.8], [x + Math.cos(a) * l1, y + Math.sin(a) * l1 * 0.8]],
          { wash: i % 2 ? PAL.ink : col, washOp: 200 * k, ink: null });
      }
      // 冲击扫带：1.5 帧内横扫全幅的残影带 —— 结构变化量的主要来源（≥18% 像素显著变化）
      for (let s = 0; s < 3; s++) {
        const q = easeOut(clamp(rk * 1.15 - s * 0.12));
        const bw = W * 0.52, bh = H * 0.085;                 // 细长残影条（像速度线，不是色块）
        const sx = lerp(-bw * 1.1, W + bw * 0.1, q), sy = y - bh / 2 + (hash(e.f + s) - 0.5) * 190;
        paint(rectPts(sx, sy + Math.sin(q * 2.2 + s) * 46, bw, bh, 16, 2.0),
          { wash: s % 2 ? col : '#FFFDF6', washOp: (96 - s * 26) * k, ink: null });
      }
      glow(x, y, R * (0.7 + 1.1 * rk), col, 0.5 * k);
      return;                                   // 每个事件每帧只画一次（本帧后续 hitFX 调用直接返回，避免 GPU 峰值）
    }
  }

  // 爆发帧"到位"系数：事件帧前 2 帧 0 → 事件帧 1（大幅道具的 2 帧到位动效）
  function popK(t, w) {
    const e = evOf(w);
    return e ? easeOutCubic(seg(t, e.t - 1.5 / 24, e.t)) : 0;
  }
  function settleK(t, w) {                              // 事件后回稳（0→1）
    const e = evOf(w);
    return e ? seg(t, e.t, e.t + 4 / 24) : 0;
  }

  // ── 大幅道具：2 帧内从远处到位并过冲，落地挤压 ──
  function slamBlock(t, w, x, y, bw, bh, col, txt, size, rot0) {
    const e = evOf(w); if (!e) return;
    const a = t - e.t;
    if (a < -1.5 / 24 || a > 0.42) return;                 // 定格 ~10 帧（0.42s），不再长留遮住角色
    const k = easeOutCubic(seg(t, e.t - 1 / 24, e.t));   // 恰好 1 帧内到位：帧 f-1 = 起点、帧 f = 终点（单帧最大跳变）
    const sq = Math.max(0, 1 - a * 7);
    const dx = (1 - k) * bw * 0.85, dy = (1 - k) * 420;
    boilSeed('slam_' + w + e.f);
    push();
    translate(x + dx, y + dy);
    rotate(lerp(rot0, 0, k));
    scale(1 + 0.16 * sq, 1 - 0.14 * sq);
    paint(rrPts(-bw / 2, -bh / 2, bw, bh, Math.min(26, bh * 0.2), 2), {
      wash: col, washOp: 255, fill: PAL.ink, fillOp: 34, bleed: 0.06, tex: 0.35, ink: PAL.ink, sw: 2.2
    });
    pop();
    if (txt) letter(txt, x + dx, y + dy, size, PAL.ink, { rot: lerp(rot0, 0, k), alpha: k });
  }

  // ══ 第八轮 · 像素恐龙表演状态机（每幕 ≥3 套状态 + 每幕一次 walk 走位 ≥120px）══
  //   clip 取 assets/dino2 的 7 组：walk/idle/actions/memes/memes2/memes3/standup
  //   帧号按素材顺序（0 基）：memes 0爆哭 1气鼓鼓 2大笑 3愣住 4无语 5吃瓜 6摆烂 7震惊 8比心
  //   actions 0跳起 1挥手 2坐下 3躲睡 4举方块 5冲刺 6欢呼 7比心 ｜ memes2 0敬礼 … ｜ memes3 5点赞 6暗中观察 7石化 8谢谢你
  const DACT = {
    1: { walk: [4.12, 5.00], wx: [300, 640], ev: { pile: ['memes', 0], pile2: ['memes', 4], sweep: ['actions', 5], clean: ['idle', 6], spark: ['actions', 0], mark: ['memes', 2] } },
    2: { walk: [7.20, 8.20], wx: [1250, 980], ev: { power: ['actions', 4], card1: ['memes', 2], card2: ['memes', 8], card3: ['memes3', 5], surge: ['actions', 6] } },
    3: { walk: [15.30, 16.50], wx: [345, 720], ev: { lay1: ['memes3', 2], lay2: ['memes3', 1], lay3: ['actions', 4], build: ['memes3', 5], show: ['memes2', 0] } },
    4: { walk: [0, 0], wx: [S4.dinoX, S4.dinoX], ev: { land: ['memes', 7], hatch: ['memes', 8], prop1: ['memes', 2], prop2: ['memes3', 5], prop3: ['actions', 6] } },   // R12 · Act4 无走位（五个动作节拍表演）；677 用 actions/06 欢呼帧
    5: { walk: [36.15, 36.90], wx: [1160, 1440], ev: { cal: ['memes3', 6], stamp: ['memes3', 5], flag: ['memes2', 0], cell1: ['memes3', 7], cell4: ['memes3', 8], cell2: ['memes3', 5], cell5: ['memes3', 0], cell3: ['memes3', 6], reset: ['memes', 7], board: ['actions', 7], salute: ['memes3', 5] } }
  };
  function dinoActAt(t) {
    const act = t < SHOT_T0.s2 ? 1 : t < SHOT_T0.s3 ? 2 : t < SHOT_T0.s4 ? 3 : t < SHOT_T0.s5 ? 4 : 5;
    const A = DACT[act];
    for (const e of EV) {                                  // 事件定点：爆发后 4-10 帧定格
      const pose = A.ev[e.w]; if (!pose) continue;
      // Act4 的 EV 拍点与爆发帧差 ±0.5 帧 → 姿态对齐到爆发帧本身，保证爆发帧上已经是新姿态
      const ft = act === 4 ? Math.round(e.t * 24) / 24 : e.t;
      const d = t - ft, hold = (e.w === 'sweep' || e.w === 'surge' || e.w === 'show') ? 10 : 6;
      if (d >= 0 && d < hold / 24) return { clip: pose[0], f: pose[1], dx: pose[2] || 0, scale: 1,
        dy: (act === 4 && e.w === 'prop3') ? jump(t, ft - 1 / 24, ft + 4 / 24, 2.4).dy * 26 : 0 };
    }
    if (t >= A.walk[0] && t < A.walk[1]) {                 // 走位：12fps 循环 + 位移（每幕 ≥160px）
      const k = (t - A.walk[0]) / (A.walk[1] - A.walk[0]);
      return { clip: 'walk', f: Math.floor((t - A.walk[0]) * 12), dx: lerp(A.wx[0], A.wx[1], k) - A.wx[0], scale: 1 };
    }
    return { clip: 'idle', f: Math.floor(warpT(t) * 4 + act * 3), dx: 0, scale: 1 };   // 常态 4fps 慢循环
  }
  setDinoAct(dinoActAt);

  // ══ 各幕新叙事阶段（每幕 3 段以上，新构图状态）══
  function stageLayer(act, t) {
    if (act === 1) {
      // ① 99+ 红标在桌面堆积（1.30s / 2.20s 两批，共 9 枚）─ ② 3.92s 桌面清空 ─ ③ 5.96s ANS 字标落地
      const nb = Math.floor(clamp((t - 1.15) / 0.30, 0, 9));
      for (let i = 0; i < nb; i++) {
        const bx = 1330 + (i % 3) * 58, by = 690 - Math.floor(i / 3) * 52;
        const age = t - (1.15 + i * 0.30);
        if (age < 0) continue;
        const k = easeOutCubic(seg(age, 0, 0.11));
        const sq = Math.max(0, 1 - (age - 0.11) * 8);
        boilSeed('badge' + i);
        push(); translate(bx, by - (1 - k) * 190); scale(1 + 0.2 * sq, 1 - 0.18 * sq);
        paint(rrPts(-36, -26, 72, 52, 10, 1.4), {
          wash: '#E0483C', washOp: 255, fill: '#B3261E', fillOp: 80, ink: PAL.ink, sw: 1.3
        });
        pop();
        letter('99+', bx, by - (1 - k) * 190, 25, '#FFF4DC', { alpha: k });
      }
      if (t > 1.3) letter('99+ 吃灰收藏夹', 1478, 742, 22, PAL.ochre, { alpha: seg(t, 1.3, 1.4) * (1 - seg(t, 4.6, 4.75)) });
      // ③ 灵感汇聚 → ANS 字标（5.15s 汇聚线 / 5.96s 落地）
      const cv = evOf('spark'), mk = evOf('mark');
      if (t > cv.t - 0.5 && t < mk.t + 0.5) {
        const k = clamp((t - (cv.t - 0.5)) / (mk.t - cv.t + 0.5));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + 0.4, r = lerp(760, 60, easeOut(k));
          const px = 960 + Math.cos(a) * r, py = 560 + Math.sin(a) * r * 0.62;
          if (t < mk.t) sparkle(px, py, 13, 0.25 + 0.35 * hash(i + 3), DINO_COLS.mint);
        }
      }
      slamBlock(t, 'mark', 960, 560, 620, 260, DINO_COLS.mintLt, 'ANS', 150, -0.05);
      if (t < cv.t - 0.6) hitFX(t, 1470, 660, 300, '#E0483C');
      if (t < mk.t + 0.4) hitFX(t, 960, 560, 340, DINO_COLS.mint);
      // 每个事件一记锐利重击（卡片墙倾泻 / 一扫而空 / 灵感汇聚）
      slamBlock(t, 'pile', 1470, 560, 900, 320, '#E0483C', '99+ 吃灰收藏夹', 60, 0.08);
      slamBlock(t, 'pile2', 1470, 400, 1000, 240, '#C23A31', '收藏夹 ×99+ · 全都没看', 46, -0.06);
      slamBlock(t, 'sweep', 960, 470, 1500, 260, DINO_COLS.mintLt, '一扫而空', 88, 0.05);
      slamBlock(t, 'clean', 960, 620, 1300, 200, '#FFF4DC', '桌面清空 · 一个不留', 56, -0.04);
      slamBlock(t, 'spark', 960, 350, 1100, 220, PAL.ochre, '灵感汇聚', 72, 0.06);
    } else if (act === 2) {
      // 三张旗舰卡逐张点亮：卡体 2 帧过冲 + 星章盖章 + ONLINE 横幅
      const cs = ['card1', 'card2', 'card3'], xs = [420, 960, 1500];
      for (let i = 0; i < 3; i++) {
        const e = evOf(cs[i]);
        const a = t - e.t;
        if (a < -1.5 / 24 || a > 2.2) continue;
        const k = easeOutCubic(seg(t, e.t - 1.5 / 24, e.t));
        const sq = Math.max(0, 1 - a * 6);
        boilSeed('cardlit' + i);
        push(); translate(xs[i], 300); scale(0.72 + 0.30 * k + 0.1 * sq, 0.72 + 0.30 * k - 0.09 * sq);
        paint(rrPts(-190, -230, 380, 460, 24, 2.2), {
          wash: ['#7FD8FF', '#FFD07F', '#C7A8FF'][i], washOp: 90 * k, ink: null
        });
        pop();
        const seal = easeOutCubic(seg(t, e.t, e.t + 2 / 24));
        if (seal > 0) {
          push(); translate(xs[i], 300); rotate(lerp(-0.5, 0, seal)); scale(2.2 - 1.2 * seal);
          paint(starPts(0, 0, 150, 0.5, 5, 0.2), { wash: ['#2F8FD6', '#D68A2F', '#8A5FD6'][i], washOp: 230 * (1 - seg(t, e.t + 0.4, e.t + 0.9)), ink: PAL.ink, sw: 2 });
          pop();
        }
        slamBlock(t, 'banner' + i, xs[i], 470, 420, 110, '#FFF4DC', ['GPT-6-Astra 上线', '大肥鱼 v4.1 上线', 'Opus 5.5 上线'][i], 34, 0.06);
      }
      // 总闸 / 全员满血
      slamBlock(t, 'power', 960, 640, 520, 130, '#FFE082', 'MAX 满血总闸 · 三舱直连', 34, -0.04);
      slamBlock(t, 'surge', 960, 520, 900, 200, DINO_COLS.mintLt, '全部满血开跑', 74, 0.03);
      for (let i = 0; i < 3; i++) hitFX(t, xs[i], 300, 300, ['#7FD8FF', '#FFD07F', '#C7A8FF'][i]);
      hitFX(t, 960, 560, 420, DINO_COLS.mint);
    } else if (act === 3) {
      // 教程高塔逐层拆解（3 层）→ 21.10s 成品成型 → 22.45s 展示（镜头推近）
      const ls = ['lay1', 'lay2', 'lay3'], ys = [620, 520, 420];
      const built = evOf('build');
      for (let i = 0; i < 3; i++) {
        const e = evOf(ls[i]);
        const a = t - e.t;
        const gone = t > e.t;
        const fly = gone ? clamp(a * 5) : 0;
        if (t < e.t - 1.5 / 24) {                        // 未拆：层块在原位（叠塔）
          if (t > built.t + 3) continue;
          boilSeed('lay' + i);
          push(); translate(700 + (t > e.t ? 0 : 0), ys[i]);
          rotate(0.02 * i + (t < e.t ? Math.sin(warpT(t) * 1.4 + i) * 0.012 : 0));
          paint(rrPts(-250, -80, 500, 160, 16, 1.8), {
            wash: ['#B9A48E', '#A8B08E', '#8EA8B9'][i], washOp: 255, fill: PAL.ink, fillOp: 26,
            tex: 0.5, ink: PAL.ink, sw: 2
          });
          pop();
          letter(['① 翻教程', '② 配环境', '③ 调依赖'][i], 700, ys[i], 34, PAL.ink);
        } else {
          const x = 700 + fly * 900, y = ys[i] - fly * 180, rot = fly * 1.5;
          boilSeed('layfly' + i);
          push(); translate(x, y); rotate(rot); scale(1 - fly * 0.35);
          paint(rrPts(-250, -80, 500, 160, 16, 1.8), {
            wash: ['#B9A48E', '#A8B08E', '#8EA8B9'][i], washOp: 255 * (1 - fly * 0.7), ink: PAL.ink, sw: 2
          });
          pop();
        }
      }
      slamBlock(t, 'build', 700, 520, 560, 250, DINO_COLS.mintLt, '一键跑通 · 成品生成', 44, -0.05);
      slamBlock(t, 'show', 1020, 470, 1560, 300, '#FFF4DC', '成品验收 · 可直接用', 92, 0.04);
      slamBlock(t, 'show', 1020, 700, 1400, 130, DINO_COLS.mintLt, '第二件 · 最快跑出成品', 44, -0.03);
      for (let i = 0; i < 3; i++) hitFX(t, 700, ys[i], 300, '#B9A48E');
      hitFX(t, 1180, 500, 420, DINO_COLS.mint);
    } else if (act === 4) {
      // ══ R12 · 因果动作链的五个道具（全部完整在画幅内，互不遮挡角色）══
      //   ① 584 舱落台面 ② 608 开盖出券 ③ 631 盖章「已到账」 ④ 654 券进槽口 ⑤ 677 计数跳数
      const cx = S4.cx;
      const landAge = (t - S4.land) * 24;
      const landed = t >= S4.land;
      const openK = t >= S4.open;
      const feedAge = (t - S4.feed) * 24;
      const cntK = t >= S4.count;

      // ── 台座（礼台）：顶面 800，宽 460，完整在安全边内 ──
      boilSeed('s4_plinth');
      paint(ellPts(cx, 864, 296, 24, 24, 1.2), { wash: '#6E9F58', washOp: 66, ink: null });
      paint(rrPts(cx - 230, 806, 460, 58, 14), { wash: '#C9A46B', fill: '#8A6B44', fillOp: 58, tex: 0.4, ink: PAL.ink, sw: 1.6 });
      paint(rrPts(cx - 210, 798, 420, 26, 9), { wash: '#EBD7AE', fill: '#C9A46B', fillOp: 52, ink: PAL.ink, sw: 1.4 });
      if (!landed) paint(ellPts(cx, 800, 116, 13, 18, 1.0), { wash: '#6E9F58', washOp: 54, ink: null });

      // ── ① 礼物舱：悬停 → 584 帧单帧落台，落地挤压 3 帧 ──
      const sq = landed ? Math.max(0, 1 - landAge / 3) : 0;
      const yb = landed ? S4.plinthTop : 556 + Math.sin(warpT(t) * 1.1) * 4;
      push();
      translate(cx, yb);
      scale(1 + 0.10 * sq, 1 - 0.12 * sq);
      const wob = openK ? Math.max(0, Math.exp(-(t - S4.open) * 8) * Math.sin((t - S4.open) * 26)) * 0.16 : 0;
      if (openK) {                                  // 掀盖：两瓣盖向后外翻（先画 → 压在舱体之下，读作"掀开的盖"而不是"手臂"）
        push(); translate(-175, -220); rotate(2.62 + wob);
        paint(rrPts(0, -88, 175, 88, 42), { wash: '#A9DCCB', fill: '#5FAE92', fillOp: 45, tex: 0.45, ink: PAL.ink, sw: 1.6 });
        pop();
        push(); translate(175, -220); rotate(-2.62 - wob);
        paint(rrPts(-175, -88, 175, 88, 42), { wash: '#A9DCCB', fill: '#5FAE92', fillOp: 45, tex: 0.45, ink: PAL.ink, sw: 1.6 });
        pop();
        paint(rrPts(-175, -220, 350, 220, 80), { wash: '#BFE8DA', fill: '#6FBFA0', fillOp: 50, bleed: 0.1, tex: 0.45, ink: PAL.ink, sw: 2.0 });
        paint(ellPts(0, -220, 152, 26, 24, 1.0), { wash: '#2B2233', washOp: 225, ink: PAL.ink, sw: 1.4 });
      } else {                                      // 合盖：一整枚胶囊剪影（不是两只枕头）
        paint(rrPts(-175, -330, 350, 330, 108), { wash: '#BFE8DA', fill: '#6FBFA0', fillOp: 48, bleed: 0.1, tex: 0.45, ink: PAL.ink, sw: 2.0 });
        paint(rrPts(-175, -240, 350, 22, 9), { wash: '#8FD3BB', washOp: 205, ink: PAL.ink, sw: 1.3 });
      }
      const ribTop = openK ? -214 : -318;
      paint(rrPts(-24, ribTop, 48, -ribTop, 6), { wash: '#FFD95A', washOp: 165, ink: null });
      paint(starPts(0, -104, 44, 0.42, 5, 0.2), { wash: '#FFF3C4', fill: PAL.ochre, fillOp: 78, ink: PAL.ink, sw: 1.2 });
      pop();

      // 落地余波：台面冲击环 + 6 团尘（≤8 帧）
      s4Ring(t, S4.landF, cx, S4.plinthTop, 190, '#EBD7AE', 7, 0.30);
      if (landAge >= 0 && landAge < 8) {
        const dk = 1 - landAge / 8;
        for (let i = 0; i < 6; i++) {
          const ang = Math.PI * (1.06 + i * 0.146), rr = 150 + 130 * easeOut(1 - dk);
          paint(ellPts(cx + Math.cos(ang) * rr, S4.plinthTop + 6 + Math.sin(ang) * 12 - 26 * (1 - dk),
            22 + 14 * (1 - dk), 16 + 10 * (1 - dk), 12, 1.4), { wash: '#E8D9BC', washOp: 190 * dk, ink: null });
        }
      }

      // ── ② 算力券（全片唯一焦点物，490px = 25.5% 画幅；654 帧单帧飞进槽口）──
      if (openK && feedAge < 3) {
        const fly = feedAge >= 0 ? 1 : 0;                       // 654 帧单帧位移：券已经在槽口里
        const tSc = lerp(1, 0.38, fly);
        const tx = lerp(cx, 1600, fly), ty = lerp(S4.ty + Math.sin(warpT(t) * 1.4) * 6, S4.slotY + 2, fly);
        const tRot = lerp(-0.02 + Math.sin(warpT(t) * 0.9) * 0.012, 0.22, fly);
        const popIn = 1 + 0.10 * Math.max(0, 1 - (t - S4.open) * 10);
        const sSq = t >= S4.stamp ? Math.max(0, 1 - (t - S4.stamp) * 12) : 0;
        boilSeed('s4_ticket');
        push();
        translate(tx, ty);
        rotate(tRot);
        scale(tSc * popIn * (1 + 0.05 * sSq), tSc * popIn * (1 - 0.09 * sSq));
        glow(0, 0, 250, '#FFD96A', 0.50);
        paint(rrPts(-245, -125, 490, 250, 24, 2.0), { wash: '#FFE47A', fill: PAL.ochre, fillOp: 88, bleed: 0.12, tex: 0.45, ink: PAL.ink, sw: 2.2 });
        paint(rrPts(-222, -102, 444, 204, 14, 1.2), { wash: '#FFFDF4', washOp: 248, ink: PAL.ink, sw: 1.1 });
        paint(rrPts(-206, -86, 96, 172, 12, 1.0), { wash: DINO_COLS.mint, fill: DINO_COLS.mintDk, fillOp: 70, ink: PAL.ink, sw: 1.2 });
        paint(starPts(-158, 0, 34, 0.42, 5, 0.2), { wash: '#FFE47A', ink: PAL.ink, sw: 1.0 });
        pop();
        if (fly < 0.55) {
          letter('算力券', tx - 10, ty - 72, 42, PAL.ink, { alpha: 1 - fly * 1.8 });
          letter('免费额度 · 0 套路', tx - 10, ty - 30, 23, '#D8394E', { alpha: 1 - fly * 1.8 });
        }
      }
      // 券上「已到账」钢印（631 帧后 2 帧落定）
      if (t >= S4.stamp && feedAge < 0) {
        const mk = easeOutCubic(clamp((t - S4.stamp) * 24 / 1.5 + 0.45));   // 冲击帧就有 83% 钢印，2 帧内落定
        letter('已到账', cx + 130, 500, 34, '#C0322F', { rot: -0.10, alpha: mk });
      }

      // ── ③ 印章：618 帧落入画面停在券上方（预备），631 帧单帧砸下，634–642 抬起淡出 ──
      const stAge = (t - S4.stamp) * 24;
      if (t >= 618 / 24 && stAge < 16) {
        const drop = easeOutCubic(clamp((t - 618 / 24) * 24 / 4));
        const slam = stAge >= 0 ? 1 : 0;                       // 631 帧单帧砸下（爆发帧就是落定帧）
        const lift = stAge > 3 ? easeOutCubic(clamp((stAge - 3) / 8)) : 0;
        const yFace = lerp(lerp(90, 286, drop), 500, slam) - 250 * lift;   // 抬起位 286 → 券顶之上留 20px 空隙
        const aSt = 1 - seg(stAge, 11, 16);
        boilSeed('s4_stamp');
        push();
        translate(cx + 130, yFace);
        rotate(lerp(-0.26, -0.02, drop) + 0.015 * Math.sin(t * 3));
        paint(rrPts(-65, -120, 130, 120, 13), { wash: '#C96A4E', fill: '#8A3F2C', fillOp: 66, ink: PAL.ink, sw: 2.0 });
        paint(rrPts(-65, -28, 130, 28, 7), { wash: '#7A2E20', ink: PAL.ink, sw: 1.6 });
        paint(rrPts(-23, -176, 46, 62, 11), { wash: '#D98A6A', fill: '#8A3F2C', fillOp: 55, ink: PAL.ink, sw: 1.8 });
        pop();
        if (aSt > 0.02) letter('ANS', cx + 130, yFace - 66, 24, PAL.cream, { alpha: aSt, rot: -0.04 });
      }
      // 盖章冲击：墨点溅开（≤8 帧）
      if (stAge >= 0 && stAge < 8) {
        const ik = 1 - stAge / 8;
        boilSeed('s4_ink');
        for (let i = 0; i < 9; i++) {                       // 墨点：大小/距离/角度都不规则，像真的溅开
          const ang = (i / 9) * TAU + 0.34 + hash(i * 7) * 0.35;
          const rr = (50 + 140 * easeOut(1 - ik)) * (0.45 + hash(i * 11) * 0.95);
          paint(ellPts(cx + 130 + Math.cos(ang) * rr, 500 + Math.sin(ang) * rr * 0.58,
            5 + 12 * ik * hash(i * 3), 4 + 9 * ik * hash(i * 5), 10, 1.2), { wash: '#C0322F', washOp: 225 * ik, ink: null });
        }
        for (let i = 0; i < 4; i++) {                       // 4 道短墨丝（只到 130px，不横扫全幅）
          const ang = -0.9 + i * 0.62, l0 = 60 + 34 * easeOut(1 - ik);
          paint([[cx + 130 + Math.cos(ang) * l0, 500 + Math.sin(ang) * l0 * 0.6],
                 [cx + 130 + Math.cos(ang) * (l0 + 56 * ik), 500 + Math.sin(ang) * (l0 + 56 * ik) * 0.6]],
            { wash: '#C0322F', washOp: 190 * ik, ink: null });
        }
      }

      // ── ④ 算力机（右，1620..1830 完整在安全边内；槽口在左缘，不遮角色）──
      const litK = t >= S4.feed ? 1 : 0;
      const pulse = litK ? 0.5 + 0.5 * Math.sin(feedAge * 0.9) : 0;
      boilSeed('s4_machine');
      paint(rrPts(S4.mx - 6, S4.my, S4.mw + 12, S4.mh, 28), { wash: '#3A4160', fill: '#232840', fillOp: 66, tex: 0.4, ink: PAL.ink, sw: 2.2 });
      paint(rrPts(S4.mx + 14, S4.my + 24, 166, 120, 14), { wash: '#1A1720', washOp: 235, ink: PAL.ink, sw: 1.4 });
      for (let i = 0; i < 4; i++) paint(rectPts(S4.mx + 28, S4.my + 44 + i * 24, 138 - i * 12, 6, 3), { wash: DINO_COLS.mint, washOp: 70, ink: null });
      paint(ellPts(S4.mx + S4.mw / 2, S4.my - 14, 26, 12, 12, 1.0), { wash: '#FFE082', ink: PAL.ink, sw: 1.2 });
      glow(S4.mx + S4.mw / 2, S4.my - 14, 90, '#FFD96A', 0.5 + 0.16 * pulseF(t));
      // 槽口：一条横向进券缝（左缘开口朝向券的来向），亮起时缝内是薄荷光
      paint(rrPts(S4.mx - 18, S4.slotY - 16, 86, 32, 12), { wash: '#161320', washOp: 245, ink: PAL.ink, sw: 1.6 });
      paint(rrPts(S4.mx - 10, S4.slotY - 6, 78, 12, 6), { wash: litK ? DINO_COLS.mint : '#5A5470', washOp: litK ? 235 : 140, ink: null });
      if (litK) glow(S4.mx + 8, S4.slotY, 150, '#9BE0C5', 0.55 + 0.35 * pulse);
      // 机座
      paint(rrPts(S4.mx - 14, 842, S4.mw + 28, 24, 9), { wash: '#2B2233', fill: '#1A1720', fillOp: 60, ink: PAL.ink, sw: 1.6 });
      // 计数器面板（跳数瞬间整块面板亮一记薄荷色 —— 只发生在面板内，不是全屏白闪）
      paint(rrPts(S4.mx + 16, 640, 178, 120, 12), { wash: '#FFFDF4', washOp: 246, fill: '#EFE3C6', fillOp: 60, ink: PAL.ink, sw: 1.6 });
      const cFlash = cntK ? Math.max(0, 1 - (t - S4.count) * 16) : 0;
      if (cFlash > 0.02) paint(rrPts(S4.mx + 20, 644, 170, 112, 10), { wash: DINO_COLS.mint, washOp: 210 * cFlash, ink: null });
      const cPop = cntK ? 1 + 0.24 * Math.max(0, 1 - (t - S4.count) * 14) : 1;
      letter(cntK ? '1000' : '100', S4.mx + 105, 690, 44 * cPop, cntK ? '#1F7A5C' : PAL.ink, { ink: false });
      letter('算力额度', S4.mx + 105, 740, 18, PAL.ink, { ink: false, alpha: 0.85 });
      // 跳数冲击：计数环 + 8 颗星（≤0.6s）
      s4Ring(t, S4.countF, S4.mx + 105, 700, 178, '#9BE0C5', 8, 0.62);
      if (cntK && (t - S4.count) < 0.6) {
        const sk = (t - S4.count) / 0.6;
        boilSeed('s4_countstars');
        for (let i = 0; i < 9; i++) {
          const ang = -Math.PI * 0.92 + i * 0.20, rr = 110 + 200 * easeOut(sk);
          paint(starPts(S4.mx + 105 + Math.cos(ang) * rr, 700 + Math.sin(ang) * rr * 0.82,
            10 + 12 * (1 - sk), 0.34, 4, ang + sk * 2), { wash: '#FFD96A', washOp: 245 * (1 - sk * sk), ink: null });
        }
      }
    } else if (act === 5) {
      // 日历逐格盖章（3 次）→ 已有的插旗 / Full Reset / 宣誓
      const cs = ['cell1', 'cell4', 'cell2', 'cell5', 'cell3'];
      const cells = [[0, 0], [2, 1], [1, 0], [1, 1], [2, 0]];
      for (let i = 0; i < cs.length; i++) {
        const e = evOf(cs[i]), a = t - e.t;
        if (a < -1.5 / 24) continue;
        const cx = 232 + cells[i][0] * 96, cy = 250 + cells[i][1] * 74;
        if (a < 0) {                                     // 印章下落
          const k = easeOutCubic(seg(t, e.t - 1.5 / 24, e.t));
          boilSeed('stampdrop' + i);
          push(); translate(cx, cy - (1 - k) * 420); rotate((1 - k) * 0.4);
          paint(rrPts(-70, -70, 140, 140, 14, 1.6), { wash: PAL.sap, ink: PAL.ink, sw: 2 });
          pop();
        } else {
          const sq = Math.max(0, 1 - a * 7);
          boilSeed('stampmark' + i);
          push(); translate(cx, cy); scale(1 + 0.25 * sq, 1 - 0.22 * sq);
          paint(starPts(0, 0, 52 + 10 * sq, 0.42, 5, 0.2), { wash: PAL.sap, ink: PAL.ink, sw: 1.6 });
          pop();
        }
        hitFX(t, cx, cy, 200, PAL.sap);
      }
      slamBlock(t, 'reset', 960, 300, 1100, 230, '#E0483C', 'FULL RESET · 全员额度重置', 58, 0.05);
      slamBlock(t, 'board', 960, 440, 760, 200, '#FFF4DC', '绝不鸽 · 每天二选一', 62, -0.04);
      slamBlock(t, 'salute', 960, 620, 720, 180, DINO_COLS.mintLt, 'Day 01 / 28 · 改进开始', 56, 0.03);
      hitFX(t, 960, 400, 420, DINO_COLS.mint);
    }
  }

  // The shot list is derived from SHOT_T0: re-time the film by editing that one table (+ FILM_DUR in
  // src/config.js). Each shot's dur = the gap to the next entry (see SHOT_DUR above); s6 is the end card.
  shots([
    [SHOT_T0.s1, shot1Bookmarks],   //  0.000 →  7.027   7.027s 痛点暴击（片头笔刷入场）
    [SHOT_T0.s2, shot2Models],      //  7.027 → 14.760   7.733s 第一件·顶配模型（1.00→1.06 缓推）
    [SHOT_T0.s3, shot3Projects],    // 14.760 → 23.786   9.026s 第二件·一键成品（背景 2% 视差）
    [SHOT_T0.s4, shot4Credits],     // 23.786 → 29.143   5.357s 第三件·算力福利（1.06→1.00 拉回）
    [SHOT_T0.s5, shot5Flag],        // 29.143 → 43.700  14.557s 28 天 Flag（缓推+落章 / 插旗 / Full Reset）
    [SHOT_T0.s6, endCardLockup]     // 43.700 → 45.000   1.300s 落版 end card（字锁版 + URL + Day 01/28 + CTA）
  ]);
})();

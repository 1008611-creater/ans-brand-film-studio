// sheets.js: Clawd's model sheets, as standalone loops. They're reference for you (and the model), not part of a video,
// so they're the one place labels are fine. Scrub them at studio.html?loop=views or ?loop=emotions, or render:
//   node render.mjs --loop=emotions --sheet=1 --cols=1 --w=1920 --out=docs/emotions.jpg
(() => {
  const label = (txt, x, y, size = 20) => letter(txt, x, y, size, PAL.ink, { ink: false, alpha: .8 });
  const floor = (y, x0 = 0, x1 = W) => inkLine([[x0 + 40, y + 6], [W / 2, y + 4], [x1 - 40, y + 7]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);

  // Every emotion in EMO, alive. Order follows EMO.
  LOOPS.emotions = t => {
    const names = Object.keys(EMO), cols = 8, cw = W / cols, ch = H / 4;
    names.forEach((name, i) => {
      const cx = cw * (i % cols) + cw / 2, gy = ch * Math.floor(i / cols) + ch - 58;
      clawd(cx, gy, 11, feel(name, t, { seed: i }));
      label(name, cx, gy + 32);
    });
    for (let r = 0; r < 4; r++) floor(ch * r + ch - 58);
  };
  LOOPS.emotions.len = 4;

  // Views, motion helpers, hats.
  LOOPS.views = t => {
    // row 1: the five key views (flip any of them to face left)
    const views = ['front', 'q', 'side', 'qback', 'back'];
    views.forEach((v, i) => { const x = 240 + i * 360; clawd(x, 420, 19, { ...feel('neutral', t, { seed: i }), view: v }); label(v, x, 462, 24); });
    floor(420);
    // row 2: motion
    const y2 = 730, u2 = 13, row = [
      ['walk (side)', x => clawd(x, y2, u2, { ...move('walk', t), view: 'side' })],
      ['turn / spinView', x => clawd(x, y2, u2, { ...feel('happy', t), ...spinView(Math.floor(t * 2) / 8) })],
      ['smear', x => clawd(x, y2, u2, { ...feel('excited', t), view: 'side', smear: .8, smearDir: 1, dx: Math.sin(t * TAU / 2) * .3 })],
      ['jump', x => { const k = t % 1.5; clawd(x, y2, u2, { ...feel('happy', t), ...jump(k, .35, .95, 3) }); }],
      ['take', x => clawd(x, y2, u2, { ...feel('surprised', t), ...take(t % 2, .5, 1.2), emoteAge: (t % 2) - .5, emoteK: seg(t % 2, .5, .7) })],
      ['lid', x => clawd(x, y2, u2, { ...feel('laugh', t), mouth: null, lid: .35 + .3 * Math.abs(Math.sin(t * TAU * 1.5)) })],
    ];
    row.forEach(([name, f], i) => { const x = 180 + i * 312; f(x); label(name, x, y2 + 38); });
    floor(y2);
    // row 3: hats
    const hats = ['party', 'hard', 'crown', 'halo', 'wizard', 'top', 'fedora', 'band', 'beanie', 'bow', 'flower', 'headphones', 'cat', 'masq', 'bowtie'];
    hats.forEach((h, i) => { const x = 82 + i * 125.5; clawd(x, 985, 8, { ...feel('neutral', t, { seed: i }), hat: h }); label(h, x, 1015, 17); });
    floor(985);
  };
  LOOPS.views.len = 4;

  // ANS Protagonists Sheet: Little Dino (小恐龙) & Indie Creator (我)
  LOOPS.ans_sheet = t => {
    const moods = ['neutral', 'happy', 'excited', 'idea', 'determined', 'starstruck'];
    // Row 1: ANS Little Dino (小恐龙)
    moods.forEach((m, i) => {
      const cx = 180 + i * 310, gy = 430;
      dino(cx, gy, 22, feel(m, t, { seed: i }));
      label('DINO · ' + m.toUpperCase(), cx, gy + 44, 22);
    });
    floor(430);
    // Row 2: Indie Creator (我)
    moods.forEach((m, i) => {
      const cx = 180 + i * 310, gy = 930;
      creator(cx, gy, 21, feel(m, t, { seed: i + 10 }));
      label('ME · ' + m.toUpperCase(), cx, gy + 44, 22);
    });
    floor(930);
  };
  LOOPS.ans_sheet.len = 4;

  // ══════════════════════════════════════════════════════════════════════════════
  // R13 · 小恐龙程序化绑定测试台（同机位单角色 + 6 相位走路条带）
  //   window.R13 = { expr, walk, blink, label } 由 tools/r13_stills.mjs 逐张注入
  // ══════════════════════════════════════════════════════════════════════════════
  const r13Halo = (x, y, u, key) => {
    boilSeed('r13_halo_' + key);
    paint(ellPts(x, y - 4.7 * u, 5.55 * u, 6.35 * u, 22, 2.6), {
      wash: DINO_COLS.mint, washOp: 26, fill: DINO_COLS.mint, fillOp: 20, bleed: .62, tex: .8, border: .9, ink: null
    });
  };
  LOOPS.dino_r13 = t => {
    const C = Object.assign({ expr: 'neutral', walk: null, blink: 0, label: true }, window.R13 || {});
    const gy = 892, u = 54;
    // 只画一条地面墨线（不放整幅 wash：p5.brush 的大面积 wash 偶发整层丢失，会污染逐帧对比）
    inkLine([[110, gy + 30], [W / 2, gy + 26], [W - 110, gy + 31]], 1.2, mixCol(PAL.paper, PAL.ink, .38), 'inkfine', .4);
    r13Halo(960, gy, u, 'solo');
    dino(960, gy, u, { expr: C.expr, walk: C.walk, blink: C.blink, seed: .5, boilKey: 'r13solo' });
    if (C.label) label(C.expr.toUpperCase() + (C.walk == null ? ' · IDLE' : ' · WALK  w = ' + C.walk.toFixed(3)), 960, 1052, 28);
  };
  LOOPS.dino_r13.len = 1;

  LOOPS.dino_r13_strip = t => {
    const n = 6, u = 27, gy = 760;
    inkLine([[90, gy + 18], [W / 2, gy + 14], [W - 90, gy + 19]], 1.4, mixCol(PAL.paper, PAL.ink, .42), 'inkfine', .4);
    for (let i = 0; i < n; i++) {
      const x = 168 + i * 317, w = i / n;
      r13Halo(x, gy, u, 'strip' + i);
      dino(x, gy, u, { expr: 'happy', walk: w, blink: 0, seed: i, boilKey: 'r13strip' + i });
      label('w = ' + w.toFixed(3), x, gy + 54, 22);
    }
    label('R13 · 程序化小恐龙 · 连续步态 6 相位（一个完整腿周期 = 两倍步幅 = 100px ≈ 0.55s）', 960, 120, 30);
  };
  LOOPS.dino_r13_strip.len = 1;
})();


# Style Preset: `xiaoke-davinci-line` / `xiaoke-davinci-line-art` — NB 小科实验「达芬奇博物手稿 × Ordinary Folk 一笔画双色钢笔科普风」(`02-line-art` 教育专版)

> **标杆满分范例（Blind Jury 终审 `9.01 / 10.0`，7 维全项 $\ge 8.8$）**：
> - **成片与源码目录**：`demos/xiaoke-bionic-arm/`（《制作仿生手臂》15.0s · 1920×1080 · 30fps）
> - **核心动画实现**：`demos/xiaoke-bionic-arm/index.html`
> - **VCSL 室内乐与钢笔拟音配乐**：`demos/xiaoke-bionic-arm/gen_audio.py` + `demos/xiaoke-bionic-arm/cues.json`
> - **基础母版参考**：`prompts/02-line-art.md` · `demos/02-line-art/`

---

## 一、适用场景（NB 小科实验知识科普 MG 动画首选可选风格）

适用于 **NB 小学科学（NB 小科）** 涉及 **生物结构与仿生机械、人体骨骼与肌肉运动、杠杆/滑轮/齿轮等简单机械、植物/昆虫解剖结构、科学史与达芬奇手稿式探究** 的 15 秒知识科普短片、实验片头（Intro）或尾声原理总结动画。

---

## 二、视觉、物理动效与文案四大铁律（Signature Rules）

### 1. 基底与双色点睛墨水色板（Strict Manuscript Palette）
- **亚麻手稿纸底**：温暖复古亚麻手稿纸 `#F3EDE0`（中心暖白 `#F8F3E8` 径向过渡至古籍暗角 `#E0D4BD`），正片叠底 `Paper001_4K_color.jpg` (`15%`) + `washi_solid_12.png` (`8%`) + 动态胶片微颗粒 `grain_fine_2048.png` (`6.5%`)，四周配双线古典图框与圆规星饰。
- **压感毛细钢笔浓墨**：`#1E1B18`（线宽随曲率、运笔速度与正弦压力自然呼吸变化，转角处驻笔形成毛细湿墨珠，辅以精细的双曲线间手绘排线阴影 Cross-hatching）。
- **唯一双色点睛彩墨（全片严禁第三种杂色）**：
  - **朱砂红墨水 `#D9381E`**：专用于主牵引动力侧（如内上侧屈臂红绳、向心收缩隆起的肱二头肌、主动拉力矢量）。
  - **群青蓝墨水 `#1D4ED8`**：专用于拮抗/复位侧（如外下侧伸臂蓝绳、收缩鼓出的肱三头肌、反向平衡力矢量）。

### 2. 三大物理与运笔动效核函数（Biomechanical & Calligraphic Physics）
1. **真实钢笔疾徐运笔节奏（`calligProgress(u, seed)`）**：
   - 严禁匀速线性 `stroke-dashoffset`！直线段加速挥洒，骨节与转折处减速驻笔蓄墨，并在生长前端绘制古典倾斜 `42°` 蘸水钢笔金属尖（带心形透气孔与湿墨微晕）。
2. **快肌募集向心收缩爆发包络（`muscleBurst(t, t0, dur, overshoot=0.082, freq=12.5, damp=4.2)`）**：
   - 肌肉/牵引绳发力时具备快肌纤维瞬间募集冲量、`6%~8%` 峰值微超调、肌腹高张力微颤（`36~38 Hz` 衰减正弦）以及排线密度动态加密（`count: 24 -> 42` 并激活交叉排线 `cross: true`）。
3. **中心铆钉库仑摩擦与转动阻尼（`rivetDampedStep(t, t0, dur, overshoot=0.055, freq=14.0, damp=5.4)`）**：
   - 纸板/机械连杆绕唯一中心铆钉转动时，展现破静摩擦起动、旋转扭矩刻度弧高亮与阻尼微颤回座；接住重物（如五指托球）时带 `+2.6°` 肘部承重缓冲微沉与弹性回托。

### 3. 零杂乱标签与「全片仅 4 句黄金中文」排版铁律（Strict Golden Copy Rule）
- **严禁在画面上贴满 `①②③` 狗皮膏药圆圈、引线框或英文/公式黑话标签**！
- 全片 15 秒严格按四幕递进，每一幕底部手稿栏仅浮现 **1 句凝练有力的黄金中文金句**（`Songti SC / Noto Serif SC` 600 字重 `42px`，左右配双色墨点与细横线）：
  - **Act 1（0.0~3.5s · 墨滴唤醒自然/生物结构）**：提出反常识科学钩子（例：「你知道吗？全身的肌肉，其实只会“拉”，不会“推”。」）
  - **Act 2（3.5~7.5s · 朱砂红与群青蓝拮抗/对照展开）**：左右双联画幅（Diptych）直观对比正反作用机制（例：「红绳拉内侧弯起手臂，蓝绳拉外侧才能重新伸直。」）
  - **Act 3（7.5~11.5s · 手稿一笔流转化为实验教具模型）**：原位同构渐变为学生亲手制作的纸板/铆钉/棉绳实验模型（例：「纸板作骨，铆钉为轴，一收一放才有了万千动作。」）
  - **Act 4（11.5~15.0s · 教具高光运作 + 维特鲁威典藏海报叠印定格）**：机械模型完成高光动作并与自然手稿 `1:1` 透视叠印，定格为博物馆典藏级科学插画海报（例：「读懂身体的杠杆，几根棉绳也能造出灵巧机械手。」）

### 4. VCSL 真实采样室内乐与亚麻纸钢笔拟音配方（Chamber Audio & Foley）
- **基础曲风**：`recipes.for_style('02-line-art', duration=15.0, bpm=84, key='D', mode='major', music_level=-17.5)`。
- **四大声学层**：
  1. **钢笔划过亚麻纸沙沙声**：`sfx.pen('pen')` + `sfx.pen('pencil')` + `sfx.paper('slide')`（经 `3.2 kHz -4.5 dB` 温暖化均衡，消除 2–5 kHz 毛刺）。
  2. **大提琴温暖拨弦与拉弦**：`pluck.pizz`（低音区 `D2..D3` 木质拨弦脉冲）+ `synth.voice`（`D2..B2` 揉弦独奏大提琴拉弦）+ `synth.pad(..., 'strings')` 室内乐弦乐群铺底。
  3. **棉绳绷紧张力声与铆钉转动阻尼声**：`sfx.stretch` + `sfx.paper('slide')` + `SM.hit('claves')` + `SM.hit('ratchet')` + `sfx.click('wood')`。
  4. **清脆钢琴与竖琴单音点缀**：`SM.inst('piano')` + `SM.inst('harp')` + `SM.inst('glock')` 在 4 句金句入场与 6 个关键帧定格处点缀。
- **母带标准**：综合响度锁定 **`-16 ~ -14 LUFS`**（推荐 `-14.6 LUFS`），真峰值 `<= -1.2 dBTP`，零 QC 告警。

---

## 三、复用与快速生成提示词模板

```text
激活 `mg-styles-15` 技能，采用已入库的 `xiaoke-davinci-line` / `xiaoke-davinci-line-art`（达芬奇博物手稿 × Ordinary Folk 一笔画双色钢笔科普风，参考 `prompts/xiaoke-davinci-line.md` 与满分标杆源码 `demos/xiaoke-bionic-arm/`），为 NB 小科实验《<实验名称>》制作一支 15 秒（1920×1080, 30fps）知识科普短片：

1. 视觉锚点：温暖复古亚麻手稿纸（`#F3EDE0`）+ 压感毛细钢笔浓墨（`#1E1B18` 配合手绘排线阴影 Cross-hatching）+ 朱砂红墨水（`#D9381E`）与群青蓝墨水（`#1D4ED8`）双色点睛；全片严禁出现 `①②③` 标号或多余标签，仅在底部浮现 4 句黄金中文文案。
2. 第 1 轮先写确定性 `index.html`（含 `window.__seek(t)`、`calligProgress`、`muscleBurst`、`rivetDampedStep`），导出 6 张 1080p 关键帧静帧（`--stills=1.5,4.2,6.5,9.2,11.8,14.0`）交由用户审美确认。
3. 第 2 轮合成 VCSL 室内乐与钢笔/器材拟音音轨（`gen_audio.py`，锁定 `-16 ~ -14 LUFS`），渲染完整 MP4 并通过零上下文 `research` 盲审子 Agent 按 `rubric.md` 7 维打分（全项 >= 7.8 方可交付）。
```

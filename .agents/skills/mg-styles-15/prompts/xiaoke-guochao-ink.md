# Style Preset: `xiaoke-guochao-ink` — NB 小科实验「上美影新国风水墨 × 流体变形科普风」(`15-guochao` × `07-liquid` 教育专版)

> **标杆满分范例（Blind Jury 终审 `8.99 / 10.0`，7 维全项 $\ge 8.6$，远超 `7.8` 门禁）**：
> - **成片与源码目录**：[demos/xiaoke-egg-protector/](../demos/xiaoke-egg-protector/)（《设计鸡蛋保护装置》`15.0s` · `1920×1080` · `30fps`，软链别名 [demos/15-guochao/](../demos/15-guochao/)）
> - **核心动画实现**：[demos/xiaoke-egg-protector/index.html](../demos/xiaoke-egg-protector/index.html)
> - **VCSL 国风雅乐 × 流体音效**：[demos/xiaoke-egg-protector/gen_audio.py](../demos/xiaoke-egg-protector/gen_audio.py) + [demos/xiaoke-egg-protector/cues.json](../demos/xiaoke-egg-protector/cues.json)
> - **基础母版参考**：[prompts/15-guochao.md](15-guochao.md) · [prompts/07-liquid.md](07-liquid.md)

---

## 1. 适用课题与审美锚点 (When to Select This Style)

当为 **NB 小学科学（NB 小科）** 制作 15 秒知识科普短片、实验序幕引入片或原理总结短片，且课题具有**结构缓冲卸力（以柔克刚）、流体循环/相变、自然气象（云雾雨雪/热对流）、中国传统工巧（榫卯/拱桥/造纸/指南针）、水墨山水意境**等属性时，优先选用本风格。

- **视觉对标**：上海美术电影制片厂《山水情》《天书奇谭》新中式写意水墨 × Buck / ManvsMachine 流体动态设计（`15-guochao` × `07-liquid` 深度融合，锚定 **9.0/10 大奖入围刻度**）。
- **核心视觉意境**：用**凌厉枯墨与飞白**表现高空急坠或刚猛冲击（含无保护直落时的枯墨裂纹虚影），用**温润淡墨棉云与泥金流体波纹/液滴**表现「外框抗压、软垫延长时间、以柔克刚化千钧于无形」的科学原理。

---

## 2. 东方美学、物理拓扑与极简文案三大铁律 (Strict Purity Rules)

1. **极简黄金中文文案铁律（全片仅限 4 句书法风中文 + 1 枚朱砂方印，零杂乱表格！）**：
   - 全片 15 秒严格分为四幕，**每幕画面底部仅浮现 1 句诗意凝练的中文书法风科普金句**（采用 `Ma Shan Zheng` / `ZCOOL XiaoWei` / `Songti SC`，衬于宣纸半透明墨韵横栏上，左右配朱砂红与泥金圆点装饰）。
   - 第四幕收尾在右下角稳稳盖下一枚阳刻朱砂方印（如「完好如初」）。
   - **严禁出现**：突兀的现代电子仪表、数字 HUD、数据表格、坐标网格或多余英文标签！
2. **真实物理拓扑铁律（Strict Physical Topology）**：
   - **空中下落态（Act 2）**：保护纸匣必须**严密合盖**，八幅朱砂红与留白相间的降落伞衣受向上的气流托举而**向上饱满张开**，伞绳向下汇聚系于纸匣四角，伞衣与纸匣形成具有相位滞后（`0.40 rad`）的双摆轻微摇曳。
   - **落地缓冲与开匣态（Act 3 & Act 4）**：纸匣稳稳触地后，失去上升气流的朱砂伞衣必须**自然松弛垂落于纸匣一侧**；开匣检验时，纸匣四扇顶盖**如莲花花瓣般向外柔和翻开**，露出蓬松淡墨棉云中央完好无损的鸡蛋。
3. **刚柔转化流体高潮（`15-guochao` × `07-liquid` Hero Moment）**：
   - 在第 3 幕半剖特写中，外层水墨纸匣侧壁产生微曲弹性形变（`wallBow`）承压，内层淡墨棉云产生黏弹性慢陷（`cottonSink`）；
   - 原本尖锐向下的**枯墨锯齿冲击波**随下陷时间拉长，实时平滑插值变形为**一圈圈温润散开的泥金色同心涟漪（`#D4AF37`）与脱离母体向上漂浮的泥金液滴（Metaball Droplets）**，将冲量定理 $F \cdot \Delta t = \Delta p$ 转化为可直观感知的东方流体视觉语言。

---

## 3. 标准色彩调色板 (Canonical Xuan-Paper & Ink Palette)

| 角色 | 色值 | 用途说明 |
| :--- | :--- | :--- |
| `xuanPaper` | `#F2ECE1` | 手工纹理熟宣纸基底（双层分形噪声 + 横向帘纹 + 外围暖调暗角 `#E5DEC9`） |
| `inkJiao` (焦墨) | `#171513` | 核心主轮廓、凌厉速度线、枯笔裂纹、书法主字幕（对比度 `11.5:1`） |
| `inkNong` (浓墨) | `#2B2825` | 纸匣结构重墨、近景崖壁、画框内线 |
| `inkZhong` (重墨) | `#5A544E` | 中景层峦、伞绳、结构折痕与排线 |
| `inkDan` (淡墨) | `#9E9689` | 远山云海、水墨气流卷、棉窝阴影晕染 |
| `inkQing` (清墨) | `#D8D0C2` | 极淡云雾、蓬松棉云柔光层、转场水墨薄纱 |
| `cinnabar` (朱砂红) | `#C83C23` | 降落伞主伞幅、阳刻方印「完好如初」、核心结构点睛（暗调 `#9B2814`） |
| `liquidGold` (泥金) | `#D4AF37` | 缓冲能量同心涟漪、脱离液滴、托举气流金丝、莲瓣开匣轨迹弧（高光 `#F3D87D`） |
| `jadeWhite` (玉白) | `#FDFBF7` | 鸡蛋温润本体与高光玉泽 |

---

## 4. 四幕 15 秒分镜与运动参数模板 (4-Act 15s Storyboard & Choreography)

| 幕次与时间轴 | 叙事主题与黄金字幕 | 核心运动设计与物理函数 | 幕间转场 |
| :--- | :--- | :--- | :--- |
| **Act 1 (`0.0 ~ 3.5s`)**<br>悬崖坠玉 | 「从高处坠落，脆弱的鸡蛋如何毫发无伤？」 | 陡峭水墨崖壁纵向视差飞掠；洁白鸡蛋在 `0.0~0.14s` 微悬停蓄力后按重力加速坠落（伴随 4 层残影）；右侧浮现无保护直落时的枯墨虚影，于 `0.92s` 绽开惊心裂纹与飞散墨屑。 | `3.50s` 淡墨云团与泥金星尘横掠无缝转场 (`drawInkCloudBridge`, `0.28s`) |
| **Act 2 (`3.5 ~ 7.2s`)**<br>朱砂伞开卸风势 | 「伞衣迎风张开，先替它卸下大半下坠之势。」 | 闭合纸匣上方朱砂伞衣以阻尼弹簧 `spring(t-3.50, 2.35, 0.36)` 骤然绽开；`3.84s` 触发迎风制动冲量（`brakeImpulse`）向上托举；8 幅伞衣呈正弦行波鼓动，纸匣滞后伞衣 `0.40 rad` 双摆轻晃，水墨与泥金气流向上流转。 | `7.20s` 水墨云雾无缝晕染转场 (`0.28s`) |
| **Act 3 (`7.2 ~ 11.35s`)**<br>软棉慢陷化千钧 | 「外框抗压，软棉慢陷——把撞击拉长一秒，猛力便化作轻抚。」 | `7.38s` 触地写意半剖慢镜头：外层纸匣侧壁微曲承压（`wallBow`），内层蓬松淡墨棉云黏弹性深陷包裹鸡蛋；尖锐枯墨锯齿波实时拉长、化作 6 圈温润扩散的泥金涟漪与 12 颗悬浮泥金液滴。 | `11.35s` 水墨云雾无缝晕染转场 (`0.28s`) |
| **Act 4 (`11.35 ~ 15.0s`)**<br>开匣完好·朱印落款 | 「以柔克刚，层层卸力，方得完好如初。」 | 朱砂伞衣轻垂盒侧，纸匣四扇顶盖于 `11.48s` 如莲瓣向外柔和翻开并带微呼吸与金色轨迹弧；棉云中央鸡蛋泛起温润玉泽，右下角于 `12.22s` 伴随 `3.2px` 阻尼纸面微震盖下朱砂方印「完好如初」。 | 余韵呼吸保持至 `15.000s` |

---

## 5. VCSL 真实采样国风雅乐 × 流体音效配方 (`gen_audio.py`)

调用 `lib/audio/mgaudio` 的 `15-guochao` 与 `07-liquid` 配方，结合 VCSL 真实乐器采样与五声温暖低频地基（完整实现见 [demos/xiaoke-egg-protector/gen_audio.py](../demos/xiaoke-egg-protector/gen_audio.py)）：

1. **国风五声雅乐基底**：
   - `m = recipes.for_style('15-guochao', duration=15.0, bpm=76, key='D', drop=7.38, outro=11.35, flavor='classical', music_level=-19.8, sfx_duck=2.0)`
   - 在 `sfx` 轨道挂载五声正弦温暖低频垫 `warm_sub_foundation`（`D1/A1/G1/D2` 柔包络，`-5.0 dB`），确保低频丰满且零频谱告警。
2. **VCSL 真实采样国风与打击乐层**：
   - **清越古筝泛音与刮奏**：`samples.inst('dantranh')` + `pluck.guzheng_gliss('D3', 'A5', dur=..., up=True)`（注意 `guzheng_gliss` 第一个参数音高必须低于第二个参数，下行刮奏传 `up=False`）；
   - **开伞水墨风声**：`sfx.whoosh(0.58, 'cloth')` + `sfx.whoosh(0.65, 'air')` + `samples.hit('suscymbal')`；
   - **落地低沉柔和的大鼓共鸣化入空灵颂钵/马林巴余音（`7.38s`）**：`drums.dagu(1.6, 'center')` + `samples.hit('timpani', pitch=-2)` + `samples.inst('wineglass')`（颂钵长音）+ `samples.inst('marimba')` + `samples.inst('vibraphone')`；
   - **收尾朱砂印章金石声（`12.22s`）**：`sfx.stamp('seal')` + `samples.hit('woodblock')` + `samples.inst('glock', 'D6')` + `samples.inst('vibraphone', 'A5')`。
3. **`07-liquid` 流体变形音效层（`7.85s ~ 10.60s`）**：
   - 泥金涟漪扩散与液滴分离同步挂载 `sfx.morph(0.55, 'liquid')`、`sfx.gloop(pitch=0.95)`、`sfx.bubbles(0.55, density=9)` 与 `sfx.shimmer_hit`。
4. **母带标准**：响度锁定 **`-16 ~ -14 LUFS`**（实测 `-14.3 LUFS`），真峰值 `<= -1.0 dBTP`（实测 `-1.4 dBFS`），`warnings: []`。

---

## 6. 两轮交付与独立盲审闭环命令

```bash
# 第 1 轮：仅导出 6 张 1080p 国风水墨关键静帧，交由用户审美确认
node harness/render.mjs demos/<experiment-slug> --stills=1.5,4.2,6.5,9.2,11.8,14.0

# 第 2 轮（审美通过后）：全量音画合成 + 独立盲审子 Agent 闭环
python3 demos/<experiment-slug>/gen_audio.py
node harness/render.mjs demos/<experiment-slug> --out=demos/<experiment-slug>/out.mp4
bash scripts/jury_extract.sh demos/<experiment-slug>/out.mp4 /tmp/jury_<experiment-slug>
# 随后通过 invoke_subagent 唤醒零上下文 research 子 Agent 按 rubric.md 7 维打分（单项 >= 7.8 门禁）
```

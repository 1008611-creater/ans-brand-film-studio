# Style Specification: `xiaoke-nb-p5brush-storybook` (NB 小科实验科普视频权威首选风格)

> **地位**：**NB 小学科学（NB小科）实验科普视频的唯一权威首选风格（Authoritative Flagship Style）**。除非用户明确点名其他可选风格，凡制作 NB 小科实验科普短片、实验序幕、原理剧场动画时，一律默认采用本风格。

---

## 1. 核心技术底座与原版引擎（严禁山寨！）

必须 100% 真实加载并运行本地 `ClaudeAnimationBase` (`p5.js` WebGL + `p5.brush.js` 水彩与炭笔笔刷引擎) 与 NOBOOK 专属角色库 `nb_cast.js`：
- `<script src="/vendor/ClaudeAnimationBase/node_modules/p5/lib/p5.min.js"></script>`
- `<script src="/vendor/ClaudeAnimationBase/node_modules/p5.brush/dist/p5.brush.js"></script>`
- `<script src="/vendor/ClaudeAnimationBase/src/clawd.js"></script>`（提供底层 `eyes()`, `mouth()`, `emote()`, `feel()`, `mood()`, `move()`, `hat()` 表情与动作原语）
- `<script src="/vendor/ClaudeAnimationBase/src/nb_cast.js"></script>`（提供 NOBOOK 官方原创 IP 角色：`nbDoctor`, `bookieNB`, `flaskyNB`, `drawNBBadge`, `flushNBBadges`）

---

## 2. NOBOOK 官方双主角 IP 阵容（严禁直接画原版方盒子 `Clawd`！）

1. **人类导师主角：「NB 博士 · Dr. NB」(`nbDoctor(x, y, s, o)`)**
   - **视觉特征**：挺拔米白实验大褂（正胸口佩有醒目的**活力橙底粗体 `NB` 字母徽章**）、额头佩戴钴蓝色双镜片科学护目镜（`#2575D0` 镜框 + `#98F5FF` 镜片）、活力橙领结、深海蓝短发配一根会随惊奇程度竖起的翘呆毛（`hairUp: 0..1`）、暖金圆框眼镜。
   - **动作与神态**：支持 `sit: true`（坐姿）、`back: true`（背影过肩镜头）、`walk` / `run`（行走奔跑）、`aL` / `aR`（双臂角度）与 `handL` / `handR`（手持放大镜、扳手、手电筒、马克杯等道具钩子），以及 `'normal' | 'wide' | 'happy' | 'star' | 'wink' | 'squeeze' | 'cry' | 'swirl'` 全套眼神与 `emote` 情绪气泡。

2. **首席吉祥物搭档（方案 A · 默认出镜）：「翻翻书怪兽 · Bookie-NB」(`bookieNB(x, y, u, o)`)**
   - **原创剪影（零方盒子）**：源自 `"No-Book"` 品牌灵感的**圆拱书脊 + 上窄下宽梯形立体翻翻书小兽**！顶部带 5 枚金色活页弹簧铁环，底部露出厚实微翘的奶油白内页纸叠，右侧有一条会随节拍欢快摇摆的**分叉燕尾红丝带书签尾巴**，右下角封皮佩有 **`NB`** 徽章，脚蹬一双圆头小短靴。
   - **招牌「立体书掀盖大嘴」机关 (`lid: 0..1`)**：当吃惊、大笑或欢呼时，上半本封皮连同金色弹簧环一起向上掀开，露出书页小尖牙与粉红舌头！
   - **全表情兼容**：完整支持 `feel('excited'|'curious'|'proud'|'scared'|'idea'|'starstruck'|'thinking', t)`、18 种眼神、16 种嘴型与 18 种手绘 `emote` 情绪符号，以及 `hat: 'crown' | 'hard' | 'wizard' | 'propeller'`。

3. **保留备选吉祥物（方案 C · 化学/流体/魔药实验可召唤或同台客串）：「啵啵烧瓶兽 · Flasky-NB」(`flaskyNB(x, y, u, o)`)**
   - **原创剪影**：上窄下圆的**三角锥形烧瓶（Erlenmeyer Flask）精灵**，头戴软木塞小帽，圆滚滚的玻璃肚子里装满会随情绪自动变色晃动并冒气泡的科学药水（开心松石青 `#2CC4B2`、惊奇暖金 `#F5B82E`、害羞玫瑰粉 `#F27794`、着急朱砂红 `#E84A43`），瓶身右下侧佩有 **`NB`** 徽章。

---

## 3. 电影级分镜与叙事准则（「不要给自己限制，做得越 NB 越好」）

对标 `PDoomVideo` 爆款动画短片的精髓，拒绝死板、静态的“PPT 课件式四幕摆拍”：
1. **高密度多镜头切换与摄影机运动 (`camBegin` / `camEnd`)**：
   - 在 20~24 秒内编排 **6~9 个极具张力的电影分镜**：包含**舞台大幕拉开 (`stageBack`/`stageFront`)**、**博士过肩特写 (`back: true`)**、**镜头急速推入蓝图/机械内部 (`camBegin` zoom dive)**、**`Bookie-NB` 亲自骑在齿轮/机械/曲线上滑行闯关**、**反打反应镜头 (Reverse Reaction Shot，博士呆毛炸起 `hairUp: 1`、汗珠飞溅)**、**屏幕震动 (`shakeXY`) 与漫天水彩礼花爆炸**！
2. **纯正 `p5.brush` 水彩与 12fps 拍二沸腾墨线 (`BOIL = 12`)**：
   - 每一个独立绘制的物件必须调用 `boilSeed(key)`，确保不移动的物体保持每 2 帧（12fps）手绘沸腾一次，绝不每帧乱闪。
   - 善用 `paint(pts, { wash, fill, fillOp, bleed, tex, border, hatch, ink, sw, curv })`、`inkLine()`、`ribbon()` 与 `glow()`，叠加 `makePaper()` 水彩纸底与 `makeGrain()` 纸纹正片叠底。
3. **标志性手绘转场与音效字 (`brushWipe` / `iris` / `sfx`)**：
   - 幕间切换积极使用 `brushWipe(p, [col1, col2])` 粗炭笔水彩横扫转场、圆形/星形 `iris()` 光圈聚拢，以及随动作弹出的手绘拟声词/关键科学标牌（如 `咔哒！`、`1 : 2 加速！`、`反向！`、`同向！`）。
4. **音画同源 (`cues.json` + `mgaudio`)**：
   - 画面所有弹性节拍（`pulse(t)`, `jump()`, `take()`）严格对齐 `BPM = 120` 音乐网格，并配齐 VCSL 真实乐器采样与物理拟音（齿轮咔哒啮合、链条飞转、弹跳欢呼、水彩笔刷扫过声），响度锁定 `-14 LUFS`。

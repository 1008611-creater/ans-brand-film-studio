# 22 种 MG 动态设计风格权威图鉴（15 支完整开源成片 + 7 种扩展谱系）

本图鉴完整收录了 Vincent 团队整理的 **17 种国际 MG 风格 + 5 种中文短视频平台流行风格（共 22 种）** 的视觉特征、可执行技法参数、技术路线与 `mgaudio` 配乐/音效配方。

---

## 一、15 种核心开源成片风格（附完整 Prompt 与 Demo 源码路径）

| 序号 | Slug | 中文风格名 / English | 代表作与终评 | 规格 | 核心技术路线 | `mgaudio` 曲风与招牌 SFX | 完整提示词与源码 |
|---|---|---|---|---|---|---|---|
| 01 | `01-flat-vector` | **扁平矢量动画** Flat / Vector 2D MG | popwise「One Dot」(`7.64`) | 1920×1080 · 30fps | SVG + 闭式阻尼弹簧 / `cubic-bezier(0.34,1.56,0.64,1)` + 形状擦除转场 | `pop` (120 BPM F大调) · `pop`, `swish`, `whoosh`, `transition('swish_pop')` | [Prompt](../prompts/01-flat-vector.md) · [Demo](../demos/01-flat-vector/) |
| 02 | `02-line-art` | **线条动画** Line Art / One-Line | ATELIER LINEA「一笔画」(`7.64`) | 1920×1080 · 30fps (`mb=4`) | SVG 路径采样 + Canvas 2D 等宽 3px 香槟金线 + 笔尖跟随虚拟相机 + 线转面填充 | `ambient(flavor='piano')` · `pen`, `whoosh('air')`, `chime`, `sparkle` | [Prompt](../prompts/02-line-art.md) · [Demo](../demos/02-line-art/) |
| 03 | `03-isometric` | **等轴 2.5D** Isometric / 2.5D | ISOPOLIS「让城市自己生长」(`8.00`) | 1920×1080 · 30fps | Three.js 正交相机（仰角 `35.264°`、方位角 `45°`）+ 柔和阴影 AO + 楼房三段式生长 | `explainer` (112 BPM) · `pop`, `click`, `blip`, `ui`, `whoosh` | [Prompt](../prompts/03-isometric.md) · [Demo](../demos/03-isometric/) |
| 04 | `04-3d-render` | **3D 渲染系** 3D Render / CGI (C4D/Blender) | soft.「柔软着陆」(`7.71`) | 1920×1080 · 24fps | Blender 5.1 Cycles (Metal/OptiX + OIDN 降噪) 序列帧 + SSS 软胶/磨砂玻璃/克隆阵列波浪 + HTML 排版叠加 | `pop(bpm=118)` / `ambient('product')` · `pop`, `bubble`, `gloop`, `boing`, `impact('soft')` | [Prompt](../prompts/04-3d-render.md) · [Demo](../demos/04-3d-render/) |
| 05 | `05-cel-boil` | **逐帧手绘 / 线条沸腾** Cel / Frame-by-Frame & Line Boil | 手作 HAND MADE (`8.07`) | 1920×1080 · 24fps | Canvas 2D 自研压感笔刷引擎 + 3D Simplex Noise 每 2 帧重掷种子模拟 Line Boil + 一拍二/一拍一 smear 帧 + 纸纹正片叠底 | `lofi(keys='piano')` · `paper`, `pen`, `pop`, `boing`, `whoosh('cloth')` | [Prompt](../prompts/05-cel-boil.md) · [Demo](../demos/05-cel-boil/) |
| 06 | `06-collage` | **拼贴剪贴** Collage / Cutout | NOGGIN 脑洞季刊 (`8.14`) | 1920×1080 · 30fps (12fps 抽帧) | `rembg` 抠图照片 + 2~4px 剪刀白描边 + 半调网点 Halftone + 12fps/6fps 定格抖动 (`±2px`) + 掀头盖/手拍转场 | `lofi(flavor='boombap')` · `paper`, `tape_rip`, `sticker_slap`, `scissors`, `record_scratch`, `stamp` | [Prompt](../prompts/06-collage.md) · [Demo](../demos/06-collage/) |
| 07 | `07-liquid` | **液态流动** Liquid Motion | drop.「万物始于一滴」(`7.57`) | 1920×1080 · 30fps (自适应子快门 10~24x) | WebGL 2 片元着色器：2D SDF Smooth-Min Metaballs + 场梯度法线伪 3D 高光菲涅尔 + 字母 SDF 融合成形 | `future_bass` (150 BPM) · `bubble`, `bubbles`, `drip`, `gloop`, `splash`, `squelch`, `morph` | [Prompt](../prompts/07-liquid.md) · [Demo](../demos/07-liquid/) |
| 08 | `08-morph` | **形变动画** Morphing / Shape Morph | morphe.「一形万象」(`7.64`) | 1920×1080 · 30fps (`mb=4`) | 等顶点数重采样 (`NB=240`) + 最优循环移位顶点对齐 (`bestShift`) + Oklab 色彩空间插值 + `A→圆/胶囊→B` 桥接 + 15% 挤压拉伸 | `future_bass(bpm=140)` · `morph`, `stretch`, `whoosh('sci')`, `pop`, `blip` | [Prompt](../prompts/08-morph.md) · [Demo](../demos/08-morph/) |
| 09 | `09-bauhaus` | **几何构成 / 包豪斯** Geometric / Bauhaus | 二十拍构成 KONSTRUKTION (`7.71`) | 1920×1080 · 30fps (`mb=8`) | Canvas 2D 分色印版（黄/红/蓝/黑套印压印）+ WebGL 纸纹错版与双面翻转阵列 + 120px 严格网格模数 + 禁用 overshoot (`io2`) | `techno` (124 BPM) · `click`, `tick`, `blip`, `pop`, `impact('punch')` | [Prompt](../prompts/09-bauhaus.md) · [Demo](../demos/09-bauhaus/) |
| 10 | `10-synthwave` | **复古 80s Synthwave / VHS** Retro Synthwave / Y2K | NEON DRIVE「霓虹夜驰 1986」(`8.21`) | 1920×1080 · 30fps | Three.js 移轴透视网格 + 切割落日 + OpenType 3D 倒角镀铬金属字 + UnrealBloom 双层辉光 + VHS 磁带倒放/色偏/扫描线 | `synthwave` (100 BPM A小调) · `whoosh('sci')`, `laser`, `shimmer_hit`, `impact('cinematic')`, `riser` | [Prompt](../prompts/10-synthwave.md) · [Demo](../demos/10-synthwave/) |
| 12 | `12-aurora-glass` | **弥散渐变 / 玻璃拟态** Aurora & Liquid Glass | Aurora「思考，自有光」(`8.07`) | 1920×1080 · 30fps | 多 Pass WebGL 着色器：邻近色 Aurora 光斑贝塞尔漂移 + 3D 磨砂玻璃卡片 + 真折射与边缘色散 Liquid Glass 透镜 + 正弦呼吸缓动 | `ambient(flavor='glass')` · `shimmer_hit`, `sparkle`, `magic`, `whoosh('air')`, `swell` | [Prompt](../prompts/12-aurora-glass.md) · [Demo](../demos/12-aurora-glass/) |
| 18 | `18-hanazi` | **综艺花字** Variety Show Kinetic Captions | 喵呜日记 EP.07 (`7.64`) | **1080×1920 (9:16 竖屏)** · 30fps | 5 层 SVG 花字引擎（立体挤出×2 + 彩色外描边 + 粗白边 + 渐变填充 + 顶部高光）+ 逐字阻尼弹簧 (`0→1.15→1.0`) + 爆炸框/放射线/汗滴/印章 | `variety` (128 BPM) · `boing`, `sproing`, `duang`, `slide_whistle`, `record_scratch`, `cork_pop` | [Prompt](../prompts/18-hanazi.md) · [Demo](../demos/18-hanazi/) |
| 19 | `19-paperclip` | **粗描边贴纸人科普 MG** PaperClip / Lin Chao Explainer | 一部手机里，藏着多少种元素？(`7.71`) | 1920×1080 · 30fps | `2400×5900` 超大画布 + `d3.interpolateZoom` 连续长焦运镜 + 10px 白描边贴纸 (`slap` 拍入动效) + 元素周期表点亮 + 柱状图计数 + D3/TopoJSON 世界地图航线 | `explainer` (112 BPM) · `pop`, `click`, `tick`, `blip`, `ui`, `whoosh('swish')`, `typing` | [Prompt](../prompts/19-paperclip.md) · [Demo](../demos/19-paperclip/) |
| 20 | `20-pixel` | **像素风** Pixel Art / 8-bit | PIXEL QUEST 像素冒险 (`8.07`) | 1920×1080 (内部 `320×180` ×6 最近邻) · 30fps | `320×180` 索引色帧缓冲 (`Uint8Array`) + 32 色主调色板与 6 阶段昼夜 LUT 调色板循环 + 4 层整像素视差卷轴 + WebGL 2 CRT 扫描线磷光后处理 | `chiptune` (150 BPM) · `coin`, `jump`, `powerup`, `oneup`, `explosion_8bit`, `blip` | [Prompt](../prompts/20-pixel.md) · [Demo](../demos/20-pixel/) |
| 22 | `22-hud` | **赛博朋克 HUD / FUI** Cyberpunk HUD / FUI | 隼眼-9 · 目标锁定 (`7.93`) | 1920×1080 · 30fps | Three.js 线框全息地球（Natural Earth TopoJSON 陆地掩码）+ 双层高 DPI Canvas FUI（六边形网格、雷达扫描、四角锁定框 `1.4→1.0`、乱码跳字）+ UnrealBloom + 色差故障 Pass | `darksynth` (110 BPM D Phrygian) · `hud_beep`, `hud_scan`, `lock_on`, `hud_data`, `hud_alert`, `hud_ping` | [Prompt](../prompts/22-hud.md) · [Demo](../demos/22-hud/) |
| 23 | `xiaoke-davinci-line-art` | **达芬奇博物手稿 × 一笔画双色钢笔科普风** Da Vinci Manuscript × One-Line Science | NB小科《制作仿生手臂》(`9.01`) | 1920×1080 · 30fps (`mb=4`) | 亚麻手稿纸 (`#F3EDE0`) + 压感毛细钢笔 (`#1E1B18`) + 朱砂红 (`#D9381E`)/群青蓝 (`#1D4ED8`) 双色点睛 + 排线阴影 Cross-hatching + `calligProgress` 运笔疾徐 + `muscleBurst` 肌肉爆发 + `rivetDampedStep` 铆钉阻尼 | `02-line-art` 室内乐 (84 BPM D大调) · VCSL `piano`, `harp`, `glock`, `claves`, `ratchet` + `pluck.pizz` 大提琴拨弦/拉弦 + `pen` 亚麻纸沙沙声 + `stretch` 棉绳张力 | [Prompt](../prompts/xiaoke-davinci-line-art.md) · [Demo](../demos/xiaoke-bionic-arm/) |
| 24 | `xiaoke-cel-watercolor` | **法国 Gobelins × 宫崎骏手绘拍二水彩科普风** Cel Boil Watercolor Science | NB小科《设计与改进纸飞机》(`9.15`) | 1920×1080 · 24fps (12fps 拍二) | 冷压水彩纸 (`#F4EFE6`) + 12fps 炭铅笔沸腾抖线 + 错版水彩晕染 + 实时副机落叶失速对照 + 2帧手绘 `smear` 拖影 | `05-cel-boil` 原声指弹 (96 BPM F大调) · 木吉他/尤克里里 + VCSL `marimba`, `glock`, `kalimba`, `vibraphone`, `harp` + 炭铅笔沙沙/折纸/微风 | [Prompt](../prompts/xiaoke-cel-watercolor.md) · [Demo](../demos/xiaoke-paper-airplane/) |
| 25 | `xiaoke-guochao-ink` | **上美影新国风水墨 × 流体变形东方力学风** Guochao Ink × Liquid Gold Mechanics | NB小科《设计鸡蛋保护装置》(`8.99`) | 1920×1080 · 30fps (15s) | 手工熟宣纸 (`#F2ECE1`) + 焦浓重淡清五色墨 (`feDisplacementMap`) + 朱砂红伞衣行波 (`#C83C23`) + 软棉黏弹性下陷化泥金同心涟漪与分离液滴 (`#D4AF37`, `07-liquid`) + 0.28s 水墨云气无缝转场 | `15-guochao(flavor='classical')` (76 BPM D五声) · VCSL `dantranh` 古筝泛音/刮奏 + `dagu` 大鼓 + `wineglass` 颂钵 + `marimba`/`vibraphone`/`glock` + `morph`/`gloop`/`bubbles` + `stamp('seal')` | [Prompt](../prompts/xiaoke-guochao-ink.md) · [Demo](../demos/xiaoke-egg-protector/) |

---

## 二、7 种扩展风格谱系（22 种全景谱系中的另外 7 种，已内置 `mgaudio` 曲风与技法）

当用户需要制作以下 7 种风格时，使用 `template.md` 结合下表技法参数与 `mgaudio.recipes.for_style('<slug>')` 直接生成：

### 11 · `11-grain` — 颗粒质感插画风 (Grain / Texture Illustration)
- **来源与用途**：在扁平矢量插画上使用大面积噪点阴影（Grain Shader / Stipple Shading）营造复古插画绘本质感（Buck、 Kurzgesagt 高阶版常见手法）。
- **视觉特征**：暖色复古色板、边缘柔和颗粒渐变阴影（Dissolve / Noise Rim）、微弱帧间噪点跳动、无硬边高光。
- **关键技法**：
  - 阴影层：沿受光反方向做径向渐变遮罩 + 蓝噪声/高频颗粒阈值化（WebGL `step(noise, grad)` 或 SVG `feTurbulence` + `feColorMatrix`），每 2~3 帧切换噪声种子让颗粒「活」起来。
  - 运镜与动效：24fps 电影感柔和缓动，图层边缘带 1px 手绘微瑕。
- **音频配方**：`recipes.for_style('11-grain')` → `lofi`（备选 `ambient(flavor='piano')`），SFX：`paper`, `vinyl`, `pen`, `whoosh(kind='soft')`, `shutter('film')`。

### 13 · `13-text-flash` — 图文快闪 / 节奏字卡 (Kinetic Typography / Stomp Text Flash)
- **来源与用途**：苹果《Don't Blink》广告与抖音/快手高转化商业快闪标准范式，鼓点重拍直接驱动超大字号文字砸屏、翻转、反色、切割。
- **视觉特征**：极高对比黑白红/荧光色反差、满屏超大粗黑体（Heavy/Black 字重）、一拍一词/一字、画面随重低音震屏（Camera Shake + RGB 瞬态分离）。
- **关键技法**：
  - 严禁淡入淡出（No opacity fade）：文字入场用硬切（Hard Cut）、3~5 帧极速放大砸入（Scale `2.2 → 1.0` 配合 `expo.out`）、整行滑动遮罩裁切（Split Mask）或背景黑白瞬间反相（Invert Flash）。
  - 节奏同步：140 BPM Trap 鼓点，每个重拍必须触发字卡切换或视角 90° 旋转。
- **音频配方**：`recipes.for_style('13-text-flash')` → `trap(accent_hits=True)`，SFX：`text_hit('slam'/'flash'/'pop'/'glitch')`, `whoosh`, `swish`, `impact('punch')`, `shutter('phone')`。

### 14 · `14-sticker-journal` — 贴纸手账风 (Sticker / Scrapbook Journal)
- **来源与用途**：小红书/B站高赞生活美学与文创种草视觉：牛皮纸/方格手账本底、和纸胶带（Washi Tape）、拍立得相框、彩色马克笔圈画与立体贴纸。
- **视觉特征**：方格/点阵手账内页、半透明和纸胶带斜贴四角、带厚白边与投影的拍立得照片、手写涂鸦箭头与荧光笔高亮。
- **关键技法**：
  - 贴纸剥离与拍入（Peel & Slap）：贴纸从一角卷起落下，阴影随高度从 `blur 30px` 收紧到 `blur 4px`；荧光笔用 `stroke-dashoffset` 在重点词下方一笔划过（`mix-blend-mode: multiply`）。
  - 抽帧节奏：12~15fps 定格感翻页与贴入。
- **音频配方**：`recipes.for_style('14-sticker-journal')` → `variety(flavor='cute')`（尤克里里），SFX：`sticker_slap`, `sticker_peel`, `paper`, `pen`, `pop`, `tape_rip`, `sparkle`。

### 15 · `15-guochao` / `xiaoke-guochao-ink` — 上美影新国风水墨 × 流体变形 (Guochao / Neo-Chinese Ink & Liquid Gold · 已升级含 `8.99/10` 标杆源码)
- **来源与用途**：上美影《山水情》新中式水墨美学 × 国际流体动态设计（`15-guochao` × `07-liquid`），标杆成片：[demos/xiaoke-egg-protector/](../demos/xiaoke-egg-protector/)（软链 [demos/15-guochao/](../demos/15-guochao/)），提示词：[prompts/xiaoke-guochao-ink.md](../prompts/xiaoke-guochao-ink.md) / [prompts/15-guochao.md](../prompts/15-guochao.md)。
- **视觉特征**：手工熟宣纸底纹（`#F2ECE1`）、焦浓重淡清五色水墨晕染、朱砂红（`#C83C23`）伞衣与阳刻方印、泥金（`#D4AF37`）缓冲能量波纹与悬浮液滴、全片仅 4 句书法风金句 + 1 枚朱砂印章。
- **关键技法**：
  - 刚柔流体转化（Hero Moment）：尖锐枯墨锯齿冲击波随黏弹性软垫慢陷实时平滑拉长、变形为同心泥金涟漪与分离液滴（Metaball Droplets）。
  - 水墨云气无缝转场（`drawInkCloudBridge`）：幕间采用 `0.28s` 淡墨云团与泥金星尘横掠遮罩。
  - 印章落款（Hero Hit）：结尾朱砂印章伴随 `3.2px` 阻尼微震落定，同步触发古筝刮奏与金石声。
- **音频配方**：`recipes.for_style('15-guochao', flavor='classical')` + VCSL 真采样（`dantranh` 古筝泛音/刮奏、`dagu` 大鼓、`wineglass` 颂钵、`marimba` 马林巴、`glock` 钟琴）+ `07-liquid` 流体音效（`morph`, `gloop`, `bubbles`）+ `stamp('seal')` + 五声温暖低频地基。

### 16 · `16-glitch` — 数字故障风 (Digital Glitch / Datamosh)
- **来源与用途**：赛博潮流、电音视觉、黑客/安全科技片头：RGB 通道撕裂、像素块错位（Block Displacement）、扫描线断层、伪 Datamosh 帧冻结。
- **视觉特征**：高对比暗色底 + 荧光青/品红/酸绿故障条、水平切片错位（Slice Tear）、ASCII/十六进制乱码闪烁、画面撕裂后瞬间恢复极简排版。
- **关键技法**：
  - 故障不是全程乱闪（否则观众眼晕）：遵循「80% 极简冷峻克制 + 20% 节拍瞬态爆发（3~6 帧）」法则。
  - WebGL 故障 Pass：按不同高度权重生成随机水平条带 UV 偏移 `uv.x += step(thresh, hash(floor(uv.y * N), frame)) * shift`，叠加 R/B 通道反向偏移与局部反相色块。
- **音频配方**：`recipes.for_style('16-glitch')` → `glitch_hop`，SFX：`glitch`, `digital_noise`, `data_chirp`, `bitcrush_burst`, `static`, `stutter`。

### 17 · `17-vaporwave` — 蒸汽波美学 (Vaporwave / 90s Mallsoft & Win95)
- **来源与用途**：80/90 年代消费主义解构美学：大卫石膏像、粉青日落棋盘格、Windows 95 经典灰框弹窗级联、日文片假名排版、棕榈树与海豚。
- **视觉特征**：粉紫 `#FF71CE` + 薄荷青 `#01CDFE` + 鹅黄渐变、Win95 立体灰倒角窗口（`#C0C0C0`）、3D 线框地形、VHS 低保真磁带抖动。
- **关键技法**：
  - Win95 窗口堆叠：多个对话框按 `2 帧` 间隔沿对角线级联弹出（Cascade Pop），留下残影轨迹；石膏像抠图做半调网点与双色调映射（Duotone）。
  - 慢速迷幻运镜：72 BPM 降调感（Pitch-down + Tape Stop 收尾）。
- **音频配方**：`recipes.for_style('17-vaporwave')` → `vaporwave(slow=4, tape_stop=True)`，SFX：`vhs_noise`, `head_switch`, `tape_stop`, `crt_on`, `static`, `chime`。

### 21 · `21-acid` — 酸性平面设计 (Acid Graphics / Y2K Chrome & Distorted Type)
- **来源与用途**：当代先锋音乐节视觉、潮牌视觉：液态扭曲镀铬 3D 荆棘/星芒、拉伸变形哥特/衬线混排、荧光酸绿 `#CCFF00` + 电光紫 + 纯黑粗网点、激光贴纸标签。
- **视觉特征**：高反差瑞士网格边框 + 局部反重力液态金属扭曲体、四角星芒（Starburst）、条形码/规格表参数框、动态波纹扭曲文字。
- **关键技法**：
  - 液态铬金属（Liquid Chrome）：WebGL 环境贴图反射（MatCap / Equirectangular HDRI 采样 + 高阶正弦色散曲线）驱动 3D 扭曲环形结或膨胀字体。
  - 排版反差：四周是极其克制的 1px 瑞士网格与等宽小字，中央是狂野旋转的酸性镀铬主视觉。
- **音频配方**：`recipes.for_style('21-acid')` → `acid`（130 BPM TB-303 酸性滤波低音线 `acid_line`），SFX：`glitch`, `morph`, `whoosh(kind='sci')`, `laser('zap')`, `impact('metal')`, `gloop`。

---

## 三、NB 小科实验专属认证 MG 科普可选风格（已通过独立盲审门禁）

### 23 · `xiaoke-davinci-line` / `xiaoke-davinci-line-art` — 达芬奇博物手稿 × Ordinary Folk 一笔画双色钢笔科普风
- **标杆工程**：`demos/xiaoke-bionic-arm/`（《制作仿生手臂》15s 科普短片，独立盲审 **9.01 / 10.0**，7 维全项 $\ge 8.8$）
- **视觉锚点**：温暖复古亚麻手稿纸 (`#F3EDE0`) + 压感毛细钢笔浓墨 (`#1E1B18` 配合手绘排线阴影 Cross-hatching) + 朱砂红墨水 (`#D9381E` 主动力/屈肌/内侧红绳) 与群青蓝墨水 (`#1D4ED8` 拮抗复位/伸肌/外侧蓝绳) 双色点睛；全片严禁 `①②③` 标号或多余角标，仅在底部浮现 4 句黄金中文文案。
- **核心物理与运笔函数**：`calligProgress`（直线加速、骨节驻笔蓄墨）、`muscleBurst`（快肌募集弹簧超调与肌腹高张力微颤）、`rivetDampedStep`（中心铆钉库仑摩擦转动阻尼与承重缓冲微沉）。
- **音频配方**：`02-line-art` 室内乐（VCSL `piano`/`harp`/`glock` + `pluck.pizz` 大提琴温暖拨弦 + `synth.voice` 大提琴揉弦拉弦 + `sfx.pen` 亚麻纸沙沙声 + `sfx.stretch` 棉绳张力 + `claves`/`ratchet` 铆钉阻尼），综合响度锁定 `-16 ~ -14 LUFS`。



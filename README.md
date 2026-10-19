# ANS (`AI Never Stops`) 宣传片与手绘动画 · 跨电脑复利开发总仓 (`ans-brand-film-studio`)

本仓库完整封装了 **ANS（唯一官方全称：`AI Never Stops`，主站 `https://ans.cauai.fun`）** 两条核心视频复利管线的全部源码、角色绑定、预缓存素材与四大可复利 Skill：
1. **管线一（手绘水彩双主角卡通动画 · V4.6 定稿版）**：基于 `ClaudeAnimationBase`（`p5.js` + `p5.brush` 双画布引擎），内置 V4.6 定稿双主角绑定（**宽胖圆滚站立 ANS 小恐龙 `dino`** + **还原真实照片青年神韵、多彩花冠、双梁中空大黑框眼镜、胸前印有 `ANS` 白 T 恤的主理人「我」`creator`**）与 `🟢 Day 01 / 28 · ANS 正式上线` 15 秒 5 幕完整分镜。
2. **管线二（官方网站实机导览宣传片 · 60分基线版）**：`121.96s` · `1920×1080` · `30fps` 全站实机导览工程（含预缓存真站长图、3D 小恐龙 36 帧互动序列、17 句 `Fish Audio Drama-3` 原声与混音母带）。

---

## 〇、 复利归档总索引（V4.6 双主角动画 · 换电脑先看这里）

| 资产 | 归档位置 | 状态 |
| :--- | :--- | :--- |
| 复利总仓（工程 + 素材 + Skill） | 本仓库 `main`（V4.6 基线提交 `69d5887`） | ✅ 已推送 |
| 手绘动画工程 | `ClaudeAnimationBase/`（`src/ans_chars.js`、`src/scenes/ans_day01.js`、`src/sheets.js`、`STORYBOARD.md`、`render.mjs`） | ✅ 已入库 |
| 定稿素材 | `ClaudeAnimationBase/out/check/ans_chars_sheet.jpg` + `ClaudeAnimationBase/out/ans_day01_stills/t*.png` | ✅ 已入库 |
| 专属复利 Skill | `.agents/skills/ans-p5-brush-cartoon-animation/`（SKILL.md + scripts/ + references/，12 个文件） | ✅ 已入库 |
| 交接图文源稿（飞书同一源稿） | `ANS-Day01-P5Brush-Skill-Workflow-Handoff.md` | ✅ 已入库 |
| 飞书一键导入包（无需装 Python） | `ANS-Day01-P5Brush-Skill-Workflow-Handoff.feishu-import.docx` | ✅ 已入库 |
| 飞书在线云文档（V1，含内嵌高清设定图与 5 幕关键帧） | https://narcb9vct6.feishu.cn/wiki/EcBsw9QWzigqIVkBQnKcf8sQnvb | ✅ 在线 |
| ANS 主站仓库 Skill 备份 | https://github.com/1008611-creater/ans-platform 分支 `feat/dev3-ans-skill-refactor`（提交 `cbfad813`）路径 `ai-video-skills-source/ans-p5-brush-cartoon-animation/` | ✅ 与总仓 12 个文件 blob 逐一校验一致 |
| 跨电脑便携压缩包 | `ans-p5-brush-cartoon-v46-portable-kit.zip`（约 30 MB，含工程 + 素材 + Skill + 本交接文档） | ✅ 已生成 |

> 更新飞书云文档：在飞书云盘点「上传 → 导入为在线文档 → Microsoft Word」选择 `ANS-Day01-P5Brush-Skill-Workflow-Handoff.feishu-import.docx` 即可（约 10 秒，图片自动内嵌）。修改图文内容后请同步更新 `.md` 与 `.docx` 两个文件，保持「仓库源稿 = 飞书文档」一致。

---

## 一、 换电脑后 30 秒快速恢复开发环境

### 1. 恢复「手绘水彩双主角动画 (`ClaudeAnimationBase` · V4.6)」环境
```bash
git clone https://github.com/1008611-creater/ans-brand-film-studio.git
cd ans-brand-film-studio/ClaudeAnimationBase
npm install

# 一键渲染 V4.6 双主角 6 态设定图（约 4 秒）
node render.mjs --loop=ans_sheet --sheet=0.4 --cols=1 --w=1280 --out=out/check/ans_chars_sheet.jpg

# 一键渲染 Day 01 / 28 五幕核心关键帧静帧图（约 10 秒）
node render.mjs --stills=1.8,4.6,7.6,10.5,13.6 --out=out/ans_day01_stills

# 一键渲染 720p · 24fps 完整 15 秒 MP4 视频
node render.mjs --out=out/ans_day01_720p.mp4
```

### 2. 恢复「官网实机导览宣传片 (`mg-styles-15`)」环境
```bash
cd ans-brand-film-studio/.agents/skills/mg-styles-15
npm install
```

### 3. 将沉淀好的四大可复利 Skill 同步到新电脑全局目录（推荐执行）
```bash
mkdir -p ~/.gemini/config/skills ~/.codex/skills
cp -R .agents/skills/ans-p5-brush-cartoon-animation ~/.gemini/config/skills/
cp -R .agents/skills/ans-p5-brush-cartoon-animation ~/.codex/skills/
cp -R .agents/skills/ans-brand-film-live-tour ~/.gemini/config/skills/
cp -R .agents/skills/ans-brand-film-live-tour ~/.codex/skills/
cp -R .agents/skills/ans-hyperframes-launch-video ~/.gemini/config/skills/
cp -R .agents/skills/ans-hyperframes-launch-video ~/.codex/skills/
cp -R .agents/skills/mg-styles-15 ~/.gemini/config/skills/
cp -R .agents/skills/mg-styles-15 ~/.codex/skills/
```

Windows（PowerShell）等价命令：

```powershell
$skills = @("ans-p5-brush-cartoon-animation","ans-brand-film-live-tour","ans-hyperframes-launch-video","mg-styles-15")
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gemini\config\skills","$env:USERPROFILE\.codex\skills" | Out-Null
foreach ($s in $skills) {
  Copy-Item ".agents\skills\$s" "$env:USERPROFILE\.gemini\config\skills" -Recurse -Force
  Copy-Item ".agents\skills\$s" "$env:USERPROFILE\.codex\skills" -Recurse -Force
}
```

---

## 二、 目录结构说明

```text
ans-brand-film-studio/
├── README.md                                   # 跨电脑快速恢复指南与命令速查
├── HANDOFF-PROMPT.md                           # 换电脑后直接粘贴给 AI 的无缝续写提示词（含双管线）
├── ClaudeAnimationBase/                        # ★ 管线一：p5.js + p5.brush 手绘水彩双主角动画工程 (V4.6 定稿)
│   ├── STORYBOARD.md                           # Day 01 / 28 五幕完整文案、分镜脚本与时间轴
│   ├── render.mjs                              # Puppeteer + FFmpeg 确定性渲染器
│   ├── studio.html                             # WebGL + 2D 双画布加载入口 (含中英文手写字体)
│   ├── src/
│   │   ├── ans_chars.js                        # ★ V4.6 双主角手绘绑定库 (宽胖短腿小恐龙 dino + 青年神韵 ANS 白T恤 creator)
│   │   ├── scenes/ans_day01.js                 # ★ Day 01 / 28 五幕完整场景与动画状态机
│   │   ├── sheets.js                           # ans_sheet 双主角 6 种神态同屏设定图循环
│   │   ├── core.js                             # p5.brush 水彩晕染 + 样条墨线 + 2D 文字层核心
│   │   └── config.js                           # 1280x720 @ 24fps, 15s 配置
│   └── out/
│       ├── check/ans_chars_sheet.jpg           # V4.6 双主角 6 态设定图成品
│       └── ans_day01_stills/t*.png             # V4.6 五幕分镜关键帧成品 (t1_80..t13_60.png)
└── .agents/skills/
    ├── ans-p5-brush-cartoon-animation/         # ★ 新增：p5.js + p5.brush 双主角手绘水彩动画复利 Skill (V4.6)
    │   ├── SKILL.md
    │   ├── scripts/                            # ans_chars.js, ans_day01.js, sheets.js, render.mjs
    │   └── references/                         # STORYBOARD.md, ans_chars_sheet_v46.jpg, stills/t*.png
    ├── ans-brand-film-live-tour/               # ★ 官网实机导览宣传片复利 Skill（60分基线版）
    │   ├── SKILL.md
    │   ├── scripts/gen_audio.py
    │   ├── scripts/capture_live_tour.mjs
    │   └── references/clauses_timeline.json
    ├── ans-hyperframes-launch-video/           # ANS 瑞士网格 60 分合格基线 Skill
    └── mg-styles-15/                           # 纯代码动态设计权威渲染引擎 + demos/ans-brand-film/
```

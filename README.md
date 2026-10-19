# ANS (`AI Never Stops`) 官方网站实机导览宣传片 · 跨电脑复利开发工程 (`ans-brand-film-studio`)

本仓库/压缩包完整封装了 **ANS（唯一官方全称：`AI Never Stops`，主站 `https://ans.cauai.fun`）** 官方网站实机导览宣传片（`121.96s` · `1920×1080` · `30fps` · `3,659 帧`）的全部源码、预缓存真站与 3D 小恐龙序列帧、17 句 `Fish Audio Drama-3` 原声与混音母带、确定性渲染器（`harness/render.mjs`）以及沉淀好的三大可复利 Skill。

---

## 一、 换电脑后 30 秒快速恢复开发环境

### 方式 A：直接从 GitHub 克隆（推荐）
```bash
git clone https://github.com/1008611-creater/ans-brand-film-studio.git
cd ans-brand-film-studio/.agents/skills/mg-styles-15
npm install
```

### 方式 B：解压便携压缩包 (`ans-brand-film-portable-kit.zip`)
```bash
unzip ans-brand-film-portable-kit.zip -d ans-brand-film-studio
cd ans-brand-film-studio/.agents/skills/mg-styles-15
npm install
```

> **将沉淀好的可复利 Skill 同步到新电脑全局目录（可选）：**
> ```bash
> mkdir -p ~/.gemini/config/skills ~/.codex/skills
> cp -R .agents/skills/ans-brand-film-live-tour ~/.gemini/config/skills/
> cp -R .agents/skills/ans-brand-film-live-tour ~/.codex/skills/
> cp -R .agents/skills/mg-styles-15 ~/.gemini/config/skills/
> cp -R .agents/skills/mg-styles-15 ~/.codex/skills/
> ```

---

## 二、 目录结构说明

```text
ans-brand-film-studio/
├── README.md                                   # 跨电脑快速恢复指南与命令速查
├── HANDOFF-PROMPT.md                           # 换电脑后直接粘贴给 AI 的无缝续写提示词
└── .agents/skills/
    ├── ans-brand-film-live-tour/               # ★ 本项目专属复利 Skill（6 大铁律 + 生产脚本）
    │   ├── SKILL.md
    │   ├── scripts/gen_audio.py
    │   ├── scripts/capture_live_tour.mjs
    │   └── references/clauses_timeline.json
    ├── ans-hyperframes-launch-video/           # ANS 瑞士网格 60 分合格基线 Skill
    └── mg-styles-15/                           # 纯代码动态设计权威渲染引擎
        ├── SKILL.md
        ├── harness/render.mjs                  # 无头 Chrome 确定性逐帧 + 子快门运动模糊渲染器
        ├── lib/audio/mgaudio/                  # Python 配乐与音效合成库
        ├── references/ans-live-tour-film-playbook.md
        └── demos/ans-brand-film/               # ★ 当前 121.96s 官方宣传片工程目录
            ├── index.html                      # 1920x1080 主渲染舞台 (window.__seek / renderAt)
            ├── shaders.js                      # WebGL2 极光流体背景与毛玻璃折射 Shader
            ├── gen_audio.py                    # 17句 Drama-3 语音 + 瑞士风 Lo-Fi BGM 闪避混音脚本
            ├── capture_live_tour.mjs           # 真站黑名单净化截图 + 3D 小恐龙 36 帧预缓存脚本
            ├── clauses_timeline.json           # 17 句口播=字幕 100% 逐字对齐时间轴
            ├── timeline_data.js                # 供 index.html 加载的时间轴 JS 模块
            ├── clauses_tts/                    # 已缓存的 17 句 Fish Audio Drama-3 语音文件
            ├── assets/
            │   ├── tour/                       # 预缓存真站长图 (explore/vibehub/market/teams/competitions/hubs) + dino_00..35.webp
            │   ├── sfx/lofi-study_fassounds.mp3# 瑞士风 60 分合格版同款 Lo-Fi BGM
            │   ├── mascot/ans-mascot.png       # 站内真实薄荷绿小恐龙原图
            │   └── covers/                     # 干净官方项目封面
            └── out/
                ├── audio.wav                   # 已混音母带 (-15.0 LUFS / -1.5 dBTP)
                ├── audio_spec.png              # 音频波形与 Mel 频谱图
                ├── stills/t*.png               # 11 张 1080p 关键帧静帧大图
                └── ans-brand-film-1080p.mp4    # 当前 121.96s 1080p 30fps 成片
```

---

## 三、 常用迭代命令

```bash
cd .agents/skills/mg-styles-15

# 1. 快速导出 11 张关键时间点 1080p 静帧（约 10 秒），检查画面排版与镜头聚焦
node harness/render.mjs demos/ans-brand-film --stills=9.0,23.0,36.0,46.5,53.0,61.0,68.5,76.0,98.5,105.0,119.5 --motion-blur=1

# 2. 若修改了某句台词或混音参数，重新生成 audio.wav 与 timeline_data.js（未改动的句子自动复用 clauses_tts/ 缓存）
python3 demos/ans-brand-film/gen_audio.py

# 3. 全量渲染 1080p 30fps 完整视频
node harness/render.mjs demos/ans-brand-film --audio=demos/ans-brand-film/out/audio.wav --motion-blur=1
```

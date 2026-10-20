#!/usr/bin/env node
/**
 * Day 01 宣发片 · 权威守卫
 *
 * 把"定下来的决定"变成机器能跑的断言：任何一次重构若让这些断言失败，
 * 就说明有人悄悄回退了已确认的交付决定（字幕逐字、冻结造型、音乐权威、时长一致）。
 *
 *   node scripts/check-day01-authority.mjs
 *   node scripts/check-day01-authority.mjs --root=<另一份工程目录>
 *
 * 退出码：0 = 全部通过；1 = 有断言失败。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootArg = process.argv.find((a) => a.startsWith("--root="));
const REPO = rootArg ? path.resolve(rootArg.slice(7)) : path.resolve(here, "..");
const APP = path.join(REPO, "ClaudeAnimationBase");

// ── 权威指纹（改动即告警；确认后手工更新这里）──────────────────────────
const FROZEN_CHARS_SHA256 = "b53084c20df1b47fe7d2829fadd4d289a5bcf6bbd88267260eab07029b0bfd3e";          // src/ans_chars.js — V4.6 定稿双主角，几何冻结
const SPOKEN_TEXT_SHA256 = "8b3206fbee1273bb661e9b81adb1dc7521428cb0c989df9d1471e9432b9e18f4";  // 五段口播原文（= 字幕权威文本）
const AUTHORITATIVE = {
  duration: 45.9,
  fps: 24,
  frames: 1102,
  bpm: 124,
  downbeat: 1.1274,
  frames24: 1.1274,
};

const results = [];
const check = (id, ok, detail) => results.push({ id, ok: !!ok, detail });

const read = (p) => fs.readFileSync(p, "utf8");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const exists = (p) => fs.existsSync(p);

// ── A. V4.6 造型冻结 ────────────────────────────────────────────────
const charsPath = path.join(APP, "src", "ans_chars.js");
if (!exists(charsPath)) check("A1 主角文件存在", false, charsPath);
else {
  const h = sha(charsPath);
  check("A1 V4.6 造型冻结（ans_chars.js 字节未变）", h === FROZEN_CHARS_SHA256,
    h === FROZEN_CHARS_SHA256 ? "sha256 一致" : `sha256=${h.slice(0, 16)}… 期望 ${FROZEN_CHARS_SHA256.slice(0, 16)}…`);
}

// ── B. 时长一致（config / 场景 / 音频时间轴三处）─────────────────────
const cfg = read(path.join(APP, "src", "config.js"));
const scene = read(path.join(APP, "src", "scenes", "ans_day01.js"));
const tlPath = path.join(APP, "audio", "day01_timeline.json");
const tl = JSON.parse(read(tlPath));

check("B1 config.js 时长 = 45.9", /duration:\s*45\.9/.test(cfg), (cfg.match(/duration:[^,}]+/) || [""])[0].trim());
check("B2 场景 FILM_DUR = 45.9", /const\s+FILM_DUR\s*=\s*45\.9/.test(scene), (scene.match(/FILM_DUR\s*=\s*[\d.]+/) || [""])[0]);
check("B3 时间轴 total_duration = 45.9", tl.total_duration === AUTHORITATIVE.duration, String(tl.total_duration));
check("B4 帧数 = 1102 @24fps", tl.total_frames === AUTHORITATIVE.frames && tl.fps === AUTHORITATIVE.fps,
  `${tl.total_frames} 帧 @ ${tl.fps}fps`);

// ── C. 音乐权威：124 BPM 现做燃曲 + 相位 ─────────────────────────────
const grid = tl.music_grid || {};
check("C1 config.js bpm = 124（画面节奏未被改慢）", /bpm:\s*124/.test(cfg), (cfg.match(/bpm:\s*\d+/) || [""])[0]);
check("C2 config.js 相位 = 1.1274", /MUSIC_DOWNBEAT\s*=\s*1\.1274/.test(cfg), (cfg.match(/MUSIC_DOWNBEAT\s*=\s*[\d.]+/) || [""])[0]);
check("C3 音乐网格 bpm = 124", grid.bpm === AUTHORITATIVE.bpm, String(grid.bpm));
check("C4 首个 downbeat = 1.1274 s（帧 27）", grid.first_downbeat_t === AUTHORITATIVE.downbeat && grid.first_downbeat_frame === 27,
  `${grid.first_downbeat_t}s / 帧 ${grid.first_downbeat_frame}`);
check("C5 权威配乐 = 现做燃曲（禁止回退到 lofi 库乐）", tl.bed && tl.bed.source === "composed",
  tl.bed ? `bed.source=${tl.bed.source}` : "缺少 bed 元数据");
check("C6 五次转场均有音乐命中事件", (tl.bed && Array.isArray(tl.bed.cut_events) && tl.bed.cut_events.length >= 5),
  tl.bed && tl.bed.cut_events ? tl.bed.cut_events.map((c) => c.frame).join(",") : "无");

// ── D. 字幕 = 口播逐字（音频时间轴 + 画面 SUBS 双向）─────────────────
const plan = tl.sub_clause_plan || [];
const bySeg = {};
for (const c of plan) (bySeg[c.seg] = bySeg[c.seg] || []).push(c);
let verbatimOk = true, detail = [];
for (const s of tl.segments) {
  const joined = (bySeg[s.id] || []).map((c) => c.text).join("");
  const same = joined === s.tts;
  if (!same) verbatimOk = false;
  detail.push(`${s.id}:${same ? "OK" : "不一致"}`);
}
check("D1 子句拼接 == 口播原文（逐字节）", verbatimOk, detail.join(" "));
check("D2 口播原文指纹未变（5 段合计）",
  crypto.createHash("sha256").update(tl.segments.map((s) => s.tts).join("\n")).digest("hex") === SPOKEN_TEXT_SHA256,
  "sha256 " + SPOKEN_TEXT_SHA256.slice(0, 16) + "…");
check("D3 子句时间来自静音检测（非字数插值）",
  plan.length > 0 && plan.every((c) => c.source === "silence"),
  plan.map((c) => c.source).filter((v, i, a) => a.indexOf(v) === i).join(",") || "无");

// 画面侧 SUBS[].plan 的文本必须与权威一致（S5 长句允许拆成两条，拼接后相等）
const subsBlock = scene.slice(scene.indexOf("const SUBS"), scene.indexOf("function clausesOf") + 1 || undefined);
const planTexts = [...subsBlock.matchAll(/\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*'([^']*)'\s*\]/g)].map((m) => m[3]);
const joinedScene = planTexts.join("");
const joinedAudio = plan.map((c) => c.text).join("");
check("D4 画面字幕文本 == 音频权威文本（拼接逐字相等）", planTexts.length > 0 && joinedScene === joinedAudio,
  `画面 ${planTexts.length} 条 / 音频 ${plan.length} 条`);

// ── E. 字幕不得重叠（结构断言：只画当前子句，且只调 letter 两次）────────
const extractFn = (s, name) => {
  const i = s.indexOf("function " + name + "(");
  if (i < 0) return "";
  const b = s.indexOf("{", i);
  let depth = 0;
  for (let j = b; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") { depth--; if (depth === 0) return s.slice(b, j + 1); }
  }
  return s.slice(b);
};
const ribbonBody = extractFn(scene, "storyRibbon");
const textRefs = [...ribbonBody.matchAll(/([A-Za-z_$][\w$]*)\s*\.\s*text/g)].map((m) => m[1]);
check("E1 只绘制当前子句的文本（任何帧都不可能有第二条字幕）",
  ribbonBody.length > 0 && textRefs.length > 0 && textRefs.every((v) => v === "C"),
  "text 引用： " + (textRefs.join(",") || "无"));
const letterCalls = (ribbonBody.match(/letter\s*\(/g) || []).length;
check("E2 字幕函数内 letter() 调用数 = 2（章节 chip + 正文，定稿结构）", letterCalls === 2, `letter() ${letterCalls} 次`);

// ── F. 禁止回退到"已否决"的做法 ────────────────────────────────────
check("F1 未回退为 78 BPM（已否决的慢速方案）", !/bpm:\s*78/.test(cfg) && !/MUSIC_DOWNBEAT\s*=\s*0\.0/.test(cfg),
  "config.js 无 78 BPM / 无 0.0 相位");
check("F2 帧对齐拍点函数存在（pulseF）", /function\s+pulseF/.test(read(path.join(APP, "src", "core.js"))) || /pulseF\s*\(/.test(scene), "core.js / scene");

// ── 输出 ───────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.id}${r.detail ? "  — " + r.detail : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} 断言通过${failed.length ? `，${failed.length} 条失败` : "，全部通过"}`);
process.exit(failed.length ? 1 : 0);

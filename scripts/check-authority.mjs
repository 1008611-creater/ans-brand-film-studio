#!/usr/bin/env node
/**
 * ANS 复利归档「版本唯一性」守卫
 * 目的：把「只留唯一权威版」这条决定变成机器可跑的断言，防止后续被静默改回多版本并存。
 * 用法：node scripts/check-authority.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const AUTHORITATIVE = "https://narcb9vct6.feishu.cn/wiki/EaHAwTrKQiwR4akgb9OcTZi3nAh";
const REVOKED_TOKENS = ["EcBsw9QWzigqIVkBQnKcf8sQnvb"];
const MUST_REFERENCE = [
  "README.md",
  "ANS-Day01-P5Brush-Skill-Workflow-Handoff.md",
  ".agents/skills/ans-p5-brush-cartoon-animation/SKILL.md",
];
const SKIP_DIRS = new Set([".git", "node_modules", "out", "dist"]);
const SKIP_FILES = new Set(["scripts/check-authority.mjs"]); // 守卫自身持有废弃 ID 字面量，扫描时跳过

let failures = [];
let checks = 0;
const rel = (p) => p.replace(ROOT + path.sep, "").replace(/\\/g, "/");

for (const f of MUST_REFERENCE) {
  checks++;
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { failures.push(`缺少权威索引文件: ${f}`); continue; }
  const txt = fs.readFileSync(abs, "utf8");
  if (!txt.includes(AUTHORITATIVE)) failures.push(`${f} 未包含唯一权威飞书链接`);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else if (/\.(md|json|js|mjs|txt|yml|yaml)$/i.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
}

for (const file of walk(ROOT)) {
  if (SKIP_FILES.has(rel(file))) continue;
  checks++;
  const txt = fs.readFileSync(file, "utf8");
  for (const tok of REVOKED_TOKENS) {
    if (txt.includes(tok)) failures.push(`已废弃版本引用回流: ${rel(file)} 含 ${tok.slice(0, 12)}…`);
  }
}

checks++;
const handoff = fs.readFileSync(path.join(ROOT, "ANS-Day01-P5Brush-Skill-Workflow-Handoff.md"), "utf8");
const feishuLinks = [...new Set(handoff.match(/https:\/\/narcb9vct6\.feishu\.cn\/wiki\/[A-Za-z0-9]+/g) || [])];
if (feishuLinks.length !== 1) failures.push(`交接源稿中的飞书文档链接应为 1 个（唯一权威版），实际 ${feishuLinks.length} 个`);

console.log(`[check-authority] 断言 ${checks} 项，失败 ${failures.length} 项`);
if (failures.length) {
  for (const f of failures) console.error("  ❌ " + f);
  console.error("[check-authority] FAIL — 权威版本唯一性已被破坏");
  process.exit(1);
}
console.log("[check-authority] PASS — 飞书/仓库仅存唯一权威版，无废弃版本引用");

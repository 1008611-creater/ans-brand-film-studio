#!/usr/bin/env bash
set -euo pipefail

BUNDLE_NAME="Antigravity-ANS-EEONB-Migration-Bundle"
STAGE_DIR="/tmp/${BUNDLE_NAME}"
OUT_ZIP="/Users/eeo/Downloads/ans/${BUNDLE_NAME}.zip"

rm -rf "$STAGE_DIR" "$OUT_ZIP"
mkdir -p "$STAGE_DIR"/{global_gemini,codex_secrets,workspace_ans,workspace_eeonb/eeo,workspace_eeonb/nb1}

RSYNC_EXCLUDES=(
  --exclude='node_modules'
  --exclude='.venv'
  --exclude='__pycache__'
  --exclude='.DS_Store'
  --exclude='.git'
  --exclude='demos/*/out'
  --exclude='demos/*/out.mp4'
  --exclude='demos/*/*.mp4'
)

echo "==> [1/5] Packing Global Antigravity Config (~/.gemini/config) ..."
mkdir -p "$STAGE_DIR/global_gemini/config"
cp -a "$HOME/.gemini/config/GEMINI.md" "$STAGE_DIR/global_gemini/config/" 2>/dev/null || true
cp -a "$HOME/.gemini/config/config.json" "$STAGE_DIR/global_gemini/config/" 2>/dev/null || true
cp -a "$HOME/.gemini/config/mcp_config.json" "$STAGE_DIR/global_gemini/config/" 2>/dev/null || true
rsync -a "${RSYNC_EXCLUDES[@]}" "$HOME/.gemini/config/plugins" "$STAGE_DIR/global_gemini/config/"
rsync -a "${RSYNC_EXCLUDES[@]}" "$HOME/.gemini/config/sidecars" "$STAGE_DIR/global_gemini/config/"
rsync -a "${RSYNC_EXCLUDES[@]}" "$HOME/.gemini/config/projects" "$STAGE_DIR/global_gemini/config/"

# Copy non-symlink global skills directly; symlinked ones will be relinked by install_on_new_mac.sh
mkdir -p "$STAGE_DIR/global_gemini/config/skills"
for item in "$HOME/.gemini/config/skills"/*; do
  name="$(basename "$item")"
  if [ -L "$item" ]; then
    # If it points to ~/.codex/skills/agent-reach, dereference it so it's never lost
    target="$(readlink "$item")"
    if [[ "$target" == *".codex/skills/"* ]]; then
      rsync -aL "${RSYNC_EXCLUDES[@]}" "$item" "$STAGE_DIR/global_gemini/config/skills/"
    fi
  else
    rsync -a "${RSYNC_EXCLUDES[@]}" "$item" "$STAGE_DIR/global_gemini/config/skills/"
  fi
done

if [ -f "$HOME/.gemini/feishu-storage-state.json" ]; then
  cp -a "$HOME/.gemini/feishu-storage-state.json" "$STAGE_DIR/global_gemini/"
fi

echo "==> [2/5] Packing ~/.codex/secrets (API Keys used by Skills) ..."
if [ -d "$HOME/.codex/secrets" ]; then
  cp -a "$HOME/.codex/secrets/." "$STAGE_DIR/codex_secrets/"
fi

echo "==> [3/5] Packing ANS Workspace Customizations (/Users/eeo/Downloads/ans) ..."
mkdir -p "$STAGE_DIR/workspace_ans/.agents"
rsync -aL "${RSYNC_EXCLUDES[@]}" "/Users/eeo/Downloads/ans/.agents/skills" "$STAGE_DIR/workspace_ans/.agents/"
for md in ANS-ARCHITECTURE-BLUEPRINT.md ANS-Demo与产品介绍.md ANS_WELFARE_AND_GAMIFIED_GROWTH_PLAN.md RELEASE_MASTER_PLAYBOOK.md RELEASE_STATE.md; do
  [ -f "/Users/eeo/Downloads/ans/$md" ] && cp -a "/Users/eeo/Downloads/ans/$md" "$STAGE_DIR/workspace_ans/"
done

echo "==> [4/5] Packing EEO+NB1 Workspace Customizations (/Users/eeo/Downloads/eeo) ..."
mkdir -p "$STAGE_DIR/workspace_eeonb/eeo/.agents/skills"
for item in "/Users/eeo/Downloads/eeo/.agents/skills"/*; do
  name="$(basename "$item")"
  if [ "$name" = "mg-styles-15" ] && [ -L "$item" ]; then
    # Will be symlinked to ans/.agents/skills/mg-styles-15 on install to save 140MB duplicate
    continue
  fi
  rsync -aL "${RSYNC_EXCLUDES[@]}" "$item" "$STAGE_DIR/workspace_eeonb/eeo/.agents/skills/"
done

for md in AGENTS.md GEMINI.md SOUL.md MEMORY.md COLLABORATION.md CODEX.md; do
  [ -f "/Users/eeo/Downloads/eeo/$md" ] && cp -a "/Users/eeo/Downloads/eeo/$md" "$STAGE_DIR/workspace_eeonb/eeo/"
done

if [ -d "/Users/eeo/Downloads/eeo/nb1/.agents" ]; then
  mkdir -p "$STAGE_DIR/workspace_eeonb/nb1/.agents"
  rsync -aL "${RSYNC_EXCLUDES[@]}" "/Users/eeo/Downloads/eeo/nb1/.agents/rules" "$STAGE_DIR/workspace_eeonb/nb1/.agents/"
  rsync -aL "${RSYNC_EXCLUDES[@]}" "/Users/eeo/Downloads/eeo/nb1/.agents/skills" "$STAGE_DIR/workspace_eeonb/nb1/.agents/"
  for md in AGENTS.md CLAUDE.md GOAL.md PLAN.md README.md; do
    [ -f "/Users/eeo/Downloads/eeo/nb1/$md" ] && cp -a "/Users/eeo/Downloads/eeo/nb1/$md" "$STAGE_DIR/workspace_eeonb/nb1/"
  done
fi

echo "==> [5/5] Writing One-Click Installer (install_on_new_mac.sh) ..."
cat << 'EOF' > "$STAGE_DIR/install_on_new_mac.sh"
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANS_DIR="${1:-$HOME/Downloads/ans}"
EEO_DIR="${2:-$HOME/Downloads/eeo}"

echo "=================================================================="
echo "🚀 Antigravity (ANS + EEO/NB1) 全量配置与 Skill 一键迁移安装器"
echo "=================================================================="
echo "  目标 HOME 目录 : $HOME"
echo "  目标 ANS 目录  : $ANS_DIR"
echo "  目标 EEO 目录  : $EEO_DIR"
echo ""

# 1. Restore ~/.codex/secrets & ~/.codex/skills
echo "==> [1/5] 恢复底层 API 密钥 (~/.codex/secrets) ..."
mkdir -p "$HOME/.codex/secrets" "$HOME/.codex/skills"
if [ -d "$SCRIPT_DIR/codex_secrets" ]; then
  cp -a "$SCRIPT_DIR/codex_secrets/." "$HOME/.codex/secrets/"
  chmod 600 "$HOME/.codex/secrets/"* 2>/dev/null || true
fi

# 2. Restore ANS workspace (.agents/skills & docs)
echo "==> [2/5] 恢复 ANS 工作区配置 ($ANS_DIR/.agents/skills) ..."
mkdir -p "$ANS_DIR/.agents/skills"
cp -R "$SCRIPT_DIR/workspace_ans/.agents/skills/." "$ANS_DIR/.agents/skills/"
for md in "$SCRIPT_DIR/workspace_ans/"*.md; do
  [ -f "$md" ] || continue
  base="$(basename "$md")"
  [ ! -f "$ANS_DIR/$base" ] && cp -a "$md" "$ANS_DIR/$base" || true
done
ln -sfn "$ANS_DIR/.agents/skills/mg-styles-15/rubric.md" "$ANS_DIR/rubric.md"

# 3. Restore EEO + NB1 workspace (.agents/skills, rules, memory docs)
echo "==> [3/5] 恢复 EEO+NB1 工作区配置 ($EEO_DIR/.agents & $EEO_DIR/nb1/.agents) ..."
mkdir -p "$EEO_DIR/.agents/skills"
cp -R "$SCRIPT_DIR/workspace_eeonb/eeo/.agents/skills/." "$EEO_DIR/.agents/skills/"
ln -sfn "$ANS_DIR/.agents/skills/mg-styles-15" "$EEO_DIR/.agents/skills/mg-styles-15"

for md in "$SCRIPT_DIR/workspace_eeonb/eeo/"*.md; do
  [ -f "$md" ] || continue
  cp -a "$md" "$EEO_DIR/$(basename "$md")"
done

if [ -d "$SCRIPT_DIR/workspace_eeonb/nb1/.agents" ]; then
  mkdir -p "$EEO_DIR/nb1/.agents"
  cp -R "$SCRIPT_DIR/workspace_eeonb/nb1/.agents/." "$EEO_DIR/nb1/.agents/"
  for md in "$SCRIPT_DIR/workspace_eeonb/nb1/"*.md; do
    [ -f "$md" ] || continue
    cp -a "$md" "$EEO_DIR/nb1/$(basename "$md")"
  done
fi

# Also sync core skills to ~/.codex/skills so Codex CLI/App shares the exact same skills
cp -R "$EEO_DIR/.agents/skills/." "$HOME/.codex/skills/" 2>/dev/null || true

# 4. Restore Global Antigravity Config (~/.gemini/config)
echo "==> [4/5] 恢复反重力全局配置 (~/.gemini/config, Plugins, MCP, Projects) ..."
mkdir -p "$HOME/.gemini/config/skills" "$HOME/.gemini/config/plugins" "$HOME/.gemini/config/sidecars" "$HOME/.gemini/config/projects"
cp -a "$SCRIPT_DIR/global_gemini/config/GEMINI.md" "$HOME/.gemini/config/" 2>/dev/null || true
cp -a "$SCRIPT_DIR/global_gemini/config/config.json" "$HOME/.gemini/config/" 2>/dev/null || true
cp -R "$SCRIPT_DIR/global_gemini/config/plugins/." "$HOME/.gemini/config/plugins/" 2>/dev/null || true
cp -R "$SCRIPT_DIR/global_gemini/config/sidecars/." "$HOME/.gemini/config/sidecars/" 2>/dev/null || true
cp -R "$SCRIPT_DIR/global_gemini/config/skills/." "$HOME/.gemini/config/skills/" 2>/dev/null || true

if [ -f "$SCRIPT_DIR/global_gemini/feishu-storage-state.json" ]; then
  cp -a "$SCRIPT_DIR/global_gemini/feishu-storage-state.json" "$HOME/.gemini/feishu-storage-state.json"
fi

# Re-create global skill symlinks pointing to the new machine's actual ANS & EEO paths
for s in ans-eternal-pet-3d-pipeline ans-ui-ux-baseline mg-styles-15 oil-frontend oil-tone ui-ux-guide; do
  if [ -d "$ANS_DIR/.agents/skills/$s" ]; then
    rm -rf "$HOME/.gemini/config/skills/$s"
    ln -sfn "$ANS_DIR/.agents/skills/$s" "$HOME/.gemini/config/skills/$s"
  fi
done
if [ -d "$EEO_DIR/.agents/skills/image2.5genskill" ]; then
  rm -rf "$HOME/.gemini/config/skills/image2.5genskill"
  ln -sfn "$EEO_DIR/.agents/skills/image2.5genskill" "$HOME/.gemini/config/skills/image2.5genskill"
fi

# Rewrite hardcoded /Users/eeo paths in mcp_config.json and projects/*.json
PYTHON_BIN="python3"
if [ -x "$EEO_DIR/xiaoke-experiments/tools/multica-mj-workbench/.venv/bin/python" ]; then
  PYTHON_BIN="$EEO_DIR/xiaoke-experiments/tools/multica-mj-workbench/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
fi

if [ -f "$SCRIPT_DIR/global_gemini/config/mcp_config.json" ]; then
  sed \
    -e "s|/Users/eeo/Downloads/eeo/xiaoke-experiments/tools/multica-mj-workbench/.venv/bin/python|$PYTHON_BIN|g" \
    -e "s|/Users/eeo|$HOME|g" \
    "$SCRIPT_DIR/global_gemini/config/mcp_config.json" > "$HOME/.gemini/config/mcp_config.json"
fi

for proj in "$SCRIPT_DIR/global_gemini/config/projects/"*.json; do
  [ -f "$proj" ] || continue
  sed \
    -e "s|/Users/eeo/Downloads/ans|$ANS_DIR|g" \
    -e "s|/Users/eeo/Downloads/eeo|$EEO_DIR|g" \
    -e "s|/Users/eeo|$HOME|g" \
    "$proj" > "$HOME/.gemini/config/projects/$(basename "$proj")"
done

# 5. Restore mg-styles-15 npm dependencies if npm is available
echo "==> [5/5] 检查环境依赖 (node / python3 / ffmpeg / Blender) ..."
if command -v npm >/dev/null 2>&1 && [ -f "$ANS_DIR/.agents/skills/mg-styles-15/package.json" ]; then
  echo "  -> 正在为 mg-styles-15 恢复 node_modules ..."
  (cd "$ANS_DIR/.agents/skills/mg-styles-15" && npm install --silent >/dev/null 2>&1 || true)
fi

echo ""
echo "✅ 迁移完成！请重启新电脑上的 Antigravity（反重力），即可直接看到 ans 与 eeo+nb1 两个工作区及全部 Skills / Rules / Plugins / MCP！"
EOF
chmod +x "$STAGE_DIR/install_on_new_mac.sh"

echo "==> Creating ZIP archive at $OUT_ZIP ..."
(cd /tmp && zip -rq "$OUT_ZIP" "$BUNDLE_NAME")
rm -rf "$STAGE_DIR"
ls -lh "$OUT_ZIP"

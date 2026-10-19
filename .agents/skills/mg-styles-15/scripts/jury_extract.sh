#!/usr/bin/env bash
# Automated Jury Inspection Pack Extractor for mg-styles-15
# Usage: bash scripts/jury_extract.sh <path/to/video.mp4> [output_jury_dir]
set -euo pipefail

VIDEO="${1:?Usage: bash scripts/jury_extract.sh <video.mp4> [out_dir]}"
OUT_DIR="${2:-$(dirname "$VIDEO")/jury_pack}"
mkdir -p "$OUT_DIR/stills"

echo "=== [1/4] Running Technical & Loudness Spec Check (ffprobe + ebur128) ==="
{
  echo "### FILE & STREAM METADATA ###"
  ffprobe -v error -show_format -show_streams "$VIDEO"
  echo ""
  echo "### EBU R128 LOUDNESS & TRUE PEAK REPORT ###"
  ffmpeg -nostats -i "$VIDEO" -filter_complex ebur128=peak=true -f null - 2>&1 | tail -n 18
} > "$OUT_DIR/spec_report.txt"
cat "$OUT_DIR/spec_report.txt"

DUR=$(grep -m1 '^duration=' "$OUT_DIR/spec_report.txt" | cut -d= -f2 | awk '{printf "%.0f", $1}')
FONT="/System/Library/Fonts/Menlo.ttc"

echo "=== [2/4] Extracting 0.5s Contact Sheet ==="
if [ "${DUR:-10}" -ge 12 ]; then
  ffmpeg -y -hide_banner -loglevel error -i "$VIDEO" \
    -vf "fps=2,scale=480:-1,drawtext=fontfile='$FONT':text='%{pts\:hms}':x=10:y=10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x5" \
    -frames:v 1 "$OUT_DIR/contact_sheet.jpg"
else
  ffmpeg -y -hide_banner -loglevel error -i "$VIDEO" \
    -vf "fps=2,scale=480:-1,drawtext=fontfile='$FONT':text='%{pts\:hms}':x=10:y=10:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile=5x4" \
    -frames:v 1 "$OUT_DIR/contact_sheet.jpg"
fi

echo "=== [3/4] Extracting Hero Moment High-Speed Filmstrip (3.6s - 6.6s, 10fps, 6x5 grid) ==="
HERO_START="5.0"
if [ "${DUR:-10}" -ge 12 ]; then
  HERO_START="3.6"
fi
ffmpeg -y -hide_banner -loglevel error -ss "$HERO_START" -t 3.0 -i "$VIDEO" \
  -vf "fps=10,scale=360:-1,drawtext=fontfile='$FONT':text='t=%{pts\:flt}':x=8:y=8:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=6x5" \
  -frames:v 1 "$OUT_DIR/filmstrip_hero.jpg"

echo "=== [4/4] Extracting 8 Full-Resolution Keyframe Stills ==="
if [ "${DUR:-10}" -ge 12 ]; then
  TIMES="0.40 1.50 3.00 4.20 6.50 9.20 11.80 14.00"
else
  TIMES="0.20 1.00 2.50 4.00 5.50 6.80 8.20 9.50"
fi
for T in $TIMES; do
  ffmpeg -y -hide_banner -loglevel error -ss "$T" -i "$VIDEO" -frames:v 1 "$OUT_DIR/stills/t_${T}s.png"
done

echo "✅ Jury inspection pack ready at: $OUT_DIR"
ls -la "$OUT_DIR" "$OUT_DIR/stills"

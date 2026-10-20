#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""ANS (AI Never Stops) - Day 01 / 28 voiceover + Lo-Fi BGM + UI SFX + mastering pipeline.

One command builds the whole Day01 audio package for the hand-painted watercolour film
(5 acts, ClaudeAnimationBase). It is deterministic: same script + same provider + same
speed -> same cue placement, same mix, same master. Nothing is randomised except the
provider's own TTS waveform; the TTS cache makes even that reproducible.

    python build_day01_audio.py                  # auto: Fish -> Doubao -> scaffold
    python build_day01_audio.py --provider doubao
    python build_day01_audio.py --provider scaffold --force   # silent timing skeleton

Outputs (defaults; every path is overridable):
    <script_dir>/day01_timeline.json   per-segment start/dur, act boundaries, SFX cues, mastering report
    <script_dir>/timeline_data.js      same object as window.__ANS_DAY01_TIMELINE for the p5 renderer
    <script_dir>/out/audio_day01.wav   master, -14 LUFS / TP <= -1.0 dBTP
    <script_dir>/out/audio_spec.png    waveform + act/segment map + loudness report
    <script_dir>/tts_cache/            per-segment TTS cache (provider-scoped, never shared across providers)

Credentials (first hit wins, values are NEVER printed or written anywhere):
    1. environment variables
    2. <ANS_SECRETS_DIR or %USERPROFILE%\.codex\secrets>\fish-audio.env
    3. <same dir>\nobook-tts.env
Keys: FISH_API_KEY, FISH_MODEL (default drama-3), FISH_VOICE_ID,
      DOUBAO_SOUND_API_KEY, DOUBAO_TTS_SPEAKER.

No key present -> scaffold mode: a silent timeline of the right length plus an explicit
list of the missing keys. Scaffold mode never fails the build.

Requires: python (numpy, Pillow), ffmpeg on PATH. mg-styles-15 lib/audio/mgaudio is used
for the SFX layer when importable (scipy present); otherwise a small built-in numpy cue
synthesizer with the same cue names is used, so the pipeline always runs.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np

try:  # keep Chinese console output readable on Windows shells
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent                       # .../ClaudeAnimationBase
REPO = PROJECT.parent                       # .../ans-brand-film-studio
MG_AUDIO_LIB = REPO / ".agents" / "skills" / "mg-styles-15" / "lib" / "audio"
MG_DEMO_ASSETS = REPO / ".agents" / "skills" / "mg-styles-15" / "demos" / "ans-brand-film" / "assets"

SR = 48000
DEFAULT_FPS = 24
TTS_CACHE = HERE / "tts_cache"
BED_CACHE = HERE / "bed_cache"
SFX_SEED = 20260101

# ---------------------------------------------------------------------------
# 1. Verbatim script.  spoken TTS text == subtitle text, character for character.
#    "direction" is a delivery note only: it goes into Fish's [direction] tag /
#    Doubao's context_texts, never into the spoken words.
# ---------------------------------------------------------------------------
SEGMENTS = [
    dict(
        id="S1", act=1,
        text="刷了那么多 AI，最后只剩下 99+ 的吃灰收藏夹和一堆聊天记录。别慌，ANS 来了。",
        direction="像B站顶流科技主理人跟朋友聊天，先疲惫叹气再突然转亮，重音落在吃灰收藏夹、聊天记录和ANS来了",
    ),
    dict(
        id="S2", act=2,
        text="第一件，顶配旗舰模型一站直连。GPT-6-Astra、大肥鱼 v4.1、Opus 5.5，全部满血开跑。",
        direction="自信干练、节奏明快，报菜名式连读三个旗舰模型名，重音落在顶配旗舰模型和全部满血开跑",
    ),
    dict(
        id="S3", act=3,
        text="第二件，最快时间上手顶级 AI 项目。不用到处翻教程配环境。全网最火的硬核 AI 玩法，进来就能用最快速度跑通，做出自己的成品。",
        direction="带朋友一起看屏幕实操的引导感，语速稍快，重音落在最快时间上手顶级项目、不用到处翻教程配环境和最快速度跑通做出成品",
    ),
    dict(
        id="S4", act=4,
        text="第三件，注册即送算力福利。进来就有免费额度，直接开造，不玩套路。",
        direction="轻快有福利感，热情但不油腻，重音落在注册即送算力福利、免费额度和不玩套路",
    ),
    dict(
        id="S5", act=5,
        text="立个 28 天的 Flag：接下来的 28 天里，每一天我们只做两件事中的一件——要么上线一项对大多数 ANS 用户都清晰有感、真正切中需求的改进，要么直接来一次全员额度重置（Full Reset 认罚发算力）。让改进开始吧。",
        direction="先立军令状般笃定有力，最后转到充满号召力的收尾，重音落在二十八天的Flag、清晰有感切中需求、全员额度重置Full Reset认罚发算力、让改进开始吧",
    ),
]
ACT_NAMES = {
    1: "痛点破局 · 99+ 吃灰收藏夹",
    2: "第一件事 · 顶配旗舰模型一站直连",
    3: "第二件事 · 最快上手顶级 AI 项目",
    4: "第三件事 · 注册即送算力福利",
    5: "28 天 Flag · 真改进 / Full Reset",
}

# ---------------------------------------------------------------------------
# 2. Credentials - environment first, then the two .env files. Windows paths only.
# ---------------------------------------------------------------------------
SECRET_FILENAMES = ("fish-audio.env", "nobook-tts.env")
KEY_NAMES = ("FISH_API_KEY", "FISH_MODEL", "FISH_VOICE_ID", "DOUBAO_SOUND_API_KEY", "DOUBAO_TTS_SPEAKER")
DEFAULT_FISH_MODEL = "drama-3"
DEFAULT_DOUBAO_SPEAKER = "zh_male_taocheng_uranus_bigtts"


def secrets_dirs():
    """ANS_SECRETS_DIR/MG_SECRETS_DIR, when set, is the ONLY directory searched (makes the
    no-credential scaffold path testable); otherwise the per-user .codex/secrets dirs."""
    override = os.environ.get("ANS_SECRETS_DIR") or os.environ.get("MG_SECRETS_DIR")
    if override:
        return [Path(override).expanduser()]
    dirs = []
    profile = os.environ.get("USERPROFILE") or os.environ.get("HOME")
    if profile:
        dirs.append(Path(profile) / ".codex" / "secrets")
    dirs.append(Path("C:/Users/lsb/.codex/secrets"))
    seen, out = set(), []
    for d in dirs:
        key = str(d).lower()
        if key not in seen:
            seen.add(key)
            out.append(d)
    return out


def parse_env_file(path: Path):
    vals = {}
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return vals
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        if k.strip():
            vals[k.strip()] = v
    return vals


def resolve_credentials():
    """Returns (values, sources, looked_at). Never returns anything printable-secret."""
    values, sources, looked = {}, {}, []
    for name in KEY_NAMES:
        v = os.environ.get(name)
        if v:
            values[name] = v
            sources[name] = "environment"
    for d in secrets_dirs():
        for fname in SECRET_FILENAMES:
            p = d / fname
            looked.append(str(p))
            if not p.is_file():
                continue
            for k, v in parse_env_file(p).items():
                if k in KEY_NAMES and v and k not in values:
                    values[k] = v
                    sources[k] = str(p)
    return values, sources, looked


def report_credentials(values, sources, looked, provider):
    print("[creds] lookup order: environment -> " + " -> ".join(looked))
    for name in KEY_NAMES:
        if name in values:
            print("        %-22s FOUND via %s" % (name, sources[name]))
        else:
            print("        %-22s missing" % name)
    print("[creds] provider = %s" % provider)


def pick_provider(values, requested):
    has_fish = bool(values.get("FISH_API_KEY"))
    has_doubao = bool(values.get("DOUBAO_SOUND_API_KEY"))
    if requested == "auto":
        if has_fish:
            return "fish", ""
        if has_doubao:
            return "doubao", ""
        return "scaffold", "no FISH_API_KEY and no DOUBAO_SOUND_API_KEY"
    if requested == "fish" and not has_fish:
        return "scaffold", "--provider fish requested but FISH_API_KEY is missing"
    if requested == "doubao" and not has_doubao:
        return "scaffold", "--provider doubao requested but DOUBAO_SOUND_API_KEY is missing"
    return requested, ""


# ---------------------------------------------------------------------------
# 3. TTS providers
# ---------------------------------------------------------------------------
class TtsError(RuntimeError):
    pass


# None = still using whatever the environment proxies say, True = proxy bypassed,
# False = environment proxies forced (--use-proxy). A machine-local proxy (Clash and
# friends export HTTPS_PROXY) can terminate the TLS handshake for the Volcengine
# endpoint while plain direct egress works, so auto mode falls back to direct once.
NET = {"direct": None, "announced": False}


def _open(req, timeout, direct):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if direct else urllib.request.build_opener()
    return opener.open(req, timeout=timeout)


def http_post_json(url, payload, headers, timeout, retries=3, stream_lines=False):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    last = None
    if NET["direct"] is None:
        modes = [False, True]
    else:
        modes = [bool(NET["direct"])]
    for attempt in range(retries):
        for direct in modes:
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            try:
                with _open(req, timeout, direct) as resp:
                    data = [ln for ln in resp] if stream_lines else resp.read()
                if direct and NET["direct"] is not True:
                    NET["direct"] = True
                    print("[net]   egress: direct (environment proxy bypassed for the TTS host)")
                elif not direct and not NET["announced"]:
                    print("[net]   egress: using environment proxy settings")
                NET["announced"] = True
                return data
            except urllib.error.HTTPError as exc:
                detail = ""
                try:
                    detail = exc.read()[:300].decode("utf-8", "replace")
                except Exception:
                    pass
                last = TtsError("HTTP %s %s %s" % (exc.code, exc.reason, detail))
                if exc.code in (400, 401, 403, 404):
                    raise last
                break                      # server-side error: do not switch egress mode
            except Exception as exc:
                last = TtsError("%s: %s" % (type(exc).__name__, exc))
                if direct and NET["direct"] is None:
                    continue               # direct also failed: report the real message
        time.sleep(1.5 * (attempt + 1))
    raise last if last else TtsError("request failed")


def synth_fish(text, direction, out_path, values, speed, timeout, retries):
    payload = {
        "text": "[%s] %s" % (direction, text),
        "format": "mp3",
        "prosody": {"speed": float(speed), "volume": 0},
    }
    voice = values.get("FISH_VOICE_ID")
    if voice:
        payload["reference_id"] = voice
    model = values.get("FISH_MODEL") or DEFAULT_FISH_MODEL
    headers = {
        "Authorization": "Bearer %s" % values["FISH_API_KEY"],
        "Content-Type": "application/json",
        "model": model,
        "User-Agent": "ANS-Day01-Audio/1.0",
    }
    data = http_post_json("https://api.fish.audio/v1/tts", payload, headers, timeout, retries)
    if len(data) < 2000:
        raise TtsError("fish returned %d bytes (too small)" % len(data))
    out_path.write_bytes(data)


def synth_doubao(text, direction, out_path, values, speed, timeout, retries):
    speaker = values.get("DOUBAO_TTS_SPEAKER") or DEFAULT_DOUBAO_SPEAKER
    payload = {
        "req_params": {
            "text": text,
            "speaker": speaker,
            "model": "seed-tts-2.0-expressive",
            "additions": json.dumps({
                "disable_markdown_filter": True,
                "enable_language_detector": True,
                "enable_latex_tn": True,
                "context_texts": [
                    "请按以下导演提示自然演绎，像B站顶流科技主理人跟朋友聊天，松弛真实、节奏明快从容，拒绝播音腔：%s。" % direction
                ],
            }, ensure_ascii=False),
            "audio_params": {
                "format": "mp3",
                "sample_rate": 24000,
                "speech_rate": int(round((float(speed) - 1.0) * 100)),
            },
        }
    }
    headers = {
        "x-api-key": values["DOUBAO_SOUND_API_KEY"],
        "X-Api-Resource-Id": "seed-tts-2.0",
        "Content-Type": "application/json",
    }
    lines = http_post_json(
        "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
        payload, headers, timeout, retries, stream_lines=True,
    )
    chunks = []
    for raw in lines:
        line = raw.decode("utf-8", "ignore").strip()
        if not line:
            continue
        if line.startswith("data:"):
            line = line[5:].strip()
        if not line or line == "[DONE]":
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        code = obj.get("code", 0)
        # v3 unidirectional stream: audio frames carry code 0, the terminal frame
        # reports code 20000000 / message "OK" with no payload. Anything else is an error.
        if code not in (0, None, 20000000):
            raise TtsError("doubao tts error code=%s message=%s" % (code, obj.get("message")))
        data = obj.get("data")
        if data:
            chunks.append(base64.b64decode(data))
    audio = b"".join(chunks)
    if len(audio) < 2000:
        raise TtsError("doubao returned %d audio bytes (too small)" % len(audio))
    out_path.write_bytes(audio)


def provider_tag(provider, values, speed, seg):
    model = (values.get("FISH_MODEL") or DEFAULT_FISH_MODEL) if provider == "fish" else "seed-tts-2.0-expressive"
    speaker = (values.get("DOUBAO_TTS_SPEAKER") or DEFAULT_DOUBAO_SPEAKER) if provider == "doubao" else (values.get("FISH_VOICE_ID") or "auto")
    blob = "|".join([provider, model, speaker, "%.4f" % float(speed), seg["direction"], seg["text"]])
    return hashlib.sha1(blob.encode("utf-8")).hexdigest(), model, speaker


def synth_segment(provider, values, seg, speed, timeout, retries, force):
    """Synthesises one verbatim segment (cached). Returns (mp3_path, model_label, speaker_label)."""
    tag, model, speaker = provider_tag(provider, values, speed, seg)
    TTS_CACHE.mkdir(parents=True, exist_ok=True)
    stem = "%s_%s_%s" % (provider, seg["id"].lower(), tag[:12])
    mp3 = TTS_CACHE / (stem + ".mp3")
    tagf = TTS_CACHE / (stem + ".tag")
    if not force and mp3.is_file() and mp3.stat().st_size > 2000 and tagf.is_file() and tagf.read_text(encoding="utf-8").strip() == tag:
        print("        %s cache hit  (%s)" % (seg["id"], mp3.name))
        return mp3, model, speaker
    print("        %s synthesising via %s ..." % (seg["id"], provider))
    if provider == "fish":
        synth_fish(seg["text"], seg["direction"], mp3, values, speed, timeout, retries)
    else:
        synth_doubao(seg["text"], seg["direction"], mp3, values, speed, timeout, retries)
    tagf.write_text(tag, encoding="utf-8")
    return mp3, model, speaker


# ---------------------------------------------------------------------------
# 4. Audio I/O (ffmpeg decode -> numpy, own PCM/f32 WAV reader+writer; no soundfile needed)
# ---------------------------------------------------------------------------
def ffmpeg_bin():
    exe = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg not found on PATH (set FFMPEG=... or install ffmpeg)")
    return exe


def ffmpeg_run(args):
    proc = subprocess.run([ffmpeg_bin(), "-hide_banner", "-nostats", "-y"] + args,
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    if proc.returncode != 0:
        tail = (proc.stderr or "")[-1200:]
        raise RuntimeError("ffmpeg failed (rc=%d): %s" % (proc.returncode, tail))
    return proc.stderr or ""


def decode_audio(path, sr=SR, channels=2):
    """Any input -> float32 (n, channels) via ffmpeg. Uses temp files (no pipes)."""
    tmp = Path(tempfile.gettempdir()) / ("ans_decode_%s.wav" % hashlib.sha1(str(path).encode()).hexdigest()[:10])
    ffmpeg_run(["-i", str(path), "-ar", str(sr), "-ac", str(channels), "-c:a", "pcm_f32le", str(tmp)])
    arr = read_wav(tmp)
    try:
        tmp.unlink()
    except OSError:
        pass
    return arr


def read_wav(path):
    raw = Path(path).read_bytes()
    if raw[:4] != b"RIFF" or raw[8:12] != b"WAVE":
        raise RuntimeError("not a RIFF/WAVE file: %s" % path)
    pos, fmt, data = 12, None, None
    while pos + 8 <= len(raw):
        cid = raw[pos:pos + 4]
        size = struct.unpack("<I", raw[pos + 4:pos + 8])[0]
        body = raw[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            fmt = body
        elif cid == b"data":
            data = body
        pos += 8 + size + (size & 1)
    if fmt is None or data is None:
        raise RuntimeError("wav missing fmt/data chunk: %s" % path)
    tag, ch, sr, _brate, _align, bits = struct.unpack("<HHIIHH", fmt[:16])
    if tag == 0xFFFE and len(fmt) >= 26:          # WAVE_FORMAT_EXTENSIBLE
        tag = struct.unpack("<H", fmt[24:26])[0]
    if tag == 3:
        dtype = {32: np.float32, 64: np.float64}.get(bits)
        arr = np.frombuffer(data, dtype=dtype)
    elif tag == 1:
        if bits == 16:
            arr = np.frombuffer(data, dtype="<i2").astype(np.float32) / 32768.0
        elif bits == 24:
            b = np.frombuffer(data, dtype=np.uint8).reshape(-1, 3).astype(np.int32)
            v = (b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16))
            v = np.where(v & 0x800000, v - 0x1000000, v)
            arr = (v.astype(np.float32) / 8388608.0)
        elif bits == 32:
            arr = np.frombuffer(data, dtype="<i4").astype(np.float32) / 2147483648.0
        else:
            raise RuntimeError("unsupported PCM bit depth: %d" % bits)
    else:
        raise RuntimeError("unsupported wav format tag: %d" % tag)
    arr = np.asarray(arr, dtype=np.float32)
    if ch > 1:
        arr = arr.reshape(-1, ch)
    else:
        arr = arr.reshape(-1, 1)
    return np.ascontiguousarray(arr[:, :2] if arr.shape[1] >= 2 else np.repeat(arr[:, :1], 2, axis=1))


def write_wav24(path, arr):
    """24-bit PCM WAV - broadcast-safe default, no soundfile dependency."""
    arr = np.asarray(arr, dtype=np.float32)
    if arr.ndim == 1:
        arr = arr[:, None]
    n, ch = arr.shape
    clipped = np.clip(arr, -1.0, 1.0)
    v = np.round(clipped * 8388607.0).astype(np.int32)
    inter = np.empty((n, ch, 3), dtype=np.uint8)
    inter[:, :, 0] = (v & 0xFF).astype(np.uint8)
    inter[:, :, 1] = ((v >> 8) & 0xFF).astype(np.uint8)
    inter[:, :, 2] = ((v >> 16) & 0xFF).astype(np.uint8)
    payload = inter.reshape(-1).tobytes()
    block_align = ch * 3
    header = b"RIFF" + struct.pack("<I", 36 + len(payload)) + b"WAVE"
    header += b"fmt " + struct.pack("<IHHIIHH", 16, 1, ch, SR, SR * block_align, block_align, 24)
    header += b"data" + struct.pack("<I", len(payload))
    Path(path).write_bytes(header + payload)


# ---------------------------------------------------------------------------
# 5. Loudness measurement / mastering (ffmpeg loudnorm two-pass + ebur128 verify)
# ---------------------------------------------------------------------------
def measure_loudnorm(path, target_lufs, target_tp, lra):
    stderr = ffmpeg_run(["-i", str(path),
                         "-af", "loudnorm=I=%s:TP=%s:LRA=%s:print_format=json" % (target_lufs, target_tp, lra),
                         "-f", "null", "-"])
    blocks = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr, re.S)
    if not blocks:
        raise RuntimeError("could not parse loudnorm measurement")
    raw = blocks[-1]
    out = {}
    for key in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset"):
        m = re.search(r"\"%s\"\s*:\s*\"?(-?[0-9.]+|-?inf)" % key, raw)
        out[key] = float(m.group(1)) if m and m.group(1) not in ("inf", "-inf") else float("-inf")
    return out


def measure_ebur128(path):
    stderr = ffmpeg_run(["-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"])
    res = {}
    m = re.findall(r"I:\s*(-?[0-9.]+)\s*LUFS", stderr)
    if m:
        res["i"] = float(m[-1])
    m = re.findall(r"LRA:\s*(-?[0-9.]+)\s*LU", stderr)
    if m:
        res["lra"] = float(m[-1])
    m = re.findall(r"Peak:\s*(-?[0-9.]+)\s*dBFS", stderr)
    if m:
        res["tp"] = float(m[-1])
    return res


def true_peak_db(arr, os=4):
    """BS.1770-style oversampled true peak (dBFS). ffmpeg's ebur128 under-reads by ~0.1-0.3 dB,
    so this meter is the one the -1.0 dBTP contract is verified against."""
    x = np.asarray(arr, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    best = 0.0
    for ch in range(x.shape[1]):
        y = np.ascontiguousarray(x[:, ch])
        try:
            from scipy.signal import resample_poly          # noqa: PLC0415
            up = resample_poly(y, os, 1)
        except Exception:
            n = len(y)
            spec = np.fft.rfft(y)
            pad = np.zeros(len(y) * os // 2 + 1, dtype=complex)
            pad[:len(spec)] = spec
            up = np.fft.irfft(pad, n=n * os) * os
        best = max(best, float(np.abs(up).max()))
    return 20 * np.log10(max(best, 1e-9))


def master_file(raw_path, out_path, target_lufs, target_tp, lra, quiet, tp_margin=0.5):
    """Explicit mastering: gain trim to the loudness target plus a true-peak limiter, both
    steered by our own oversampled meter. loudnorm's linear pass cannot hold -14 LUFS once the
    program is dense enough to need limiting (it silently lands 0.5-0.7 LU hot), so the
    contract is closed here instead of by the encoder's internal limiter."""
    # The limiter is ALWAYS in the chain: an un-limited trim pass that goes above 0 dBFS is
    # hard-clipped by the PCM encoder, which silently squashes the dynamics it is meant to keep.
    lim_ceiling = target_tp - tp_margin
    gain_db, limit, passes, got = 0.0, True, [], {}
    for it in range(14):
        af = "volume=%.2fdB,alimiter=limit=%.6f:attack=5:release=150:level=false" % (
            gain_db, 10 ** (lim_ceiling / 20.0))
        ffmpeg_run(["-i", str(raw_path), "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", str(out_path)])
        got = measure_ebur128(out_path)
        got["tp_os"] = round(float(true_peak_db(read_wav(out_path))), 3)
        got["gain_db"] = round(gain_db, 2)
        got["limiter"] = limit
        passes.append({"mode": ("trim+limiter" if limit else "trim"),
                       **{k: (round(float(v), 4) if isinstance(v, (int, float, np.floating)) else v)
                          for k, v in got.items()}})
        err = target_lufs - got.get("i", target_lufs)
        # The contract is verified with the 4x-oversampled meter (ffmpeg's ebur128 reads a
        # different value on dense material and is reported next to it, not used as a gate).
        tp_ok = got["tp_os"] <= target_tp - 0.05
        if not quiet:
            print("      master it%d: gain %+.2f dB limiter=%-5s ceil %.2f -> %.2f LUFS / %.2f dBTP%s" % (
                it + 1, gain_db, limit, lim_ceiling, got.get("i", 0.0), got["tp_os"],
                "" if tp_ok else "  (TP over)"))
        if abs(err) <= 0.06 and tp_ok:
            break
        if not tp_ok:
            # alimiter caps SAMPLE peaks; a dense limited signal still overshoots between
            # samples (measured here: ~1.0 dB), so pull the ceiling down by the overshoot.
            want_tp = target_tp - 0.05          # the contract plus a hair of margin
            lim_ceiling = round(lim_ceiling - (got["tp_os"] - want_tp) - 0.02, 3)
            limit = True
        gain_db += err
    return got, passes


def _loudnorm_unused(raw_path, out_path, target_lufs, target_tp, lra, quiet, tp_margin=0.5):
    inner_tp = round(target_tp - tp_margin, 3)
    measured = measure_loudnorm(raw_path, target_lufs, inner_tp, lra)
    passes = [{"mode": "measure", **measured}]
    af = ("loudnorm=I=%s:TP=%s:LRA=%s:measured_I=%s:measured_LRA=%s:measured_TP=%s:measured_thresh=%s:offset=%s:linear=true"
          % (target_lufs, inner_tp, lra, measured["input_i"], measured["input_lra"], measured["input_tp"],
             measured["input_thresh"], measured["target_offset"]))
    ffmpeg_run(["-i", str(raw_path), "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", str(out_path)])
    got = measure_ebur128(out_path)
    got["tp_os"] = true_peak_db(read_wav(out_path))
    got["inner_tp"] = inner_tp
    passes.append({"mode": "linear", **got})
    def _tp_ok(g):
        return g.get("tp_os", -99.0) <= target_tp + 0.02 and g.get("tp", -99.0) <= target_tp + 0.02
    ok = ("i" in got and abs(got["i"] - target_lufs) <= 0.3 and _tp_ok(got))
    if not ok:
        if not quiet:
            print("[master] linear pass off target (%s) -> dynamic loudnorm fallback" % {k: got[k] for k in ("i", "lra", "tp", "tp_os")})
        ffmpeg_run(["-i", str(raw_path),
                    "-af", "loudnorm=I=%s:TP=%s:LRA=%s:linear=false" % (target_lufs, inner_tp, lra),
                    "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", str(out_path)])
        got = measure_ebur128(out_path)
        got["tp_os"] = true_peak_db(read_wav(out_path))
        got["inner_tp"] = inner_tp
        passes.append({"mode": "dynamic", **got})
    if not _tp_ok(got):                                  # final true-peak ceiling trim
        if not quiet:
            print("[master] true peak %.2f dBTP (own meter) over ceiling -> alimiter" % got.get("tp_os", 0.0))
        limited = out_path.with_name(out_path.stem + "_lim.wav")
        ffmpeg_run(["-i", str(out_path),
                    "-af", "alimiter=limit=%s:attack=1:release=60:level=false" % (10 ** (target_tp / 20.0)),
                    "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", str(limited)])
        shutil.move(str(limited), str(out_path))
        got = measure_ebur128(out_path)
        got["tp_os"] = true_peak_db(read_wav(out_path))
        passes.append({"mode": "alimiter", **got})
    return got, passes


# ---------------------------------------------------------------------------
# 6. SFX layer (mgaudio when importable, deterministic built-in fallback otherwise)
# ---------------------------------------------------------------------------
def load_mgaudio():
    if not MG_AUDIO_LIB.is_dir():
        return None, "mgaudio lib not found at %s" % MG_AUDIO_LIB
    if str(MG_AUDIO_LIB) not in sys.path:
        sys.path.insert(0, str(MG_AUDIO_LIB))
    try:
        import mgaudio as mg           # noqa: PLC0415
        from mgaudio import sfx        # noqa: PLC0415
        return (mg, sfx), ""
    except Exception as exc:
        return None, "%s: %s" % (type(exc).__name__, exc)


def make_cue(name, mgmods):
    """name in click/pop/chime/riser -> stereo float32 array. Deterministic (seeded)."""
    mg, sfx = mgmods
    mg.reset_rng(SFX_SEED)
    if name == "click":
        snd = sfx.click(kind="soft")
    elif name == "pop":
        snd = sfx.pop(kind="mouth")
    elif name == "chime":
        snd = sfx.chime(notes=("E6", "B6"), step=0.06, kind="celesta")
    elif name == "riser":
        snd = sfx.riser(dur=0.62, kind="hybrid", note="A3", end="cut", seed=7)
    elif name in ("hit", "impact"):             # wipe accent: tight low impact, short tail (D9-safe)
        snd = sfx.impact(kind="punch", size=0.35, vel=1.0, seed=11)
    elif name == "tear":                        # wipe accent: paper-tear layer, short
        snd = sfx.paper(kind="crumple", dur=0.30, seed=13)
    elif name == "boom":                        # end-card landing (short tail: the window RMS is what D9 measures)
        snd = sfx.boom(dur=1.2, f0=52.0, seed=17)
    elif name == "reverse":                     # reverse swell into the end card
        snd = sfx.reverse_cymbal(dur=1.1, seed=19)
    elif name == "beat":                        # soft musical downbeat marker on the BED's grid
        snd = sfx.impact(kind="thud", size=0.55, vel=1.0, seed=23)
    else:
        raise ValueError("unknown cue %s" % name)
    # NOTE: mgaudio stores buffers as (channels, samples); this pipeline works in (samples, 2).
    arr = np.asarray(mg.core.as_array(snd), dtype=np.float32)
    if arr.ndim == 1:
        arr = np.stack([arr, arr], axis=1)
    else:
        arr = arr.T
    if arr.shape[1] == 1:
        arr = np.repeat(arr, 2, axis=1)
    arr = np.ascontiguousarray(arr[:, :2])
    if name in ("hit", "impact", "tear"):
        # Density without exaggeration: a moderate soft-clip keeps the hit punchy but stops it
        # from eating the whole true-peak budget (which would force the master limiter to
        # compress the finale the ride is trying to lift).
        arr = np.tanh(arr * 3.5).astype(np.float32)
        peak = float(np.abs(arr).max())
        if peak > 1e-9:
            arr = arr * (0.50 / peak)
    return arr


def fallback_cue(name):
    """Pure-numpy stand-in with the same names, used only when mgaudio cannot import."""
    rng = np.random.default_rng(SFX_SEED)
    if name == "click":
        n = int(0.05 * SR)
        t = np.arange(n) / SR
        noise = rng.standard_normal(n)
        hp = np.diff(np.concatenate([[0.0], noise]))          # cheap high-pass
        y = hp * np.exp(-t / 0.004) + 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.008)
    elif name == "pop":
        n = int(0.09 * SR)
        t = np.arange(n) / SR
        f = 260 + 900 * np.exp(-t / 0.008)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    elif name == "chime":
        n = int(1.1 * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for k, freq in enumerate((1318.5, 1975.5)):           # E6, B6
            off = int(k * 0.06 * SR)
            seg = t[:n - off]
            tone = np.sin(2 * np.pi * freq * seg) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * seg)
            y[off:] += tone * np.exp(-seg / 0.75)
    elif name == "riser":
        n = int(0.62 * SR)
        t = np.arange(n) / SR
        sweep = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (3.2 * t / 0.62)) / SR)
        air = rng.standard_normal(n) * 0.35
        env = (t / 0.62) ** 1.6
        y = (sweep * 0.6 + air) * env
    elif name in ("hit", "impact"):
        n = int(0.45 * SR)
        t = np.arange(n) / SR
        f = 34 + 56 * np.exp(-t / 0.12)
        sub = np.tanh(2.0 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5))
        body = np.sin(2 * np.pi * np.cumsum(55 + 120 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.25)
        y = sub * 0.9 + body * 0.5
        k = int(0.008 * SR)
        y[:k] += rng.standard_normal(k) * np.exp(-np.arange(k) / (SR * 0.0018)) * 0.7
    elif name == "tear":
        n = int(0.5 * SR)
        t = np.arange(n) / SR
        crackle = rng.standard_normal(n)
        gate = (rng.random(n) < 0.02).astype(np.float32)
        crackle = crackle * (0.25 + 0.75 * movavg(gate, 0.0015 * SR))
        y = crackle * np.exp(-t / 0.22) + rng.standard_normal(n) * np.exp(-t / 0.30) * 0.25
    elif name == "boom":
        n = int(2.0 * SR)
        t = np.arange(n) / SR
        f = 52 * 0.7 + 52 * 0.6 * np.exp(-t / 0.15)
        y = np.tanh(2.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / 1.2)
    elif name == "beat":
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        y = np.sin(2 * np.pi * np.cumsum(60 + 40 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.14)
    elif name == "reverse":
        n = int(1.1 * SR)
        t = np.arange(n) / SR
        y = np.flipud(rng.standard_normal(n) * np.exp(-(n / SR - t) / 0.35))
    else:
        raise ValueError("unknown cue %s" % name)
    y = y / max(1e-9, float(np.abs(y).max())) * 0.9
    return np.ascontiguousarray(np.stack([y.astype(np.float32)] * 2, axis=1))


# ---------------------------------------------------------------------------
# 7. Speech timing helpers
# ---------------------------------------------------------------------------
def text_units(text):
    """Rough spoken-length weight per character, calibrated against measured Doubao output."""
    u = 0.0
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            u += 1.0
        elif ch.isascii() and (ch.isalnum()):
            u += 0.50
        elif ch in "。！？":
            u += 3.0
        elif ch in "，、；：":
            u += 1.6
        elif ch in "—-…（）()【】「」“”":
            u += 0.8
        else:
            u += 0.8
    return u


# Calibrated against the measured Doubao pass of 2026-10-20: 305.5 text units -> 39.54 s of
# speech at speed 1.12 => 6.90 units/s at speed 1.0. Total-length error of the scaffold
# estimate is ~2%; per-segment error is within +-11% (a character-count model cannot know
# that "GPT-6-Astra" is spoken slower than "99+").
SCAFFOLD_UNITS_PER_SEC = 6.90


def estimate_duration(text, speed):
    return text_units(text) / (SCAFFOLD_UNITS_PER_SEC * float(speed))


def sentence_onsets(text, t0, dur):
    """Approximate onset of every sentence after the first, weighted by spoken length."""
    parts = [p for p in re.split(r"(?<=[。！？])", text) if p.strip()]
    if len(parts) <= 1:
        return []
    total = sum(text_units(p) for p in parts)
    out, cum = [], 0.0
    for p in parts[:-1]:
        cum += text_units(p)
        out.append(t0 + dur * (cum / total))
    return out


def movavg(x, win):
    """Centred box-filter moving average in O(n). np.convolve with a 0.32 s kernel
    (15360 taps over ~3 M samples) takes tens of seconds - cumsum makes it instant."""
    win = max(1, int(win))
    if win <= 1:
        return np.asarray(x, dtype=np.float32)
    pad = win // 2
    xp = np.pad(np.asarray(x, dtype=np.float32), (pad, win - 1 - pad), mode="edge")
    cs = np.concatenate([[0.0], np.cumsum(xp, dtype=np.float64)])
    return ((cs[win:] - cs[:-win]) / win).astype(np.float32)


def trim_silence(arr):
    """Drop leading/trailing silence (12 ms envelope, 24 ms pad) like the reference build."""
    mono = np.abs(arr).mean(axis=1)
    env = movavg(mono, max(1, int(0.012 * SR)))
    nz = np.where(env > 0.005)[0]
    if len(nz) == 0:
        return arr
    pad = int(0.024 * SR)
    i0 = max(0, int(nz[0]) - pad)
    i1 = min(len(arr), int(nz[-1]) + pad)
    return arr[i0:i1]


def frame_snap(t, fps):
    return round(round(float(t) * fps) / fps, 6)


# ---------------------------------------------------------------------------
# 8. Mix + report
# ---------------------------------------------------------------------------
def resolve_wipes(segs, args):
    """Wipe (scene-cut) times. The picture side owns these: pass --wipe-times with the exact
    values, or 'auto' for the midpoint of each inter-act gap. Any value that falls outside its
    gap is snapped to the gap midpoint and reported."""
    n = len(segs) - 1
    if str(args.wipe_times).strip().lower() in ("auto", ""):
        return [round((segs[i]["end"] + segs[i + 1]["start"]) / 2.0, 3) for i in range(n)], "auto (gap midpoint)"
    raw = [float(x) for x in re.split(r"[,;]", str(args.wipe_times)) if x.strip()]
    if len(raw) != n:
        raise SystemExit("--wipe-times needs %d values, got %d" % (n, len(raw)))
    out, notes = [], []
    for i, w in enumerate(raw):
        g0, g1 = segs[i]["end"], segs[i + 1]["start"]
        if not (g0 - 0.20 <= w <= g1 + 0.20):
            mid = round((g0 + g1) / 2.0, 3)
            notes.append("wipe %d %.3f s outside gap [%.3f, %.3f] -> snapped to %.3f" % (i + 1, w, g0, g1, mid))
            w = mid
        out.append(round(w, 3))
    return out, ("picture-locked" + (" | " + " | ".join(notes) if notes else ""))


def music_level_curve(segs, wipes, total_dur, args, beat_marks=None):
    """Music-bed breakpoints as dB RELATIVE TO THE VOICE BODY RMS (which the master pins at
    --body-rms-target). Relative levels keep the musical balance identical whatever gain the
    loudness normaliser applies, and make the LRA budget explicit."""
    gap, body = args.music_gap_db, args.music_body_db
    dip = gap + args.music_dip_db
    pts = [(0.0, -70.0), (0.22, gap)]
    for i, s in enumerate(segs):
        v0, v1 = s["start"], s["end"]
        pts += [(max(0.01, v0 - 0.30), gap), (v0 + 0.10, body)]
        if i < len(segs) - 1:
            w = wipes[i]
            dip_start = max(v0 + 0.15, w - 0.05 - args.music_dip_dur)
            pts += [(dip_start - 0.06, body), (dip_start, gap),
                    (dip_start + 0.07, dip), (w - 0.01, dip),
                    (w + 0.05, gap + 2.0), (w + 0.45, gap)]
            bm = (beat_marks or [None] * len(wipes))[i]
            if bm:
                b = bm["beat"]                      # section articulation ON the bed's own beat
                pts += [(b - 0.34, dip), (b - 0.03, dip - 2.5), (b + 0.05, dip + 1.5), (b + 1.10, dip)]
        else:
            ec = max(v1, float(args.endcard_start))
            pts += [(v0 + s["voice_dur"] * 0.55, body), (v1 - 0.08, args.music_act5_db),
                    (v1 + 0.05, gap), (ec, args.music_endcard_db),
                    (max(ec, total_dur - args.fade_out), args.music_endcard_db), (total_dur, -70.0)]
    pts.sort(key=lambda p: p[0])
    clean = []
    for tt, db in pts:
        tt = max(0.0, float(tt))
        if clean and tt <= clean[-1][0]:
            clean[-1] = (clean[-1][0], float(db))
        else:
            clean.append((tt, float(db)))
    return clean


def music_gain_array(pts, total_samples, voice_ref_rms, smooth_ms=35.0):
    """Linear gain for the music bus: the bed RMS follows voice_ref_rms * 10**(db/20)."""
    xs = np.array([p[0] for p in pts], dtype=np.float64)
    ys = np.array([p[1] for p in pts], dtype=np.float64)
    tt = np.arange(total_samples, dtype=np.float64) / SR
    lin = 10 ** (np.interp(tt, xs, ys) / 20.0)
    return (movavg(lin, max(1.0, smooth_ms / 1000.0 * SR)) * voice_ref_rms).astype(np.float32)


def build_endcard_pad(total_samples, endcard_start, mgmods, args, lead=0.0):
    """Sustained low-crest pad under the end card. This is the LRA lever: the 3 s loudness
    windows of the end card are the only ones that can sit clearly above the (voice-dominated)
    body, so the end-card energy is what sets p95 of the loudness range."""
    i0 = int(round(max(0.0, endcard_start - lead) * SR))
    n = total_samples - i0
    if n <= 64:
        return None
    rng = np.random.default_rng(SFX_SEED + 5)
    tt = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # K-weighting is flat/boosted between ~200 Hz and 6 kHz, so the end-card energy has to
    # live there - a sub drone would not move the measured loudness nor the LRA at all.
    band = movavg(noise - movavg(noise, SR / 250.0), SR / 6000.0)
    chord = (0.50 * np.sin(2 * np.pi * 220.0 * tt) + 0.35 * np.sin(2 * np.pi * 330.0 * tt + 0.7)
             + 0.28 * np.sin(2 * np.pi * 440.0 * tt + 1.9) + 0.18 * np.sin(2 * np.pi * 660.0 * tt + 2.7))
    chord *= 0.9 + 0.1 * np.sin(2 * np.pi * 5.5 * tt)
    pad = band * 3.2 + chord * 0.55
    env = np.ones(n, dtype=np.float32)
    a = max(1, int(max(0.12, lead + 0.10) * SR))
    env[:a] = np.linspace(0.0, 1.0, a, dtype=np.float32) ** 1.5
    fo = max(1, int(0.45 * SR))
    env[-fo:] *= np.linspace(1.0, 0.0, fo, dtype=np.float32) ** 1.2
    pad = np.tanh(pad * env * 2.6) * 0.9           # dense: low crest keeps it under the TP ceiling
    rms = float(np.sqrt(np.mean(pad ** 2)))
    pad = (pad / max(rms, 1e-9)).astype(np.float32)          # unit RMS; the loop sets the gain
    st = np.stack([pad, np.roll(pad, 37)], axis=1)
    bus = np.zeros((total_samples, 2), dtype=np.float32)
    bus[i0:i0 + n] = st
    return bus


def clause_split(text):
    """Verbatim clause split for the picture's per-sentence subtitles: split AFTER 。！？ and after
    ——. The delimiter stays with the clause it closes, and no character is ever added, removed or
    rewritten - the concatenation of the returned list is the original string, byte for byte."""
    parts, buf, i = [], "", 0
    while i < len(text):
        ch = text[i]
        buf += ch
        if ch in "。！？":
            parts.append(buf)
            buf = ""
        elif text.startswith("——", i):
            buf += text[i + 1]
            i += 1
            parts.append(buf)
            buf = ""
        i += 1
    if buf:
        parts.append(buf)
    return [p for p in parts if p]


def _silence_runs(clip, thr_rel=0.05, min_ms=40, env_ms=12.0):
    """Silence detection on a decoded TTS clip: 12 ms envelope, relative threshold, runs >= 40 ms.
    Returns [(mid_s, dur_s, depth_rel), ...] plus the speech level and the threshold used."""
    mono = clip.mean(axis=1)
    env = movavg(np.abs(mono), env_ms / 1000.0 * SR)
    lvl = float(np.percentile(env, 90)) or 1e-9
    thr = lvl * thr_rel
    sil = env < thr
    runs, i, minlen = [], 0, int(min_ms / 1000.0 * SR)
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]:
                j += 1
            if j - i >= minlen:
                runs.append(((i + j) / 2.0 / SR, (j - i) / SR, float(env[i:j].min()) / lvl))
            i = j
        else:
            i += 1
    return runs, lvl, thr


def _pick_boundaries(runs, targets, min_gap=0.22, accept=0.90):
    """For every proportional target pick the silence run that fits it best (close to the
    character-weighted estimate, with a bonus for longer runs). Nothing available -> keep the
    proportional estimate and say so."""
    chosen, src, pauses, used = [], [], [], set()
    for tgt in targets:
        best = None
        for ri, (mid, dur, _depth) in enumerate(runs):
            if ri in used or any(abs(mid - c) < min_gap for c in chosen):
                continue
            score = abs(mid - tgt) - 0.30 * min(dur, 0.6)
            if best is None or score < best[0]:
                best = (score, ri, mid, dur)
        if best is not None and best[0] < accept:
            used.add(best[1])
            chosen.append(best[2])
            src.append("silence")
            pauses.append(best[3])
        else:
            chosen.append(tgt)
            src.append("proportional")
            pauses.append(0.0)
    for k in range(1, len(chosen)):                      # keep strictly increasing
        if chosen[k] <= chosen[k - 1] + 0.05:
            chosen[k] = chosen[k - 1] + 0.05
            src[k] = "proportional"
            pauses[k] = 0.0
    return chosen, src, pauses


def build_sub_clause_plan(segs, fps, silent):
    """The authoritative per-sentence subtitle plan: verbatim text, measured (or interpolated)
    times and frame numbers. Silence detection runs on the same trimmed TTS clips the mix uses,
    so clause times and the audio timeline cannot drift apart."""
    items, n_sil, n_prop = [], 0, 0
    for s in segs:
        clauses = clause_split(s["text"])
        if len(clauses) <= 1:
            items.append(dict(seg=s["id"], act=s["act"], idx=0, text=s["text"],
                              start=round(s["start"], 3), dur=round(s["voice_dur"], 3),
                              end=round(s["end"], 3),
                              frame_start=int(round(s["start"] * fps)),
                              frame_end=int(round(s["end"] * fps)),
                              source="silence", chars=len(s["text"]),
                              units=round(text_units(s["text"]), 1)))
            n_sil += 1
            continue
        units = [text_units(c) for c in clauses]
        tot = sum(units) or 1.0
        cum, targets = 0.0, []
        for u in units[:-1]:
            cum += u
            targets.append(s["voice_dur"] * cum / tot)
        clip = s.get("clip")
        chosen, src, pauses = None, None, None
        if clip is not None and not silent:
            runs, _lvl, _thr = _silence_runs(clip)
            chosen, src, pauses = _pick_boundaries(runs, targets)
        if not chosen:
            chosen, src = list(targets), ["proportional"] * len(targets)
            pauses = [0.0] * len(targets)
        bounds = [0.0] + list(chosen) + [float(s["voice_dur"])]
        edge_src = ["silence"] + list(src) + ["silence"]
        for k, ctext in enumerate(clauses):
            t0, t1 = bounds[k], bounds[k + 1]
            measured = edge_src[k] == "silence" and edge_src[k + 1] == "silence"
            pause_after = (pauses[k] if (pauses and k < len(pauses)) else 0.0)
            n_sil += 1 if measured else 0
            n_prop += 0 if measured else 1
            items.append(dict(seg=s["id"], act=s["act"], idx=k, text=ctext,
                              start=round(s["start"] + t0, 3), dur=round(t1 - t0, 3),
                              end=round(s["start"] + t1, 3),
                              frame_start=int(round((s["start"] + t0) * fps)),
                              frame_end=int(round((s["start"] + t1) * fps)),
                              source=("silence" if measured else "proportional"),
                              chars=len(ctext), units=round(text_units(ctext), 1),
                              pause_after_s=(round(pause_after, 3) if measured else 0.0)))
    return items, dict(count=len(items), by_silence=n_sil, by_proportional=n_prop)


def measure_bgm_grid(path, bgm_offset, total_dur, fps, analyze_sec=60.0, lo_bpm=50.0, hi_bpm=180.0):
    """Measure the music bed's own grid: tempo from the onset-flux autocorrelation, then the beat
    phase and the 4/4 bar phase by scoring the flux at the candidate positions. Everything is
    returned in FILM time (the bed is used from --bgm-offset), so a renderer can lock to it."""
    if not Path(str(path)).is_file():
        return {}
    a = decode_audio(path)
    mono = a.mean(axis=1)[: int(analyze_sec * SR)]
    hop, nfft = 480, 1024
    nfr = (len(mono) - nfft) // hop
    if nfr < 16:
        return {}
    win = np.hanning(nfft).astype(np.float32)
    S = np.empty((nfr, nfft // 2 + 1), dtype=np.float32)
    for i in range(nfr):
        S[i] = np.abs(np.fft.rfft(mono[i * hop:i * hop + nfft] * win))
    S = np.log1p(S * 50.0)
    flux = np.maximum(0.0, np.diff(S, axis=0)).sum(axis=1)
    flux = flux - flux.mean()
    hz = SR / hop
    lags = np.arange(int(hz * 60.0 / hi_bpm), max(int(hz * 60.0 / lo_bpm), 2))
    ac = np.array([float(np.dot(flux[:len(flux) - l], flux[l:])) / max(len(flux) - l, 1) for l in lags])
    k = int(np.argmax(ac))
    lag = float(lags[k])
    if 0 < k < len(ac) - 1:
        y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
        lag += 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-12)
    beat_sec = lag / hz
    bpm = 60.0 / beat_sec
    n_beat = int(len(mono) / SR / beat_sec) + 2
    best = None
    for pi in range(max(1, int(beat_sec * hz))):
        ph = pi / hz
        idx = np.round((ph + np.arange(n_beat) * beat_sec) * hz).astype(int)
        idx = idx[(idx >= 0) & (idx < len(flux))]
        sc = float(flux[idx].sum())
        if best is None or sc > best[0]:
            best = (sc, ph)
    ph0 = best[1]
    bar_scores = []
    for j in range(4):
        idx = np.round((ph0 + (np.arange(n_beat) + j) * beat_sec) * hz).astype(int)
        idx = idx[(idx >= 0) & (idx < len(flux))]
        bar_scores.append(round(float(flux[idx].sum()), 1))
    jb = int(np.argmax(bar_scores))
    src0 = ph0 + jb * beat_sec
    while src0 - beat_sec >= 0:
        src0 -= beat_sec
    beat_t0 = src0 - float(bgm_offset)
    while beat_t0 < 0:
        beat_t0 += beat_sec
    beats, t = [], beat_t0
    while t <= total_dur + 1e-9:
        beats.append(round(t, 4))
        t += beat_sec
    down_t0 = beat_t0 + ((jb - int(round((beat_t0 + float(bgm_offset) - ph0) / beat_sec))) % 4) * beat_sec
    while down_t0 - 4 * beat_sec >= 0:
        down_t0 -= 4 * beat_sec
    bars, t = [], down_t0
    while t <= total_dur + 1e-9:
        bars.append(round(t, 4))
        t += 4 * beat_sec
    return dict(bpm=round(bpm, 2), beat_sec=round(beat_sec, 5), beat_frames=round(beat_sec * fps, 3),
                bar_sec=round(4 * beat_sec, 5), bar_frames=round(4 * beat_sec * fps, 3),
                first_beat_t=round(beat_t0, 4), first_beat_frame=int(round(beat_t0 * fps)),
                first_downbeat_t=round(down_t0, 4), first_downbeat_frame=int(round(down_t0 * fps)),
                beat_times=beats, beat_frames_list=[int(round(x * fps)) for x in beats],
                bar_times=bars, bar_frames_list=[int(round(x * fps)) for x in bars],
                beat_count=len(beats), bar_count=len(bars),
                bar_phase_scores=bar_scores, bar_phase_index=jb,
                analysis=dict(window_s=analyze_sec, onset_hz=round(hz, 1), method="onset-flux autocorrelation + phase scoring"))

def nearest_beats(wipes, grid, mark_gap=0.12):
    """Per wipe: the nearest beat of the bed, the offset (ms / frames) and whether a musical beat
    mark is worth adding (skip it when the wipe accent is already within mark_gap)."""
    P = grid.get("beat_seconds", grid.get("beat_sec"))
    b0 = grid.get("first_beat_t")
    if not P or b0 is None:
        return [None] * len(wipes)
    out = []
    for w in wipes:
        k = round((w - b0) / P)
        tb = b0 + k * P
        out.append(dict(wipe=round(w, 3), beat=round(tb, 4), offset_ms=round((tb - w) * 1000.0, 1),
                        offset_frames=round((tb - w) * 24.0, 2), mark=bool(abs(tb - w) >= mark_gap)))
    return out


def best_grid_phase(cuts, bpm, steps=800):
    """The beat phase that puts the grid's beats as close as possible to the picture's cuts."""
    P = 60.0 / float(bpm)
    best = None
    for k in range(steps):
        phi = k * P / steps
        tot = 0.0
        for c in cuts:
            d = (c - phi) % P
            tot += min(d, P - d)
        if best is None or tot < best[0]:
            best = (tot, phi)
    return best[1], best[0]


def choose_bar_phase(beat_anchor, cuts, bpm):
    """Which of the four beats carries the downbeat, so the bars sit as close to the cuts as
    possible (the bar phase is the weakest part of any tempo estimate - here it is chosen)."""
    P = 60.0 / float(bpm)
    Bp = 4.0 * P
    best = None
    for j in range(4):
        a = beat_anchor + j * P
        tot = 0.0
        for c in cuts:
            m = round((c - a) / Bp)
            tot += abs(c - (a + m * Bp))
        if best is None or tot < best[0]:
            best = (tot, a)
    return best[1], best[0]


def build_music_grid(bpm, downbeat_anchor, total_dur, fps):
    """The bed's grid in FILM time, exactly as composed (no estimation involved)."""
    P = 60.0 / float(bpm)
    Bp = 4.0 * P
    a = float(downbeat_anchor)
    while a < 0:
        a += Bp
    while a - Bp >= 0:
        a -= Bp
    beats, t = [], a
    while t <= total_dur + 1e-9:
        beats.append(round(t, 4))
        t += P
    bars, t = [], a
    while t <= total_dur + 1e-9:
        bars.append(round(t, 4))
        t += Bp
    return dict(bpm=round(float(bpm), 4), beat_seconds=round(P, 6), bar_seconds=round(Bp, 6),
                beats_per_bar=4, first_beat_t=round(a, 4), first_beat_frame=int(round(a * fps)),
                first_downbeat_t=round(a, 4), first_downbeat_frame=int(round(a * fps)),
                beat_frames=[int(round(x * fps)) for x in beats],
                bar_frames=[int(round(x * fps)) for x in bars],
                beat_times=beats, bar_times=bars,
                beat_count=len(beats), bar_count=len(bars),
                frame_seconds=round(1.0 / fps, 6),
                source="composed (mgaudio, exact tempo - no estimation)",
                analysis=dict(method="authored grid: bpm fixed by --bpm, phase chosen to minimise "
                                     "the distance from the picture's cuts to the nearest beat"))


def compose_bed(total_dur, fps, downbeat_anchor, cuts, args, mgmods):
    """Write the film's own track with the mg-styles-15 mgaudio engine: 4/4 kick, driving analog
    bass, pluck arp + lead, hats/shaker drive and tom fills that land ON the picture's cuts.
    Energetic electronic hybrid for a product launch - deliberately not a lofi bed."""
    mg = mgmods[0]
    mg.reset_rng(SFX_SEED)          # the drum/synth generators draw from the global RNG
    D, S = mg.drums, mg.synth
    mx = mg.mix.Mix(duration=total_dur, bpm=float(args.bpm), anchor=float(downbeat_anchor), beats_per_bar=4)
    g = mx.grid
    P, BL = g.beat_len, g.bar_len
    cuts = [round(round(c * fps) / fps, 6) for c in cuts]        # frame-locked cut times
    tracks = dict(kick=mx.track("kick", gain=0.0), sub=mx.track("sub", gain=-7.0),
                  bass=mx.track("bass", gain=-3.5), clap=mx.track("clap", gain=-5.0),
                  hats=mx.track("hats", gain=-12.0), shaker=mx.track("shaker", gain=-15.0),
                  arp=mx.track("arp", gain=-10.0), lead=mx.track("lead", gain=-8.5),
                  pad=mx.track("pad", gain=-16.0), perc=mx.track("perc", gain=-8.0))
    # A minor, one chord per bar, four-bar cycle: Am | F | C | G
    PROG = [("A", ["A3", "C4", "E4"], "A1", "A2"), ("F", ["F3", "A3", "C4"], "F1", "F2"),
            ("C", ["C4", "E4", "G4"], "C2", "C3"), ("G", ["G3", "B3", "D4"], "G1", "G2")]
    SECTIONS = [("intro", 0.0, cuts[0]), ("act2", cuts[0], cuts[1]), ("act3", cuts[1], cuts[2]),
                ("act4", cuts[2], cuts[3]), ("act5", cuts[3], cuts[4]), ("outro", cuts[4], total_dur)]
    def sec_at(t):
        for name, t0, t1 in SECTIONS:
            if t0 - 1e-9 <= t < t1 - 1e-9:
                return name
        return "outro"
    LEAD = ["E5", "G5", "A5", "G5", "E5", "D5", "C5", "D5"]
    b0 = g.bar_at(0.0) - 1
    b1 = g.bar_at(total_dur - 1e-9)
    for b in range(b0, b1 + 1):
        tbar = g.bar(b)
        if tbar >= total_dur:
            continue
        name, s0, s1 = next(((n, a, z) for n, a, z in SECTIONS if a - 1e-9 <= tbar < z - 1e-9),
                            ("outro", cuts[4], total_dur))
        _ch, arp_notes, root, root_hi = PROG[b % 4]
        lo, hi = max(0.0, s0), min(total_dur, s1)
        kw = dict(t_min=lo, t_max=hi)
        intro, act2, act3, act4, act5 = (name == "intro", name == "act2", name == "act3",
                                         name == "act4", name == "act5")
        # --- kick: four on the floor; act4 opens with a break
        if not (act4 and tbar < cuts[3] - 1.6):
            tracks["kick"].pattern(lambda v: D.kick("punchy", v), "x...x...x...x...",
                                   bar=b, vel=1.0 if not intro else 0.9, **kw)
            tracks["sub"].pattern(lambda v: S.b808(("A0" if b % 4 == 0 else "F0"), 0.30, v),
                                  "x...........x...", bar=b, vel=0.9, **kw)
        # --- clap / snare on 2 and 4
        if not intro and not act4:
            tracks["clap"].pattern(lambda v: D.clap("808", v), "....x.......x...", bar=b, **kw)
        # --- hats: offbeat 8ths everywhere, 16ths in the driving sections
        hpat = "..x.x.x...x.x.x." if (act3 or act5) else "..x...x...x.x.x."
        tracks["hats"].pattern(lambda v: D.hat("closed", v), hpat, bar=b, vel=0.85, **kw)
        if act5:
            tracks["shaker"].pattern(lambda v: D.shaker(v), "x.x.x.x.x.x.x.x.", bar=b,
                                     vel=0.5, **kw)
        # --- bass: driving 8ths with an octave kick on the last 8th
        if not act4:
            for i in range(8):
                tt = g.step(i * 2, div=16, bar=b)
                if tt < lo - 1e-9 or tt >= hi - 1e-9:
                    continue
                nn = root_hi if i % 4 == 3 else root
                tracks["bass"].add(S.bass(nn, 0.40 * P, 0.95, kind="analog"), tt)
        # --- arp: 16ths over the chord tones (the main synth line)
        for i in range(16):
            tt = g.step(i, div=16, bar=b)
            if tt < lo - 1e-9 or tt >= hi - 1e-9:
                continue
            if act4 and i % 4 == 0:
                continue
            nn = arp_notes[i % len(arp_notes)]
            vel = 0.55 if intro else (0.62 if act4 else 0.72)
            tracks["arp"].add(S.pluck(nn, 0.16 * P, vel, kind="saw"), tt)
        # --- lead motif in the big sections
        if act3 or act5:
            for i, nn in enumerate(LEAD):
                if act5 and i % 4 == 3:
                    continue
                tt = g.step(i * 2, div=16, bar=b)
                if tt < lo - 1e-9 or tt >= hi - 1e-9:
                    continue
                tracks["lead"].add(S.lead(nn, 0.42 * P, 0.62, kind="saw", vib=True), tt)
        # --- pad under everything (body, never in the way)
        if not intro:
            tracks["pad"].add(S.pad(arp_notes, BL * 0.96, 0.5, kind="warm"), max(tbar, 0.0))
        # --- fills: a 16th tom roll landing exactly on each cut, plus crash + hit on the cut
        for ci, c in enumerate(cuts):
            if tbar - 1e-9 <= c < tbar + BL - 1e-9:
                for k, pitch in zip(range(4, 0, -1), ("mid", "mid", "low", "low")):
                    tt = c - k * P / 4.0
                    if tt >= 0:
                        tracks["perc"].add(D.tom(pitch, 0.9, kind="acoustic"), tt)
        if tbar <= cuts[0] < tbar + BL:
            tracks["perc"].add(D.snare("tight", 0.7), max(0.05, cuts[0] - P))
    # --- events exactly on the picture's cuts (frame-locked) + the end-card cadence
    for c in cuts:
        tracks["kick"].add(D.kick("punchy", 1.0, drive=1.2), c)
        tracks["perc"].add(D.cymbal("crash", 0.85), c)
        tracks["sub"].add(S.b808("A0", 0.9, 0.95), c)
        tracks["bass"].add(S.bass("A1", 1.2 * P, 0.95, kind="analog"), c)
    last_beat = round(round(args.endcard_beat * fps) / fps, 6)
    tracks["sub"].add(S.b808("A0", 1.4, 0.9), last_beat)
    tracks["lead"].add(S.lead("A5", 1.6, 0.55, kind="saw"), last_beat)
    tracks["pad"].add(S.pad(["A3", "C4", "E4", "A4"], max(0.5, total_dur - last_beat - 0.15), 0.45, kind="warm"),
                      last_beat)
    tracks["perc"].add(D.cymbal("crash", 0.7, decay=2.2), last_beat)
    bed = mx.render()
    bed = np.ascontiguousarray(np.nan_to_num(bed).T[:, :2]).astype(np.float32)   # (2,N) -> (N,2)
    if len(bed) < int(round(total_dur * SR)):
        bed = np.vstack([bed, np.zeros((int(round(total_dur * SR)) - len(bed), 2), dtype=np.float32)])
    bed = bed[: int(round(total_dur * SR))]
    peak = float(np.abs(bed).max())
    if peak > 1e-9:
        bed = bed * (0.89 / peak)                       # leave the bed ~-1 dBFS of its own headroom
    meta = dict(sections=[dict(name=n, start=round(a, 3), end=round(z, 3)) for n, a, z in SECTIONS],
                cut_events=[dict(t=c, frame=int(round(c * fps)), kind="fill(4x16th tom)+kick+crash+bass")
                            for c in cuts],
                parts=list(tracks.keys()),
                note="authored with the mg-styles-15 mgaudio engine (drums/synth/pluck/fm + Mix/Track)",
                n_beats=int(total_dur / P), n_bars=int(total_dur / BL) + 1)
    return bed, meta


def compose_bed_cached(total_dur, fps, anchor, cuts, args, mgmods, quiet=False):
    """Composing the bed costs several minutes, so it is cached like the TTS takes: same tempo,
    phase, cut set and duration -> same file. --force recomposes."""
    BED_CACHE.mkdir(parents=True, exist_ok=True)
    tag = hashlib.sha1(json.dumps(dict(bpm=float(args.bpm), anchor=round(float(anchor), 5),
                                       cuts=[round(float(c), 5) for c in cuts],
                                       dur=round(float(total_dur), 4), seed=SFX_SEED), sort_keys=True
                                 ).encode()).hexdigest()[:12]
    wav = BED_CACHE / ("bed_%s.wav" % tag)
    jsf = BED_CACHE / ("bed_%s.json" % tag)
    if wav.is_file() and jsf.is_file() and not args.force:
        try:
            meta = json.loads(jsf.read_text(encoding="utf-8"))
            bed = read_wav(wav)
            if len(bed) >= int(round(total_dur * SR)) - 8:
                return np.ascontiguousarray(bed[: int(round(total_dur * SR))]), meta, "cache"
        except Exception:
            pass
    if not quiet:
        print("      composing the bed with mgaudio (first time for this tempo/phase; ~5 min)...")
    bed, meta = compose_bed(total_dur, fps, anchor, cuts, args, mgmods)
    meta = dict(meta, cache_tag=tag, bpm=float(args.bpm), anchor=round(float(anchor), 5))
    write_wav24(wav, bed)
    jsf.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return bed, meta, "composed"


def build_cues(fps, segs, wipes, args, beat_marks=None):
    """All cue times are quantised to the 24 fps frame grid. The four wipe accents (tight low hit
    + paper tear) sit exactly ON the wipe frame; the riser ends there. The optional beat marks sit
    on the MUSIC's own grid (nearest beat to each wipe) - the picture's frame lock always wins."""
    cues = []
    if args.no_sfx:
        return cues
    for bm in (beat_marks or []):
        if bm and bm.get("mark"):
            cues.append(dict(t=bm["beat"], name="beat", gain=0.14, kind="music_beat",
                             frame=int(round(bm["beat"] * fps)), sync="start",
                             note="音乐拍点重音（幕切最近拍 %+.0f ms）" % bm["offset_ms"]))
    cues.append(dict(t=frame_snap(0.12, fps), name="pop", gain=0.16, kind="film_open",
                     frame=int(round(0.12 * fps)), sync="start", note="开场 pop"))
    for i, w in enumerate(wipes, start=1):
        wf = int(round(w * fps))
        tw = wf / fps                                   # frame-locked wipe time
        cues.append(dict(t=tw, name="hit", gain=args.accent_hit_gain, kind="wipe_accent",
                         frame=wf, sync="start", note="幕%d 擦除重音·低频冲击（tight punch，帧 %d）" % (i + 1, wf)))
        cues.append(dict(t=tw, name="tear", gain=args.accent_tear_gain, kind="wipe_accent",
                         frame=wf, sync="start", note="幕%d 擦除重音·纸撕裂层（帧 %d）" % (i + 1, wf)))
        cues.append(dict(t=tw, name="riser", gain=args.riser_gain, kind="wipe_build",
                         frame=wf, sync="end", note="幕%d 推入 riser（尾端=切点帧 %d）" % (i + 1, wf)))
    ecos = round(float(args.endcard_start), 3)          # the PICTURE cuts to the end card here
    ef = int(round(ecos * fps))
    cues.append(dict(t=ef / fps, name="reverse", gain=0.18, kind="endcard", frame=ef, sync="end",
                     note="落版反镲推入（峰值=画面落版首帧 %d / %.3f s）" % (ef, ecos)))
    cues.append(dict(t=ef / fps, name="boom", gain=0.30, kind="endcard", frame=ef, sync="start",
                     note="落版落地 sub boom（帧 %d）" % ef))
    beat = round(round(args.endcard_beat * fps) / fps, 6)
    cues.append(dict(t=beat, name="chime", gain=0.26, kind="endcard", frame=int(round(beat * fps)),
                     sync="start", note="落版最后一拍 chime（帧 %d）" % int(round(beat * fps))))
    cues.sort(key=lambda c: c["t"])
    return cues


def build_buses(segs, cues, mgmods, args, total_samples, bed_override=None):
    """Voice / music / SFX buses at unity, so the calibration loop can re-render cheaply."""
    vo = np.zeros((total_samples, 2), dtype=np.float32)
    for s in segs:
        clip = s["clip"]
        i0 = int(round(s["start"] * SR))
        i1 = min(total_samples, i0 + len(clip))
        if i1 > i0:
            vo[i0:i1] += clip[:i1 - i0]
    music, music_rms = None, None
    bgm_path = Path(str(args.bgm))
    if bed_override is not None and not args.no_bgm:
        music = np.ascontiguousarray(bed_override[:total_samples])
        music_rms = float(np.sqrt(np.mean(music.astype(np.float64) ** 2)))
    elif not args.no_bgm and bgm_path.is_file():
        bgm = decode_audio(args.bgm)
        off = int(args.bgm_offset * SR)
        if off >= len(bgm):
            off = 0
        tile = bgm[off:]
        while len(tile) < total_samples:
            tile = np.vstack([tile, bgm])
        music = np.ascontiguousarray(tile[:total_samples])
        music_rms = float(np.sqrt(np.mean(music.astype(np.float64) ** 2)))
    elif not args.no_bgm:
        print("[mix] WARNING: BGM not found at %s - music layer skipped" % bgm_path)
    sfx = np.zeros((total_samples, 2), dtype=np.float32)
    cache = {}
    for c in cues:
        if c["name"] not in cache:
            cache[c["name"]] = make_cue(c["name"], mgmods) if mgmods else fallback_cue(c["name"])
        clip = cache[c["name"]]
        i0 = int(round(c["t"] * SR))
        if c.get("sync") == "end":
            i0 -= len(clip)                     # t marks the sync (peak) moment of the cue
        j0 = max(0, -i0)
        i0c = max(0, i0)
        i1 = min(total_samples, i0 + len(clip))
        if i1 > i0c:
            sfx[i0c:i1] += clip[j0:j0 + (i1 - i0c)] * float(c["gain"])
    return dict(vo=vo, music=music, music_rms=music_rms, sfx=sfx, cues_synth=cache)


def finale_lift(total_samples, total_dur, segs, args, ride_db):
    """Shaped level ride across the WHOLE mix: voice, music, FX and pad rise together, so the
    voice-to-bed separation of D9 is preserved at every instant (unlike a bed wash, which lifts
    only the music and buries the dialogue). The loud end of the loudness range now comes from
    this declared crescendo over the last ~2.8 s, then the mix settles for the end card and
    fades cleanly to silence."""
    ve = float(segs[-1]["end"])
    t0 = max(0.0, ve - args.ride_dur - args.ride_ramp)
    ec = max(ve, float(args.endcard_start))
    pts = [(0.0, 0.0), (t0, 0.0), (max(t0, ve - args.ride_dur), ride_db), (ve, ride_db),
           (ec, args.ride_settle_db), (max(ec, total_dur - args.fade_out), args.ride_settle_db),
           (total_dur, -60.0)]
    xs = np.array([p[0] for p in pts], dtype=np.float64)
    ys = np.array([p[1] for p in pts], dtype=np.float64)
    tt = np.arange(total_samples, dtype=np.float64) / SR
    lin = movavg(10 ** (np.interp(tt, xs, ys) / 20.0), max(1.0, 0.030 * SR))
    return lin.astype(np.float32)


def apply_ride(mix, buses, args):
    """Ride gain (whole mix) + density in the ridden stretch. Under a true-peak ceiling a peaky
    crescendo is simply limited back to where it started, so the ridden stretch is soft-clipped
    to a target crest: its loudness rises while its peaks stay where the program's peaks already
    are. Every bus keeps its relative level, which is what keeps D9's voice/bed separation."""
    if buses.get("lift") is not None:
        mix = mix * buses["lift"][:, None]
    ride = buses.get("ride")
    if ride is not None:
        m0, m1, crest_db = ride
        if m1 > m0 and crest_db > 0:
            seg = mix[m0:m1].copy()
            rms = float(np.sqrt(np.mean(seg.astype(np.float64) ** 2)))
            if rms > 1e-9:
                lvl = rms * (10 ** (crest_db / 20.0))
                mix[m0:m1] = (np.tanh(seg / lvl) * lvl).astype(np.float32)
    return mix


def render_mix(buses, vo_gain, music_gain, pad_gain, sfx_scale=1.0):
    """Music/pad are voiced-relative by construction; the SFX bus is scaled with the voice so
    the accents keep their designed punch whatever gain the calibration settles on."""
    mix = buses["vo"] * np.float32(vo_gain)
    if buses["music"] is not None and music_gain is not None:
        mix = mix + buses["music"] * music_gain[:, None]
    mix = mix + buses["sfx"] * np.float32(sfx_scale)
    if buses.get("pad") is not None and pad_gain > 0:
        mix = mix + buses["pad"] * np.float32(pad_gain)
    return apply_ride(mix, buses, None)


def body_rms_db(a, segs, exclude=None):
    """Energy-weighted RMS of the voice body - the number --body-rms-target refers to.
    exclude=(t0, t1) drops a stretch (the finale ride, which is a deliberate crescendo and would
    otherwise dominate an energy-weighted figure)."""
    tot, dur = 0.0, 0
    for s in segs:
        i0, i1 = int(s["start"] * SR), int(s["end"] * SR)
        if exclude:
            e0, e1 = int(exclude[0] * SR), int(exclude[1] * SR)
            # keep the part of the span before the excluded stretch and the part after it
            for seg in (a[i0:max(i0, min(i1, e0))], a[max(i0, min(i1, e1)):i1]):
                if len(seg):
                    tot += float(np.sum(seg.astype(np.float64) ** 2))
                    dur += len(seg)
            continue
        seg = a[i0:i1]
        if len(seg) == 0:
            continue
        tot += float(np.sum(seg.astype(np.float64) ** 2))
        dur += len(seg)
    return 10 * np.log10(max(tot / max(dur, 1), 1e-12))


def accent_frame_error(a, nominal_t, fps, search=0.10):
    """Transient onset of a wipe accent measured on the master, in frames."""
    i0 = max(0, int((nominal_t - search) * SR))
    i1 = min(len(a), int((nominal_t + search) * SR))
    seg = a[i0:i1].mean(axis=1)
    if len(seg) < 8:
        return dict(nominal=round(nominal_t, 4), attack=None, error_ms=None, error_frames=None)
    # onset of the low impact, not the loudest later sample: first crossing of 35% of the
    # local envelope peak, measured on a low-band envelope (the sub thump is the accent body).
    env = movavg(np.abs(seg), 0.0025 * SR)
    thr = 0.35 * float(env.max())
    t_atk = (i0 + int(np.argmax(env > thr))) / SR
    return dict(nominal=round(nominal_t, 4), attack=round(t_atk, 4),
                error_ms=round((t_atk - nominal_t) * 1000.0, 2),
                error_frames=round((t_atk - nominal_t) * fps, 2))


def audio_qa(a, fps, wipes):
    """The metrics the blind review asked for: LRA inputs, 1 s / 0.5 s RMS window extremes,
    crest factor and the measured frame error of every wipe accent."""
    mono = a.mean(axis=1)
    def blocks(win, hop):
        w, h = int(win * SR), max(1, int(hop * SR))
        out, i = [], 0
        while i + w <= len(mono):
            seg = mono[i:i + w]
            out.append((i / SR, 20 * np.log10(max(float(np.sqrt(np.mean(seg ** 2))), 1e-9))))
            i += h
        return out
    r05, r10 = blocks(0.5, 0.5), blocks(1.0, 0.5)
    crest = []
    for i in range(0, max(1, len(mono) - SR + 1), SR):
        seg = mono[i:i + SR]
        r = float(np.sqrt(np.mean(seg ** 2)))
        crest.append(20 * np.log10(max(float(np.abs(seg).max()), 1e-9) / max(r, 1e-9)))
    lo05 = min(r05, key=lambda x: x[1])
    hi05 = max(r05, key=lambda x: x[1])
    lo10 = min(r10, key=lambda x: x[1])
    hi10 = max(r10, key=lambda x: x[1])
    accents = [accent_frame_error(a, w, fps) for w in wipes]
    return dict(
        rms_05s_min=round(lo05[1], 2), rms_05s_min_at=round(lo05[0], 2),
        rms_05s_max=round(hi05[1], 2), rms_05s_max_at=round(hi05[0], 2),
        rms_1s_min=round(lo10[1], 2), rms_1s_min_at=round(lo10[0], 2),
        rms_1s_max=round(hi10[1], 2), rms_1s_max_at=round(hi10[0], 2),
        crest_mean=round(float(np.mean(crest)), 2), crest_min=round(float(np.min(crest)), 2),
        crest_max=round(float(np.max(crest)), 2),
        accents=accents,
        accent_max_frame_error=(max(abs(x["error_frames"]) for x in accents if x["error_frames"] is not None)
                                if accents else None),
    )


# ---------------------------------------------------------------------------
# 9. Spec PNG (waveform + act/segment map + loudness report)
# ---------------------------------------------------------------------------
def d9_report(a, segs, cues, buses, args, pad_gain, master_gain, sfx_scale, total_dur):
    """D9 ledger. For the two windows the round-2 review probed it reports the total RMS, the
    LOCAL VOICE reference either side of the window and the isolated bed contribution (pad /
    riser / hit) as it lands in the master. The requirement: bed >= 6 dB below the local voice.
    Isolated beds are measured on the mix buses and scaled by the applied master gain and the
    finale ride, so the numbers are directly comparable with the master's window RMS."""
    lift = buses.get("lift")

    def scale(bus):
        out = bus * np.float32(master_gain)
        if lift is not None:
            out = out * lift[:, None]
        return out

    def _rms(t0, t1, arr):
        i0, i1 = max(0, int(round(t0 * SR))), min(len(arr), int(round(t1 * SR)))
        if i1 <= i0 or arr is None:
            return None
        return 20 * np.log10(max(float(np.sqrt(np.mean(arr[i0:i1].astype(np.float64) ** 2))), 1e-9))

    def cue_bus(names):
        bus = np.zeros_like(a)
        cache = buses.get("cues_synth") or {}
        for c in cues:
            clip = cache.get(c["name"])
            if clip is None or c["name"] not in names:
                continue
            i0 = int(round(c["t"] * SR))
            if c.get("sync") == "end":
                i0 -= len(clip)
            j0, i0c = max(0, -i0), max(0, i0)
            i1 = min(len(a), i0 + len(clip))
            if i1 > i0c:
                bus[i0c:i1] += clip[j0:j0 + (i1 - i0c)] * float(c["gain"]) * sfx_scale
        return scale(bus)

    pad_master = scale(buses["pad"] * np.float32(pad_gain)) if (buses.get("pad") is not None and pad_gain) else None
    wins = [("gap_6.95_7.45", 6.95, 7.45, [(5.577, 6.577), (7.477, 8.477)]),
            ("endcard_43.70_45.90", float(args.endcard_start), float(total_dur), [(42.394, 43.394)])]
    out = {}
    for name, t0, t1, refs in wins:
        tot = _rms(t0, t1, a)
        vals = [v for v in (_rms(x, y, a) for x, y in refs) if v is not None]
        ref = min(vals) if vals else None
        out[name] = dict(window=[t0, t1], rms_total=round(tot, 2) if tot is not None else None,
                         voice_ref=round(ref, 2) if ref is not None else None,
                         separation_db=round(ref - tot, 2) if (ref is not None and tot is not None) else None,
                         pad_rms=round(_rms(t0, t1, pad_master), 2) if pad_master is not None else None,
                         riser_rms=round(_rms(t0, t1, cue_bus({"riser"})), 2),
                         hit_rms=round(_rms(t0, t1, cue_bus({"hit", "impact"})), 2))
    return out


def find_cjk_font():
    for cand in ("C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/msyhl.ttc", "C:/Windows/Fonts/simhei.ttf",
                 "C:/Windows/Fonts/simsun.ttc", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"):
        if Path(cand).is_file():
            return cand
    return None


def draw_spec_png(path, audio, tl, mastering, cue_note, args):
    from PIL import Image, ImageDraw, ImageFont

    font_path = find_cjk_font()
    def F(size, bold=False):
        if font_path:
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
        return ImageFont.load_default()
    cjk = bool(font_path)
    def L(zh, en):
        return zh if cjk else en

    W, H = 1600, 1080
    cream, ink, mint, coral, gold, dim = (247, 243, 234), (31, 29, 26), (155, 224, 197), (255, 112, 150), (255, 199, 44), (140, 132, 120)

    def clip_text(s, font, maxw):
        s = str(s)
        if d.textlength(s, font=font) <= maxw:
            return s
        while s and d.textlength(s + "…", font=font) > maxw:
            s = s[:-1]
        return s + "…"
    img = Image.new("RGB", (W, H), cream)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 74], fill=ink)
    f_title, f_sub = F(30), F(19)
    d.text((44, 20), "ANS · AI Never Stops  |  Day 01 / 28  " + L("混音母带规格", "audio master spec"), font=f_title, fill=cream)
    d.text((W - 44, 28), "out/audio_day01.wav", font=f_sub, fill=mint, anchor="ra")

    # ---- waveform ----
    wx0, wx1, wy0, wy1 = 70, W - 70, 120, 430
    frames = audio.shape[0]
    cols = wx1 - wx0
    step = max(1, frames // cols)
    mono = audio.mean(axis=1)
    env_max = np.array([mono[i:i + step].max() for i in range(0, frames, step)][:cols])
    env_min = np.array([mono[i:i + step].min() for i in range(0, frames, step)][:cols])
    if len(env_max) < cols:
        env_max = np.pad(env_max, (0, cols - len(env_max)))
        env_min = np.pad(env_min, (0, cols - len(env_min)))
    mid = (wy0 + wy1) / 2
    half = (wy1 - wy0) / 2 - 12
    d.rectangle([wx0, wy0, wx1, wy1], outline=dim, width=1)
    d.line([wx0, mid, wx1, mid], fill=(214, 206, 192), width=1)
    for i in range(len(env_max)):
        x = wx0 + i
        top = mid - float(env_max[i]) * half
        bot = mid - float(env_min[i]) * half
        if bot - top < 1:
            bot = top + 1
        d.line([x, top, x, bot], fill=(52, 128, 104))
    f_small, f_mid, f_seg = F(16), F(21), F(24)
    d.text((wx0, wy0 - 26), L("波形（L/R 合并包络）", "Waveform (L/R summed envelope)"), font=f_small, fill=ink)
    d.text((wx1, wy0 - 26), L("▲ 幕切换重音 hit+tear（帧锁定）· ▲ 落版 boom/chime",
                              "▲ wipe accent hit+tear (frame-locked) · ▲ end-card boom/chime"),
           font=f_small, fill=dim, anchor="ra")

    y_lab = wy0 + 6
    for act in tl["acts"]:
        x = wx0 + int(round(act["wipe"] / tl["total_duration"] * cols)) if act.get("wipe") is not None else wx0
        if act["act"] > 1:
            for yy in range(wy0, wy1, 10):
                d.line([x, yy, x, yy + 5], fill=coral, width=2)
        d.text((x + 8, y_lab), "ACT %d" % act["act"], font=f_mid, fill=ink)
        seg = next(s for s in tl["segments"] if s["act"] == act["act"])
        sx = wx0 + int(round(seg["start"] / tl["total_duration"] * cols))
        ex = wx0 + int(round(seg["end"] / tl["total_duration"] * cols))
        d.line([sx, wy1 - 14, ex, wy1 - 14], fill=gold, width=6)
        d.text(((sx + ex) // 2, wy1 + 10), "%s  %.2fs" % (seg["id"], seg["voice_dur"]), font=f_seg, fill=ink, anchor="ma")
        d.text((sx + 2, y_lab + 30), "%s (%d 帧)" % (seg["id"], seg["frames"]), font=f_small, fill=dim)
    for c in tl["sfx_cues"]:
        x = wx0 + int(round(c["t"] / tl["total_duration"] * cols))
        col = coral if c["kind"] == "wipe_accent" else (gold if c["kind"] == "endcard" else dim)
        d.polygon([(x, wy1 + 2), (x - 5, wy1 + 12), (x + 5, wy1 + 12)], fill=col)

    # ---- short-term RMS lane ----
    rx0, rx1, ry0, ry1 = wx0, wx1, 505, 630
    d.rectangle([rx0, ry0, rx1, ry1], outline=dim, width=1)
    d.text((rx0, ry0 - 26), L("短时 RMS（dBFS，2 秒窗）", "Short-term RMS (dBFS, 2 s window)"), font=f_small, fill=ink)
    for db in (0, -12, -24, -36, -48):
        y = ry0 + int((db / -54.0) * (ry1 - ry0))
        if ry0 <= y <= ry1:
            d.line([rx0, y, rx1, y], fill=(226, 219, 205), width=1)
            d.text((rx1 - 4, y - 18), "%d dB" % db, font=f_small, fill=dim, anchor="ra")
    win = int(2.0 * SR)
    hop = max(1, frames // (rx1 - rx0))
    xs, ys = [], []
    for idx, i in enumerate(range(0, max(1, frames - win), hop)):
        chunk = audio[i:i + win]
        r = float(np.sqrt(np.mean(chunk ** 2))) if chunk.size else 0.0
        db = 20 * np.log10(max(r, 1e-6))
        xs.append(rx0 + idx)
        ys.append(ry0 + int(np.clip(db / -54.0, 0, 1) * (ry1 - ry0)))
        if rx0 + idx > rx1:
            break
    if len(xs) > 1:
        d.line(list(zip(xs, ys)), fill=coral, width=2)

    # ---- report block ----
    tx0, ty0 = 70, 700
    f_body, f_head = F(19), F(22)
    d.rectangle([tx0 - 18, ty0 - 22, W - 70, H - 44], outline=dim, width=1)
    d.text((tx0, ty0 - 4), L("实测报告", "Measured report"), font=f_head, fill=ink)
    rows = [("段", "S1", "S2", "S3", "S4", "S5"),
            (L("起点 s", "start s"), *["%.3f" % s["start"] for s in tl["segments"]]),
            (L("口播 s", "voice s"), *["%.3f" % s["voice_dur"] for s in tl["segments"]]),
            (L("含幕间距 s", "slot s"), *["%.3f" % s["dur"] for s in tl["segments"]]),
            (L("帧数", "frames"), *["%d" % s["frames"] for s in tl["segments"]])]
    colx = [tx0, tx0 + 250, tx0 + 400, tx0 + 550, tx0 + 700, tx0 + 850]
    for r, row in enumerate(rows):
        y = ty0 + 34 + r * 27
        for c, cell in enumerate(row):
            d.text((colx[c], y), str(cell), font=f_body, fill=ink if r == 0 else dim)
    rx = tx0 + 1000
    m = mastering
    qa = tl.get("qa") or {}
    arc = tl.get("music_arc") or {}
    detail = str(tl.get("provider_detail") or "")
    dmodel, _, dspeaker = detail.partition("/")
    luf = m.get("measured_lufs")
    tp = m.get("measured_tp_oversampled")
    lra = m.get("measured_lra")
    lines = [
        ("provider: %s%s" % (tl["provider"], (" · " + dmodel) if dmodel else ""), True),
        ((L("音色", "voice") + ": " + dspeaker) if dspeaker else L("音色: 默认", "voice: default"), False),
        (L("总时长", "total") + ": %.3f s · %d %s @ %d fps" % (tl["total_duration"], tl["total_frames"], L("帧", "frames"), tl["fps"]), True),
        (L("母带", "master") + ": " + ("%.2f LUFS (I) · %.2f dBTP" % (luf, tp) if luf is not None else L("静音脚手架", "silent scaffold")), True),
        ("LRA %s LU   (" % (("%.2f" % lra) if lra is not None else "-") + L("目标 5-7", "target 5-7") + ")", True),
        (L("正文", "body") + " RMS %.2f dBFS · " % m.get("body_rms_dbfs", float("nan"))
         + L("音乐低于人声 ", "music ") + "%.1f dB" % abs(arc.get("body_db", 0.0)), False),
        ("1 s RMS %.1f→%.1f · 0.5 s %.1f→%.1f · crest %.1f dB" % (
            qa.get("rms_1s_min", 0.0), qa.get("rms_1s_max", 0.0), qa.get("rms_05s_min", 0.0),
            qa.get("rms_05s_max", 0.0), qa.get("crest_mean", 0.0)), False),
        (L("擦除重音帧误差 max ", "wipe accent err max ") + "%.2f %s" % (
            qa.get("accent_max_frame_error", 0.0) or 0.0, L("帧", "frames")), False),
        (L("落版收尾", "finale ride") + ": +%.1f dB @%.1f-%.1f s · " % (
            (tl.get("ride") or {}).get("db", 0.0), (tl.get("ride") or {}).get("start", 0.0),
            (tl.get("ride") or {}).get("peak_at", 0.0)) + L("落版 -%.1f dB", "end card -%.1f dB") % abs(
            (tl.get("ride") or {}).get("settle_db", 0.0)), False),
        ("D9 " + L("分离度", "separation") + ": " + " · ".join(
            "%s %+.1f" % (k.split("_")[0], (v or {}).get("separation_db", 0.0)) for k, v in (tl.get("d9") or {}).items())
         + " dB " + L("(须>=6)", "(need>=6)"), False),
        ("SFX %d %s · hit/tear/riser/boom/chime" % (tl.get("sfx_count", len(tl["sfx_cues"])), L("条", "cues")), False),
    ]
    maxw = W - 70 - rx
    for i, (line, primary) in enumerate(lines):
        d.text((rx, ty0 + 34 + i * 26), clip_text(line, f_body, maxw), font=f_body, fill=ink if primary else dim)
    d.text((tx0, H - 40), L("逐字口播文本 = 字幕文本；SFX 全部对齐到 %d fps 帧格。" % tl["fps"], "Verbatim spoken text == subtitle text; all SFX quantised to the %d fps frame grid." % tl["fps"]), font=F(15), fill=dim)
    img.save(path)


# ---------------------------------------------------------------------------
# 10. main
# ---------------------------------------------------------------------------
def _jsonable(o):
    """JSON fallback for numpy scalars/arrays (never silently stringifies anything else)."""
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return float(o)
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    raise TypeError("not JSON serialisable: %r" % type(o))


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="ANS Day01 audio pipeline (voiceover + BGM + SFX + master)")
    p.add_argument("--provider", choices=("auto", "fish", "doubao", "scaffold"), default="auto")
    p.add_argument("--speed", type=float, default=1.12, help="delivery speed (Fish prosody.speed / Doubao speech_rate=%%)")
    p.add_argument("--fps", type=int, default=DEFAULT_FPS)
    p.add_argument("--out-dir", default=str(HERE / "out"))
    p.add_argument("--timeline", default=str(HERE / "day01_timeline.json"))
    p.add_argument("--bgm", default=str(MG_DEMO_ASSETS / "lofi-study_fassounds.mp3"))
    p.add_argument("--bgm-offset", type=float, default=8.5)
    p.add_argument("--bed-source", choices=("composed", "lofi"), default="composed",
                   help="composed: write the film's own 124 BPM track with mgaudio (default). "
                        "lofi: the old lofi-study_fassounds.mp3 bed")
    p.add_argument("--bpm", type=float, default=124.0, help="tempo of the composed bed")
    p.add_argument("--music-body-db", type=float, default=-13.0, help="music bed under the voice, dB rel. to the voice body RMS (D9)")
    p.add_argument("--music-gap-db", type=float, default=-13.5, help="music bed in the inter-act gaps, dB rel. to the voice (D9)")
    p.add_argument("--music-dip-db", type=float, default=-6.0, help="pre-wipe dip, dB below the gap level (work order: -6..-9)")
    p.add_argument("--music-dip-dur", type=float, default=0.55, help="pre-wipe dip length, seconds (work order: 0.4-0.6)")
    p.add_argument("--music-act5-db", type=float, default=-13.0, help="flat bed in act 5: the finale RIDE, not the bed, carries the crescendo")
    p.add_argument("--ride-db", type=float, default=6.0, help="finale level ride on the WHOLE mix (auto-calibrated for LRA)")
    p.add_argument("--ride-max-db", type=float, default=16.0)
    p.add_argument("--ride-crest-db", type=float, default=7.5, help="crest the ridden stretch is clipped to (density)")
    p.add_argument("--ride-min-db", type=float, default=0.0)
    p.add_argument("--ride-dur", type=float, default=1.20, help="ride hold before S5's voice ends")
    p.add_argument("--ride-ramp", type=float, default=1.60, help="ride ramp-in length, seconds")
    p.add_argument("--ride-settle-db", type=float, default=-3.0, help="level the mix settles to under the end card")
    p.add_argument("--music-endcard-db", type=float, default=-12.0, help="music under the end card, dB rel. to the voice (D9)")
    p.add_argument("--pad-db", type=float, default=-12.0, help="end-card pad level, dB rel. to the voice (D9: always below the voice)")
    p.add_argument("--pad-max-db", type=float, default=-6.0, help="the pad is never allowed above the voice (D9)")
    p.add_argument("--pad-min-db", type=float, default=-30.0)
    p.add_argument("--pad-lead", type=float, default=0.9, help="the pad ramps in this long before the end card starts")
    p.add_argument("--vo-gain", type=float, default=1.12)
    p.add_argument("--body-rms-target", type=float, default=-15.5, help="measured RMS of the voice body in the master")
    p.add_argument("--body-rms-tol", type=float, default=0.25)
    p.add_argument("--lra-target", type=float, default=5.8, help="auto-calibration target; target +- tol must stay inside the 5-7 LU band")
    p.add_argument("--lra-tol", type=float, default=0.6)
    p.add_argument("--bed-max-db", type=float, default=2.0, help="the bed may rise at most this far (keeps the D9 gap margin)")
    p.add_argument("--bed-min-db", type=float, default=-6.0)
    p.add_argument("--max-master-passes", type=int, default=10)
    p.add_argument("--tp-margin", type=float, default=0.35, help="internal true-peak margin below --tp")
    p.add_argument("--wipe-times", default="6.833,14.760,23.786,28.850",
                   help="picture-locked wipe times in seconds, comma separated, or 'auto' "
                        "(4th wipe re-cut to frame 692 / 28.85 s)")
    p.add_argument("--accent-hit-gain", type=float, default=0.80, help="frame-locked wipe accent (tight punch)")
    p.add_argument("--accent-tear-gain", type=float, default=0.25)
    p.add_argument("--riser-gain", type=float, default=0.05, help="kept >=6 dB under the local voice (D9)")
    p.add_argument("--act-gap", type=float, default=0.90)
    p.add_argument("--lead-in", type=float, default=0.25)
    p.add_argument("--tail", type=float, default=2.506, help="S5 voice end -> film end: 43.394 + 2.506 = 45.900 s")
    p.add_argument("--endcard-start", type=float, default=43.70, help="picture's end-card start")
    p.add_argument("--endcard-beat", type=float, default=44.85, help="final chime inside the end card")
    p.add_argument("--fade-out", type=float, default=0.60, help="clean fade to silence before the end")
    p.add_argument("--lufs", type=float, default=-14.0)
    p.add_argument("--tp", type=float, default=-1.0)
    p.add_argument("--lra", type=float, default=11.0, help="loudnorm LRA gate (the measured LRA is reported separately)")
    p.add_argument("--timeout", type=float, default=45.0)
    p.add_argument("--retries", type=int, default=3)
    p.add_argument("--no-bgm", action="store_true")
    p.add_argument("--no-sfx", action="store_true")
    p.add_argument("--accents", dest="accents", action="store_true", help="optional sentence-start ticks (off by default)")
    p.add_argument("--no-accents", dest="accents", action="store_false")
    p.set_defaults(accents=False)
    p.add_argument("--force", action="store_true", help="ignore the TTS cache and re-synthesise")
    p.add_argument("--keep-raw", action="store_true", help="keep out/_raw_mix.wav for inspection")
    p.add_argument("--direct-net", action="store_true", help="bypass environment proxies for TTS requests")
    p.add_argument("--use-proxy", action="store_true", help="force environment proxies, never fall back to direct")
    p.add_argument("--quiet", action="store_true")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    TTS_CACHE.mkdir(parents=True, exist_ok=True)
    timeline_path = Path(args.timeline)
    fps = int(args.fps)

    print("=" * 78)
    print("ANS Day01 / 28 - audio pipeline  (verbatim voiceover + Lo-Fi BGM + SFX + master)")
    print("=" * 78)

    if args.direct_net:
        NET["direct"] = True
    elif args.use_proxy:
        NET["direct"] = False

    values, sources, looked = resolve_credentials()
    provider, why = pick_provider(values, args.provider)
    if provider == "scaffold":
        provider_detail = "scaffold (silent timeline)"
    elif provider == "fish":
        provider_detail = "%s%s" % (values.get("FISH_MODEL") or DEFAULT_FISH_MODEL,
                                    "/voice" if values.get("FISH_VOICE_ID") else "/auto-voice")
    else:
        provider_detail = "seed-tts-2.0-expressive/%s" % (values.get("DOUBAO_TTS_SPEAKER") or DEFAULT_DOUBAO_SPEAKER)
    report_credentials(values, sources, looked, "%s - %s" % (provider, provider_detail))
    if why:
        print("[creds] NOTE: %s" % why)
    if provider == "scaffold":
        missing = [k for k in ("FISH_API_KEY", "DOUBAO_SOUND_API_KEY") if k not in values]
        if args.provider == "scaffold":
            print("[creds] SCAFFOLD MODE forced by --provider scaffold.")
        elif missing:
            print("[creds] MISSING KEYS -> %s  (no usable provider)" % ", ".join(missing))
        print("[creds] files searched: %s" % ", ".join(looked))
        print("[creds] SCAFFOLD MODE: silent timeline of the estimated length; no audio is fabricated.")
        print("[creds] fill FISH_API_KEY (fish-audio.env) or DOUBAO_SOUND_API_KEY (nobook-tts.env) and re-run for real audio.")

    mgmods, mg_err = load_mgaudio()
    if mgmods:
        cue_note = "mgaudio click/pop/chime/riser"
        print("[sfx]   using mg-styles-15 mgaudio (SR=%d)" % int(mgmods[0].SR))
    else:
        cue_note = "built-in numpy cues (mgaudio unavailable)"
        print("[sfx]   mgaudio unavailable (%s) -> built-in numpy cue synthesizer" % mg_err)

    # ---- per-segment synth + true duration ----
    segs = []
    print("\n[1/5] per-segment verbatim TTS")
    for seg in SEGMENTS:
        entry = dict(id=seg["id"], act=seg["act"], text=seg["text"], direction=seg["direction"])
        if provider == "scaffold":
            entry.update(voice_dur=round(estimate_duration(seg["text"], args.speed), 3), estimated=True,
                         source="scaffold-estimate", model="", speaker="")
            entry["clip"] = None
        else:
            mp3, model, speaker = synth_segment(provider, values, seg, args.speed, args.timeout, args.retries, args.force)
            clip = trim_silence(decode_audio(mp3))
            entry.update(voice_dur=round(len(clip) / SR, 3), estimated=False,
                         source="%s:%s" % (provider, model), model=model, speaker=speaker)
            entry["clip"] = clip
            print("        %s -> %.3f s  (%d samples)" % (seg["id"], entry["voice_dur"], len(clip)))
        segs.append(entry)

    # ---- lay out the timeline ----
    cursor = float(args.lead_in)
    for i, s in enumerate(segs):
        s["start"] = round(cursor, 3)
        s["end"] = round(cursor + s["voice_dur"], 3)
        s["dur"] = round(s["voice_dur"] + (args.act_gap if i < len(segs) - 1 else args.tail), 3)
        cursor = s["end"] + (args.act_gap if i < len(segs) - 1 else args.tail)
    total_dur = round(cursor, 3)
    total_samples = int(round(total_dur * SR))
    for s in segs:
        s["start_frame"] = int(round(s["start"] * fps))
        s["end_frame"] = int(round(s["end"] * fps))
        s["frames"] = int(round(s["voice_dur"] * fps))

    wipes, wipe_source = resolve_wipes(segs, args)
    endcard_start = round(segs[-1]["end"], 3)
    print("      wipes: %s  [%s]" % (["%.3f(f%d)" % (w, int(round(w * fps))) for w in wipes], wipe_source))
    acts = []
    for i, s in enumerate(segs):
        wipe = wipes[i - 1] if i > 0 else None
        a_start = 0.0 if i == 0 else wipe
        a_end = wipes[i] if i < len(wipes) else round(total_dur, 3)
        acts.append(dict(act=s["act"], name=ACT_NAMES.get(s["act"], ""), segment=s["id"],
                         start=round(a_start, 3), end=round(a_end, 3), dur=round(a_end - a_start, 3),
                         vo_start=s["start"], vo_end=s["end"], wipe=wipe,
                         wipe_frame=(int(round(wipe * fps)) if wipe is not None else None),
                         transition_start=(round(segs[i - 1]["end"], 3) if i > 0 else None),
                         transition_end=(round(s["start"], 3) if i > 0 else None),
                         start_frame=int(round(a_start * fps)), end_frame=int(round(a_end * fps))))

    cuts_all = [round(round(w * fps) / fps, 6) for w in wipes] + [round(round(float(args.endcard_start) * fps) / fps, 6)]
    bed_override, bed_meta, grid = None, {}, {}
    if not args.no_bgm:
        if args.bed_source == "composed" and mgmods:
            ph, _ph_s = best_grid_phase(cuts_all, args.bpm)
            dn, _dn_s = choose_bar_phase(ph, cuts_all, args.bpm)
            bed_override, bed_meta, bed_src = compose_bed_cached(total_dur, fps, dn, cuts_all, args, mgmods, args.quiet)
            bed_meta = dict(bed_meta, cache=bed_src)
            grid = build_music_grid(args.bpm, dn, total_dur, fps)
            print("      composed bed: %.2f BPM | bar %.4f s | downbeat anchor %.4f s (frame %d) | %d parts"
                  % (args.bpm, 60.0 * 4 / args.bpm, dn, int(round(dn * fps)), len(bed_meta.get("parts", []))))
        else:
            grid = measure_bgm_grid(str(args.bgm), args.bgm_offset, total_dur, fps)
    # The alignment record is produced in both modes; only the lofi bed needs extra beat-mark cues
    # (the composed bed already carries its own frame-locked kick/crash events on every cut).
    beat_align = nearest_beats(wipes, grid) if grid else [None] * len(wipes)
    beat_marks = beat_align if (grid and args.bed_source == "lofi") else [None] * len(wipes)
    if grid:
        _bs = grid.get("beat_seconds", grid.get("beat_sec"))
        _bf = grid.get("beat_frames")
        _bftxt = ("%.2f frames" % _bf) if isinstance(_bf, (int, float)) else ("%d beats" % grid.get("beat_count", 0))
        print("      music grid: %.2f BPM (%.4f s/beat = %s) | first beat %.3f s | first downbeat %.3f s"
              % (grid["bpm"], _bs, _bftxt, grid["first_beat_t"], grid["first_downbeat_t"]))
        for bm in beat_marks:
            if bm:
                print("        wipe %.3f s -> nearest beat %.3f s  offset %+.1f ms (%+.2f frames)%s"
                      % (bm["wipe"], bm["beat"], bm["offset_ms"], bm["offset_frames"],
                         "  [beat mark added]" if bm["mark"] else "  [wipe accent covers it]"))
    cues = build_cues(fps, segs, wipes, args, beat_marks)

    # ---- mix buses + measurement-driven calibration ----
    print("\n[2/5] mixing  (music %.1f dB under voice, %.1f dB in gaps, dip %.1f dB/%.2f s | %d SFX cues)" % (
        args.music_body_db, args.music_gap_db, args.music_dip_db, args.music_dip_dur, len(cues)))
    master_path = out_dir / "audio_day01.wav"
    raw_path = out_dir / "_raw_mix.wav"
    silent = provider == "scaffold"
    calibration = []
    if silent:
        buses = dict(vo=np.zeros((total_samples, 2), dtype=np.float32), music=None, music_rms=None,
                     sfx=np.zeros((total_samples, 2), dtype=np.float32), pad=None)
        music_pts = []
        write_wav24(master_path, buses["vo"])
        mastering = dict(target_lufs=args.lufs, target_tp=args.tp, measured_lufs=None, measured_tp=None,
                         measured_tp_oversampled=None, measured_lra=None,
                         method="skipped (silent scaffold)", passes=[])
        got, passes = {}, []
    else:
        buses = build_buses(segs, cues, mgmods, args, total_samples, bed_override=bed_override)
        buses["pad"] = build_endcard_pad(total_samples, endcard_start, mgmods, args, lead=args.pad_lead)
        voice_ref_rms = float(np.sqrt(np.mean(buses["vo"].astype(np.float64) ** 2)))
        music_pts = (music_level_curve(segs, wipes, total_dur, args, beat_marks)
                     if buses["music"] is not None else [])
        vo_gain_db = 20 * np.log10(float(args.vo_gain))
        pad_db = float(args.pad_db)          # fixed: D9 keeps the bed under the voice at all times
        ride_db = float(args.ride_db)        # the calibrated knob that carries the LRA
        bed_db = 0.0
        candidates = []
        if buses["pad"] is None:
            pad_db = args.pad_min_db
        print("\n[3/5] mastering -> %.1f LUFS / TP <= %.1f dBTP (internal margin %.1f) | body %.1f dBFS | LRA target %.1f LU" % (
            args.lufs, args.tp, args.tp_margin, args.body_rms_target, args.lra_target))
        for p in range(args.max_master_passes):
            vo_gain = 10 ** (vo_gain_db / 20.0)
            music_gain = None
            if music_pts and buses["music_rms"]:
                pts = [(x, (y if y <= -60 else y + bed_db)) for x, y in music_pts]
                music_gain = music_gain_array(pts, total_samples, voice_ref_rms * vo_gain) / buses["music_rms"]
            pad_gain = (10 ** (pad_db / 20.0) * voice_ref_rms * vo_gain) if buses["pad"] is not None else 0.0
            buses["lift"] = finale_lift(total_samples, total_dur, segs, args, ride_db)
            ve_r = float(segs[-1]["end"])
            buses["ride"] = (int(round(max(0.0, ve_r - args.ride_dur) * SR)),
                             int(round(max(ve_r, float(args.endcard_start)) * SR)), args.ride_crest_db)
            mix = render_mix(buses, vo_gain, music_gain, pad_gain, sfx_scale=vo_gain / float(args.vo_gain))
            if p == 0 and not args.quiet:
                sfx_scale = vo_gain / float(args.vo_gain)
                parts = [("voice", buses["vo"] * np.float32(vo_gain), buses["vo"]),
                         ("music", (buses["music"] * music_gain[:, None]) if (buses["music"] is not None and music_gain is not None) else None, None),
                         ("sfx", buses["sfx"] * np.float32(sfx_scale), buses["sfx"]),
                         ("pad", (buses["pad"] * np.float32(pad_gain)) if buses["pad"] is not None else None, buses["pad"]),
                         ("lift", (buses["lift"][:, None] if buses.get("lift") is not None else None), None)]
                for nm, bus, _raw in parts:
                    if bus is None:
                        continue
                    pk = float(np.abs(bus).max())
                    rms = float(np.sqrt(np.mean(bus.astype(np.float64) ** 2)))
                    print("      bus %-5s peak %6.2f dBFS @%6.2f s | rms %6.2f dBFS | crest %5.2f dB" % (
                        nm, 20 * np.log10(max(pk, 1e-9)),
                        float(np.argmax(np.abs(bus).max(axis=1))) / SR,
                        20 * np.log10(max(rms, 1e-9)), 20 * np.log10(max(pk, 1e-9) / max(rms, 1e-9))))
            peak = float(np.abs(mix).max())
            if p == 0 and not args.quiet:
                _rms = float(np.sqrt(np.mean(mix.astype(np.float64) ** 2)))
                print("      raw mix: peak %.2f dBFS | rms %.2f dBFS | crest %.2f dB  (the master needs <= 13 dB for -14 LUFS at -1.0 dBTP)" % (
                    20 * np.log10(max(peak, 1e-9)), 20 * np.log10(max(_rms, 1e-9)),
                    20 * np.log10(max(peak, 1e-9) / max(_rms, 1e-9))))
            if peak > 0.841:                     # -1.5 dBFS headroom guard (loudnorm re-gains anyway)
                mix = mix * (0.841 / peak)
                print("      headroom guard: raw mix peak %.2f dBFS -> scaled %.2f dB" % (
                    20 * np.log10(peak), 20 * np.log10(0.841 / peak)))
            write_wav24(raw_path, mix)
            got, passes = master_file(raw_path, master_path, args.lufs, args.tp, args.lra, args.quiet, args.tp_margin)
            a_pass = read_wav(master_path)
            body = body_rms_db(a_pass, segs)
            body_no_ride = body_rms_db(a_pass, segs, exclude=(max(0.0, float(segs[-1]["end"]) - args.ride_dur - args.ride_ramp),
                                                              float(args.endcard_start)))
            lra = got.get("lra")
            calibration.append(dict(**{"pass": p + 1}, vo_gain_db=round(vo_gain_db, 2), pad_db=round(pad_db, 2),
                                    bed_offset_db=round(bed_db, 2), ride_db=round(ride_db, 2),
                                    body_rms_dbfs=round(body, 2), body_rms_excl_ride=round(body_no_ride, 2),
                                    lufs=got.get("i"), lra=lra,
                                    tp=got.get("tp"), tp_os=got.get("tp_os"), mode=passes[-1]["mode"]))
            print("      pass %d: body %.2f dBFS | %.2f LUFS | LRA %.2f LU | TP %.2f (ffmpeg) / %.2f (oversampled) dBTP"
                  % (p + 1, body, got.get("i", float("nan")), (lra if lra is not None else float("nan")),
                     got.get("tp", float("nan")), got.get("tp_os", float("nan"))))
            err_body = args.body_rms_target - body_no_ride
            err_lra = args.lra_target - (lra if lra is not None else args.lra_target)
            # Score the candidate. The LRA band is a hard requirement from the review, so a
            # value outside 5-7 LU is penalised; among in-band candidates the one closest to
            # the body-RMS target wins. (The two targets trade against each other: every extra
            # dB of non-voice loudness that buys LRA also pulls the voice down at a fixed -14 LUFS.)
            band_lo, band_hi = args.lra_target - args.lra_tol, args.lra_target + args.lra_tol
            in_band = lra is not None and band_lo <= lra <= band_hi
            lra_pen = (0.0 if in_band else
                       ((min(abs(lra - band_lo), abs(lra - band_hi)) + 1.0) if lra is not None else 9.9))
            score = lra_pen + 1.5 * abs(err_body)
            candidates.append(dict(score=score, vo_gain_db=vo_gain_db, pad_db=pad_db, bed_db=bed_db,
                                   ride_db=ride_db, in_lra_band=in_band))
            if abs(err_body) <= args.body_rms_tol and abs(err_lra) <= args.lra_tol:
                break
            # Two knobs, two targets. The finale RIDE lifts voice and bed together, so it can
            # carry the loud end of the loudness range (p95) without ever putting the bed above
            # the local voice (D9); the bed offset trims the voice/non-voice energy ratio that
            # sets the body RMS at a fixed -14 LUFS. Cross-coupling is handled by iterating.
            ride_db = min(args.ride_max_db, max(args.ride_min_db, ride_db + 0.90 * err_lra))
            bed_db = min(args.bed_max_db, max(args.bed_min_db, bed_db - 0.60 * err_body))
        best = min(candidates, key=lambda c: c["score"])
        if (abs(best["ride_db"] - ride_db) > 1e-6 or abs(best["bed_db"] - bed_db) > 1e-6):
            print("      selecting best compromise pass: ride %.2f dB (last pass was %.2f dB) | bed %+.2f dB" % (
                best["ride_db"], ride_db, best["bed_db"]))
            vo_gain = 10 ** (best["vo_gain_db"] / 20.0)
            pts = [(x, (y if y <= -60 else y + best["bed_db"])) for x, y in music_pts]
            mg_ = music_gain_array(pts, total_samples, voice_ref_rms * vo_gain) / buses["music_rms"]
            buses["lift"] = finale_lift(total_samples, total_dur, segs, args, best["ride_db"])
            buses["ride"] = (int(round(max(0.0, float(segs[-1]["end"]) - args.ride_dur) * SR)),
                             int(round(max(float(segs[-1]["end"]), float(args.endcard_start)) * SR)), args.ride_crest_db)
            mix = render_mix(buses, vo_gain, mg_, 10 ** (best["pad_db"] / 20.0) * voice_ref_rms * vo_gain,
                             sfx_scale=vo_gain / float(args.vo_gain))
            pk = float(np.abs(mix).max())
            if pk > 0.841:
                mix = mix * (0.841 / pk)
            write_wav24(raw_path, mix)
            got, passes = master_file(raw_path, master_path, args.lufs, args.tp, args.lra, args.quiet, args.tp_margin)
            a_pass = read_wav(master_path)
            body = body_rms_db(a_pass, segs)
            lra = got.get("lra")
            print("      final: body %.2f dBFS | %.2f LUFS | LRA %.2f LU | TP %.2f dBTP" % (
                body, got.get("i", 0.0), lra or 0.0, got.get("tp_os", 0.0)))
        ride_db = best["ride_db"]
        pad_gain_final = (10 ** (pad_db / 20.0) * voice_ref_rms * vo_gain) if buses.get("pad") is not None else 0.0
        sfx_scale_final = vo_gain / float(args.vo_gain)
        master_gain_final = 10 ** (passes[-1].get("gain_db", 0.0) / 20.0)
        calibration.append(dict(kind="selected", pad_db=round(best["pad_db"], 2), bed_offset_db=round(best["bed_db"], 2),
                                ride_db=round(best["ride_db"], 2), score=round(best["score"], 3),
                                in_lra_band=best["in_lra_band"]))
        mastering = dict(target_lufs=args.lufs, target_tp=args.tp, measured_lufs=got.get("i"),
                         measured_tp=got.get("tp"), measured_tp_oversampled=got.get("tp_os"),
                         measured_lra=lra,
                         method="explicit gain trim + true-peak limiter (%s)" % passes[-1]["mode"],
                         passes=passes,
                         true_peak_margin=args.tp_margin, body_rms_dbfs=round(body, 2),
                         body_rms_excl_ride_dbfs=round(body_no_ride, 2),
                         body_rms_target=args.body_rms_target,
                         body_metric_note="body_rms_dbfs includes the finale ride (it sits inside S5's span); "
                                          "body_rms_excl_ride_dbfs is the same figure without the ridden 2.8 s")
    if not args.keep_raw:
        try:
            raw_path.unlink()
        except OSError:
            pass

    # ---- timeline ----
    mastered = read_wav(master_path)
    qa = {} if silent else audio_qa(mastered, fps, wipes)
    d9rep = {} if silent else d9_report(mastered, segs, cues, buses, args, pad_gain_final, master_gain_final,
                                        sfx_scale_final, total_dur)
    clause_items, clause_meta = build_sub_clause_plan(segs, fps, silent)
    print("      sub_clause_plan: %d clauses (%d silence-anchored, %d proportional)"
          % (clause_meta["count"], clause_meta["by_silence"], clause_meta["by_proportional"]))
    for s in segs:
        s.pop("clip", None)
    tl = dict(
        project="ANS (AI Never Stops) · Day 01 / 28",
        generated_by="ClaudeAnimationBase/audio/build_day01_audio.py",
        provider=provider,
        provider_detail=provider_detail if provider != "scaffold" else "scaffold (no credentials)",
        provider_note=("时长按豆包实测，Fish 到位后需重测" if provider == "doubao" else
                       ("时长按 Fish 实测" if provider == "fish" else "脚手架估算时长，非实测")),
        speed=args.speed,
        fps=fps,
        lead_in=args.lead_in,
        act_gap=args.act_gap,
        tail=args.tail,
        total_duration=total_dur,
        total_frames=int(round(total_dur * fps)),
        video=dict(fps=fps, duration=total_dur, frames=int(round(total_dur * fps))),
        segments=[dict(id=s["id"], act=s["act"], start=s["start"], dur=s["dur"], end=s["end"],
                       voice_dur=s["voice_dur"], start_frame=s["start_frame"], end_frame=s["end_frame"],
                       frames=s["frames"], subtitle=s["text"], tts=s["text"],
                       verbatim_match=True,
                       estimated=s["estimated"], source=s["source"]) for s in segs],
        acts=acts,
        wipes=[dict(act=i + 2, t=w, frame=int(round(w * fps)), frame_time=round(round(w * fps) / fps, 6),
                    gap=[segs[i]["end"], segs[i + 1]["start"]], source=wipe_source) for i, w in enumerate(wipes)],
        end_card=dict(audio_tail_start=endcard_start, picture_start=round(float(args.endcard_start), 3),
                      end=total_dur, dur=round(total_dur - float(args.endcard_start), 3),
                      audio_tail_dur=round(total_dur - endcard_start, 3),
                      picture_start_frame=int(round(float(args.endcard_start) * fps)),
                      end_frame=int(round(total_dur * fps)),
                      final_beat=round(round(args.endcard_beat * fps) / fps, 6),
                      final_beat_frame=int(round(round(args.endcard_beat * fps) / fps * fps)),
                      pad_db_rel_voice=float(args.pad_db)),
        sub_clause_plan=clause_items,
        sub_clause_plan_meta=dict(**clause_meta, fps=fps,
                                  delimiters=["。", "！", "？", "——"],
                                  note="verbatim per-sentence subtitle plan; concatenating a segment's clauses "
                                       "reproduces its spoken text byte for byte; times come from 12 ms-envelope "
                                       "silence detection on the same TTS clips the mix uses (source=silence) or "
                                       "from character-weighted interpolation (source=proportional)"),
        music_grid=grid,
        bed=dict({**bed_meta, "source": args.bed_source,
                  "bpm": (args.bpm if args.bed_source == "composed" else None)}),
        wipe_beat_alignment=beat_align,
        wipe_beat_alignment_note=("nearest grid beat to each cut; in composed mode the bed ALSO places "
                                  "frame-locked kick+crash+bass exactly ON the cut, so the audible hit is 0 frames off"),
        sfx_count_note="16 SFX cues; the bed's own musical events are not counted as SFX",
        sfx_count=len(cues),
        sfx_list=[dict(n=i + 1, name=c["name"], t=c["t"], frame=c.get("frame"), sync=c.get("sync"),
                       gain=c["gain"], kind=c["kind"], note=c["note"]) for i, c in enumerate(cues)],
        sfx_cues=cues,
        ride=dict(db=round(float(ride_db), 2), dur=args.ride_dur, ramp=args.ride_ramp,
                  settle_db=args.ride_settle_db,
                  start=round(float(segs[-1]["end"]) - args.ride_dur - args.ride_ramp, 3),
                  peak_at=round(float(segs[-1]["end"]), 3),
                  reference="level ride on the WHOLE mix (voice+music+FX+pad together) -> the D9 voice/bed separation is preserved"),
        d9=d9rep,
        music_arc=dict(reference="dB relative to the voice body RMS (master pins that at --body-rms-target)",
                       body_db=args.music_body_db, gap_db=args.music_gap_db, dip_db=args.music_dip_db,
                       dip_abs_db=round(args.music_gap_db + args.music_dip_db, 2), dip_dur=args.music_dip_dur,
                       act5_db=args.music_act5_db, endcard_db=args.music_endcard_db,
                       breakpoints=[[round(x, 3), round(y, 2)] for x, y in music_pts]),
        bgm=dict(file=Path(str(args.bgm)).name, path=str(args.bgm), offset=args.bgm_offset,
                 bed_rms_dbfs=(round(20 * np.log10(buses["music_rms"]), 2) if buses.get("music_rms") else None),
                 levels_rel_voice=dict(body=args.music_body_db, gap=args.music_gap_db,
                                       dip=round(args.music_gap_db + args.music_dip_db, 2),
                                       act5=args.music_act5_db, endcard=args.music_endcard_db),
                 enabled=not args.no_bgm and Path(str(args.bgm)).is_file() and not silent),
        sfx_backend=cue_note,
        qa=qa,
        calibration=calibration,
        mastering=mastering,
        tts_cache=str(TTS_CACHE),
    )
    for s in tl["segments"]:
        s["verbatim_match"] = True     # spoken text and subtitle text are the same field by construction
    _blob = json.dumps(tl, ensure_ascii=False, indent=2, default=_jsonable)
    timeline_path.write_text(_blob, encoding="utf-8")
    js_path = timeline_path.with_name("timeline_data.js")
    js_path.write_text("window.__ANS_DAY01_TIMELINE = " + _blob + ";\n", encoding="utf-8")

    # ---- spec png ----
    print("\n[4/5] writing spec sheet")
    png = out_dir / "audio_spec.png"
    draw_spec_png(png, mastered, tl, mastering, cue_note, args)

    # ---- summary ----
    print("\n[5/5] done")
    print("-" * 78)
    for s in tl["segments"]:
        print("  %s  start %6.3f s  voice %6.3f s  slot %6.3f s  (%s)" % (s["id"], s["start"], s["voice_dur"], s["dur"], s["source"]))
    print("  %-4s total %6.3f s  =  %d frames @ %d fps" % ("", tl["total_duration"], tl["total_frames"], fps))
    if mastering["measured_lufs"] is not None:
        print("  master %.2f LUFS (I) / %.2f dBTP (oversampled) / LRA %.2f LU  via %s" % (
            mastering["measured_lufs"], mastering["measured_tp_oversampled"] or 0.0,
            mastering["measured_lra"] or 0.0, mastering["method"]))
        print("  body (voice) RMS %.2f dBFS incl. finale ride | %.2f dBFS excl. ride (target %.1f) | music bed %.1f dB under voice" % (
            mastering["body_rms_dbfs"], mastering.get("body_rms_excl_ride_dbfs", float("nan")),
            mastering["body_rms_target"], -args.music_body_db))
        if qa:
            print("  0.5 s RMS window: min %.2f dBFS @%.2f s  max %.2f dBFS @%.2f s" % (
                qa["rms_05s_min"], qa["rms_05s_min_at"], qa["rms_05s_max"], qa["rms_05s_max_at"]))
            print("  1.0 s RMS window: min %.2f dBFS @%.2f s  max %.2f dBFS @%.2f s" % (
                qa["rms_1s_min"], qa["rms_1s_min_at"], qa["rms_1s_max"], qa["rms_1s_max_at"]))
            print("  crest factor: mean %.2f dB / min %.2f / max %.2f" % (
                qa["crest_mean"], qa["crest_min"], qa["crest_max"]))
            for acc in qa["accents"]:
                print("  wipe accent @%.3f s -> attack %.4f s  error %+.2f frames (%+.1f ms)" % (
                    acc["nominal"], acc["attack"], acc["error_frames"], acc["error_ms"]))
            print("  max accent frame error: %.2f frames" % (qa["accent_max_frame_error"] or 0.0))
            for k, v in (d9rep or {}).items():
                print("  D9 %-22s window %s | total %6.2f dBFS | voice ref %6.2f | separation %+5.2f dB | pad %6.2f | riser %6.2f | hit %6.2f"
                      % (k, v["window"], v["rms_total"] or 0.0, v["voice_ref"] or 0.0, v["separation_db"] or 0.0,
                         v["pad_rms"] if v["pad_rms"] is not None else -99.0, v["riser_rms"] or -99.0,
                         v["hit_rms"] if v["hit_rms"] is not None else -99.0))
        print("  SFX count: %d  |  finale ride +%.2f dB  |  pad %.1f dB rel. voice (D9 asks <= -6)" % (
            tl["sfx_count"], (tl.get("ride") or {}).get("db", 0.0), args.pad_db))
    else:
        print("  master: silent (scaffold) - no loudness measurement")
    print("  timeline : %s" % timeline_path)
    print("  timeline : %s" % js_path)
    print("  master   : %s" % master_path)
    print("  spec     : %s" % png)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # keep the message short and secret-free
        import traceback
        print("FATAL: %s: %s" % (type(exc).__name__, exc), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

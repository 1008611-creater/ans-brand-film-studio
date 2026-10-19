import os
import urllib.request
import urllib.error
import json
import base64

class VolcengineTTS:
    """
    豆包语音合成 (Volcengine TTS) 技能（零第三方依赖标准库版）
    """
    def __init__(self, api_key=None):
        # 优先使用传入的 api_key，否则从环境变量或 ~/.codex/secrets/nobook-tts.env 读取
        self.api_key = api_key or os.getenv("DOUBAO_SOUND_API_KEY")
        if not self.api_key:
            env_path = os.path.expanduser("~/.codex/secrets/nobook-tts.env")
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("DOUBAO_SOUND_API_KEY="):
                            self.api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                            break
        if not self.api_key:
            raise ValueError("API Key for Volcengine TTS is not found. Please set DOUBAO_SOUND_API_KEY environment variable.")
        
        self.url = "https://openspeech.bytedance.com/api/v3/tts/unidirectional"
        self.resource_id = "volc.service_type.10029"

    def synthesize(self, text, speaker="zh_male_tiancaitongsheng_mars_bigtts", output_file="output.mp3", format="mp3", sample_rate=24000, speech_rate=22):
        """
        将文本转换为语音并保存为文件
        :param text: 待转换的文本
        :param speaker: 发音人ID，默认为 'zh_male_tiancaitongsheng_mars_bigtts'（天才童声）
        :param output_file: 输出文件名
        :param format: 音频格式 (mp3, wav, pcm)
        :param sample_rate: 采样率 (24000, 16000, 48000)
        :param speech_rate: 语速调节 (-50~100，默认 22 对应轻快自然的儿童科普语速)
        :return: 保存的文件路径
        """
        resource_id = "seed-tts-2.0" if "uranus" in speaker else "volc.service_type.10029"
        headers = {
            "x-api-key": self.api_key,
            "X-Api-Resource-Id": resource_id,
            "Content-Type": "application/json",
            "Connection": "keep-alive"
        }

        additions_dict = {
            "disable_markdown_filter": True,
            "enable_language_detector": True,
            "enable_latex_tn": True,
            "disable_default_bit_rate": True,
            "max_length_to_filter_parenthesis": 0,
            "cache_config": {
                "text_type": 1,
                "use_cache": True
            }
        }

        payload = {
            "req_params": {
                "text": text,
                "speaker": speaker,
                "additions": json.dumps(additions_dict),
                "audio_params": {
                    "format": format,
                    "sample_rate": sample_rate,
                    "speech_rate": speech_rate
                }
            }
        }

        req = urllib.request.Request(
            self.url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw_text = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"TTS Synthesis HTTP {e.code}: {err_body}")

        audio_data = b""
        for line in raw_text.strip().split("\n"):
            if not line.strip():
                continue
            try:
                resp_json = json.loads(line)
                if "data" in resp_json and resp_json["data"]:
                    audio_data += base64.b64decode(resp_json["data"])
            except json.JSONDecodeError:
                pass

        if audio_data:
            os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
            with open(output_file, "wb") as f:
                f.write(audio_data)
            return output_file
        else:
            raise RuntimeError(f"TTS Synthesis failed to parse audio data. Raw response: {raw_text[:300]}")

    def synthesize_to_numpy(self, text, sr=48000, speaker="zh_male_tiancaitongsheng_mars_bigtts", speech_rate=22, cache_path=None):
        """
        将字幕文本合成为 NB 小科官方【天才童声】并直接返回 48kHz float32 numpy 数组（纯 NumPy 裁切首尾静音，零外部依赖），
        可直接通过 `m.sfx.place(arr, t_start, gain=...)` 混入 `mgaudio` 音轨，实现声画同出！
        """
        import tempfile
        import numpy as np

        pcm_path = cache_path or tempfile.mktemp(suffix=".pcm")
        if not (cache_path and os.path.exists(cache_path) and os.path.getsize(cache_path) > 500):
            self.synthesize(text=text, speaker=speaker, output_file=pcm_path, format="pcm", sample_rate=sr, speech_rate=speech_rate)

        arr = np.fromfile(pcm_path, dtype=np.int16).astype(np.float32) / 32768.0
        # 裁切首尾静音（保留 40ms 呼吸头尾）
        active = np.where(np.abs(arr) > 0.012)[0]
        if active.size > 0:
            pad = int(0.04 * sr)
            i0 = max(0, int(active[0]) - pad)
            i1 = min(len(arr), int(active[-1]) + pad)
            arr = arr[i0:i1]
        # 20ms 柔和淡入淡出防爆音
        fade = min(int(0.02 * sr), len(arr) // 4)
        if fade > 1:
            ramp = np.linspace(0.0, 1.0, fade, dtype=np.float32)
            arr[:fade] *= ramp
            arr[-fade:] *= ramp[::-1]
        peak = float(np.max(np.abs(arr))) if arr.size else 0.0
        if peak > 1e-4:
            arr = arr / peak * 0.85
        return arr



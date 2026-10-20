// config.js: project settings for ANS (AI Never Stops) Day 01 / 28 Launch Animation (45.9s, 24fps, 720p)
// duration is the film length; the shot list and every shot-internal beat live in src/scenes/ans_day01.js
// (SHOT_T0 / FILM_DUR), which is timed against the voice-over. Keep the two in sync.
// 画面节奏保持 124 BPM（用户决定：改音乐、不改画面）。拍长 0.483871s。
// MUSIC_DOWNBEAT = 音乐首个 downbeat 的时刻（秒）。pulse()/pulse2() 的相位由它决定，
// 音频侧在 day01_timeline.json 给出 music_grid（124 BPM + 首个 downbeat 秒/帧号）后，
// 只改这一个数即可对齐（误差 ≤1 帧 = 0.0417s）；当前音轨未定，暂按画面起点 0 对齐。
const MUSIC_DOWNBEAT = 1.1274;   // music_grid.first_downbeat_t (frame 27) — 124 BPM grid from audio/day01_timeline.json
const PROJECT = { duration: 45.9, bpm: 124, offset: MUSIC_DOWNBEAT };

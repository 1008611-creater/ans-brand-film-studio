<#
.SYNOPSIS
  ANS Day01 出片流水线：补齐帧 → 校验无缺号 → 锁定私有帧集 → 编码 → 门禁实测。
.DESCRIPTION
  为什么需要它：render.mjs 的帧目录写死为 out/frames，多个 agent 同时渲染时会互相覆盖。
  本脚本先把帧集合补齐并校验，再复制一份到 out/frames_locked，之后只从锁定副本编码，
  彻底避免"带着缺口编码"或"编码中途被覆盖"。
.EXAMPLE
  pwsh -File tools/encode_film.ps1
  pwsh -File tools/encode_film.ps1 -TrimDb -2.5 -Tag r7
#>
param(
  [double]$Duration = 45.9,
  [int]$Fps = 24,
  [double]$TrimDb = -2.0,
  [string]$Tag = 'r6',
  [int]$Workers = 3,
  [switch]$SkipFill
)
$ErrorActionPreference = 'Continue'
Set-Location (Join-Path $PSScriptRoot '..')
$total = [math]::Round($Duration * $Fps)
function Log($m) { $line = ('[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $m); Write-Host $line; Add-Content -Path out/encode_film.log -Value $line -Encoding utf8 }
function Gaps {
  $idx = @(Get-ChildItem out/frames -Filter *.jpg -ErrorAction SilentlyContinue | ForEach-Object { [int]($_.BaseName.Substring(1)) })
  $miss = @(); for ($i = 0; $i -lt $total; $i++) { if ($idx -notcontains $i) { $miss += $i } }
  return $miss
}
function Others {
  @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'render.mjs' -and $_.CommandLine -match '--frames' }).Count
}
Log "出片：目标 $total 帧 @ $Fps fps | tag=$Tag | trim=$TrimDb dB"
if (-not $SkipFill) {
  $guard = 0
  while ((Others) -gt 0 -and $guard -lt 60) { Log ('等待其它 --frames 渲染结束… (' + (Others) + ' 个)'); Start-Sleep -Seconds 20; $guard++ }
  for ($a = 1; $a -le 6; $a++) {
    $miss = Gaps
    Log ('帧缺口 {0} 个（第 {1} 次尝试补齐）' -f @($miss).Count, $a)
    if (@($miss).Count -eq 0) { break }
    & node render.mjs --frames --workers=$Workers 2>&1 | Out-File -Append -Encoding utf8 out/encode_film.log
    Start-Sleep -Seconds 3
  }
}
$miss = Gaps
if (@($miss).Count -gt 0) { Log ('仍有缺号 {0} 个，示例 {1} —— 中止，避免出缺陷片' -f @($miss).Count, (($miss | Select-Object -First 8) -join ',')); exit 2 }
Log '帧集合完整（无缺号）'
Remove-Item out/frames_locked -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force out/frames_locked | Out-Null
Copy-Item out/frames/f*.jpg out/frames_locked/ -Force
$locked = @(Get-ChildItem out/frames_locked -Filter *.jpg).Count
Log "已锁定 $locked 帧到 out/frames_locked（出片只从这里读）"
$af = if ($TrimDb -eq 0) { 'anull' } else { "volume=$($TrimDb)dB" }
$out1080 = "out/ans_day01_1080p_$Tag.mp4"
$out720 = "out/ans_day01_720p_$Tag.mp4"
Log '编码 1080p…'
& ffmpeg -y -loglevel error -framerate $Fps -i out/frames_locked/f%05d.jpg -i out/audio_day01_master.wav -map 0:v -map 1:a -vframes $total -vf "scale=in_range=full:out_range=limited:in_color_matrix=bt601:out_color_matrix=bt709" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart -c:a aac -b:a 256k -af $af out/_enc.mp4 2>&1 | Select-Object -Last 1
& ffmpeg -y -loglevel error -i out/_enc.mp4 -c copy -bsf:v h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0 -movflags +faststart $out1080 2>&1 | Select-Object -Last 1
Remove-Item out/_enc.mp4 -Force -ErrorAction SilentlyContinue
Log '编码 720p 社交版…'
& ffmpeg -y -loglevel error -i $out1080 -vf 'scale=1280:720:flags=lanczos' -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart -c:a copy $out720 2>&1 | Select-Object -Last 1
$n = [int]((& ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $out1080).Trim().TrimEnd(','))
$e = (& ffmpeg -hide_banner -nostats -i $out1080 -vn -filter_complex ebur128=peak=true -f null - 2>&1) -join [char]10
$i = [regex]::Matches($e, 'I:\s+(-?[\d.]+) LUFS'); $l = [regex]::Matches($e, 'LRA:\s+(-?[\d.]+) LU'); $t = [regex]::Matches($e, 'Peak:\s+(-?[\d.]+) dBFS')
Log ('交付件：{0} 帧 | I {1} LUFS | LRA {2} | TP {3} dBFS' -f $n, $i[$i.Count-1].Groups[1].Value, $l[$l.Count-1].Groups[1].Value, $t[$t.Count-1].Groups[1].Value)
$tp = [double]$t[$t.Count-1].Groups[1].Value
if ($n -ne $total) { Log '帧数不符，退出码 1'; exit 1 }
if ($tp -gt -1.0) { Log "真峰值 $tp 超门禁（>-1.0），请调小 -TrimDb 后重跑"; exit 3 }
Log '出片完成，门禁通过'
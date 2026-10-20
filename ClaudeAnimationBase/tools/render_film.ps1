<#
.SYNOPSIS
  ANS Day01 稳定渲染器：分段 + 失败重试 + 僵尸清理 + 卡死看门狗。
.DESCRIPTION
  规避长时间高负载下 Chrome 崩页（Target closed / frame detached）的问题：
   1) 按秒分段渲染，每段一个新进程（崩溃只损失一段）；
   2) 每段失败自动重试，重试前清掉僵尸 chrome/node；
   3) 看门狗：每段若连续 StallSeconds 秒没有新帧产出，判定卡死并杀掉重试；
   4) 末尾做一次全局续跑，补齐任何缺口；
   5) 结束打印最终帧数，不足则非零退出。
.EXAMPLE
  pwsh -File tools/render_film.ps1                 # 默认 2 worker / 4 秒一段
  pwsh -File tools/render_film.ps1 -Workers 3 -ChunkSeconds 3
#>
param(
  [int]$Workers = 2,
  [double]$ChunkSeconds = 4.0,
  [int]$MaxAttempts = 4,
  [int]$StallSeconds = 120,
  [double]$Duration = 45.9,
  [int]$Fps = 24
)
$ErrorActionPreference = 'Continue'
$here = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $here
[Environment]::CurrentDirectory = $here
$framesDir = 'out/frames'
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
$logFile = 'out/render_film.log'
function Log($m) { $line = ('[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $m); Write-Host $line; Add-Content -Path $logFile -Value $line -Encoding utf8 }
function Get-FrameCount { @(Get-ChildItem $framesDir -Filter *.jpg -ErrorAction SilentlyContinue).Count }
function Stop-Stragglers {
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'render.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 5
}
function Invoke-Chunk([string]$range) {
  # 注意：Windows PowerShell 5.1 的 Start-Process 在本机会因环境变量字典 NO_PROXY/no_proxy 重名而抛异常，
  # 因此这里改用 .NET ProcessStartInfo（UseShellExecute=false 时子进程继承父环境，且不走 PowerShell 的环境字典）。
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'node'
  $psi.Arguments = ('render.mjs --frames --range={0} --workers={1}' -f $range, $Workers)
  $psi.WorkingDirectory = $here
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  $before = Get-FrameCount
  try { [void]$proc.Start() } catch { Log ('子进程启动失败：' + $_.Exception.Message); return 'fail' }
  $outTask = $proc.StandardOutput.ReadToEndAsync()
  $errTask = $proc.StandardError.ReadToEndAsync()
  $last = $before; $stall = 0
  while (-not $proc.HasExited) {
    Start-Sleep -Seconds 10
    $now = Get-FrameCount
    if ($now -gt $last) { $last = $now; $stall = 0 } else { $stall += 10 }
    if ($stall -ge $StallSeconds) {
      Log ('看门狗：{0} s 无新帧（range {1}），杀掉重试' -f $StallSeconds, $range)
      try { $proc.Kill() } catch {}
      Stop-Stragglers
      return 'stall'
    }
  }
  $after = Get-FrameCount
  $errText = ''
  try { $errText = $errTask.Result } catch {}
  if ($proc.ExitCode -eq 0) { return 'ok' }
  Log ('进程退出码 {0}（range {1}，帧 {2} -> {3}）' -f $proc.ExitCode, $range, $before, $after)
  if ($errText.Trim()) { Log ('  stderr: ' + $errText.Trim().Substring(0, [Math]::Min(400, $errText.Trim().Length))) }
  return 'fail'
}
Log "开始：目标 $([math]::Round($Duration*$Fps)) 帧 @ $Fps fps | workers=$Workers chunk=${ChunkSeconds}s"
Log ('起始帧数：{0}' -f (Get-FrameCount))
Stop-Stragglers
$t = 0.0; $idx = 0
while ($t -lt $Duration - 0.001) {
  $end = [Math]::Min($t + $ChunkSeconds, $Duration)
  $range = ('{0:F2}:{1:F2}' -f $t, $end)
  $done = $false
  for ($a = 1; $a -le $MaxAttempts; $a++) {
    Log "段 $idx  ($range)  第 $a 次尝试"
    $r = Invoke-Chunk $range
    if ($r -eq 'ok') { $done = $true; break }
    Stop-Stragglers
  }
  if (-not $done) { Log "段 $idx 连续 $MaxAttempts 次失败，跳过（末尾续跑会补）" }
  $t = $end; $idx++
}
Log '末尾全局续跑（补齐缺口）'
for ($a = 1; $a -le $MaxAttempts; $a++) {
  $r = Invoke-Chunk ('0:{0:F2}' -f $Duration)
  if ($r -eq 'ok') { break }
  Stop-Stragglers
}
Stop-Stragglers
# 帧集合完整性：不得有缺号（缺号会让 ffmpeg 在缺口处截断成片）
$idx = @(Get-ChildItem $framesDir -Filter *.jpg | ForEach-Object { [int]($_.BaseName.Substring(1)) })
$missing = @(); for ($i = 0; $i -lt [math]::Round($Duration * $Fps); $i++) { if ($idx -notcontains $i) { $missing += $i } }
Log ('帧集合完整性：缺号 {0} 个' -f @($missing).Count)
if (@($missing).Count -gt 0) { Log ('缺号示例：' + (($missing | Select-Object -First 10) -join ',')) }
$total = Get-FrameCount
Log "完成：$total / $([math]::Round($Duration*$Fps)) 帧"
Remove-Item out/_render_stdout.tmp, out/_render_stderr.tmp -Force -ErrorAction SilentlyContinue
if ($total -lt [math]::Round($Duration * $Fps)) { Log '帧数不足，退出码 1'; exit 1 }
exit 0
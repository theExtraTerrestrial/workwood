# Puts Workwood on this PC: copies it to %LOCALAPPDATA%\Workwood and adds it to the Start menu.
# Run it through "Install Workwood.cmd". -To and -NoShortcut exist for trying it out somewhere else.
param([string]$To = (Join-Path $env:LOCALAPPDATA 'Workwood'), [switch]$NoShortcut, [switch]$Remove)
$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$link = Join-Path ([Environment]::GetFolderPath('Programs')) 'Workwood.lnk'

if (Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$To\*" }) {
  Write-Host 'Workwood is open. Close it, then run this again.'; exit 1
}
if ($Remove) {
  if (Test-Path $To) { Remove-Item -Recurse -Force $To }
  if (-not $NoShortcut -and (Test-Path $link)) { Remove-Item -Force $link }
  Write-Host 'Workwood was removed. Your sessions and settings were not touched.'; exit 0
}
if (-not (Test-Path (Join-Path $src 'app\main.cjs'))) { Write-Host 'Unzip the whole folder first, then run this again.'; exit 1 }

New-Item -ItemType Directory -Force $To | Out-Null
# A PC that also has the WSL side set up keeps knowing where it is.
$cfg = Join-Path $To 'app\config.json'
$kept = if (Test-Path $cfg) { Get-Content -Raw $cfg } else { $null }
Get-ChildItem $To -Directory | Where-Object { $_.Name -like 'electron-*' -or $_.Name -eq 'app' -or $_.Name -eq 'native' } | Remove-Item -Recurse -Force
Write-Host 'Copying Workwood...'
robocopy $src $To /E /MT:16 /NFL /NDL /NJH /NJS /NP /XF install.ps1 | Out-Null
if ($LASTEXITCODE -ge 8) { Write-Host "Copying failed (robocopy $LASTEXITCODE)."; exit 1 }
if ($kept) { Set-Content -Path $cfg -Value $kept -NoNewline }

$exe = Get-ChildItem $To -Directory -Filter 'electron-*' | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName 'electron.exe' }
if (-not $NoShortcut) {
  $s = (New-Object -ComObject WScript.Shell).CreateShortcut($link)
  $s.TargetPath = $exe; $s.Arguments = '"' + (Join-Path $To 'app') + '"'
  $s.IconLocation = Join-Path $To 'app\workwood.ico'; $s.Description = 'Workwood'; $s.WorkingDirectory = $To; $s.Save()
}
Write-Host ''
Write-Host 'Workwood is installed. Open it from the Start menu.'
$claude = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
if (-not (Test-Path $claude) -and -not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host 'Claude Code was not found on this PC. Install it and sign in before starting a session:'
  Write-Host '  https://claude.com/claude-code'
}
exit 0

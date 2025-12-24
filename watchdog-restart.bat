@echo off
set PREFIX=sproxy-

for /f "delims=" %%S in ('
  powershell -NoProfile -Command "Get-Service | Where-Object { $_.Name -like \"%PREFIX%*\" } | Select-Object -ExpandProperty Name"
') do (
  net stop %%S >nul 2>&1
  timeout /t 2 >nul
  net start %%S >nul 2>&1
)

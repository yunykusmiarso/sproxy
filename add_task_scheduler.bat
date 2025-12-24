@echo off
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

schtasks /create ^
 /tn "sproxy Auto Restart" ^
 /tr "%SCRIPT_DIR%\watchdog-restart.bat" ^
 /sc minute ^
 /mo 5 ^
 /ru SYSTEM ^
 /rl HIGHEST ^
 /f

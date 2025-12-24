@echo off
setlocal EnableDelayedExpansion
title SIAK PROXY MANAGER

:: =============================
:: KONFIGURASI GLOBAL
:: =============================
set BASE=%~dp0
set BASE=%BASE:~0,-1%
set SRC=%BASE%\source
set NSSM=%BASE%\nssm\nssm.exe
set EXE=index-x64.exe
set PREFIX=siak-proxy-
set DASH_SERVICE=proxy-dashboard
set NODE_EXE=C:\Program Files\nodejs\node.exe
set DASH_DIR=%BASE%\dashboard

:: =============================
:: MENU UTAMA
:: =============================
:MENU
cls
echo =========================================
echo        SPROXY MANAGER
echo =========================================
echo 1. Lihat Daftar Proxy
echo 2. Tambah Proxy
echo 3. Hapus Proxy
echo 4. Restart SEMUA Proxy
echo 5. Update SEMUA Proxy
echo 6. Install Dashboard
echo 7. Restart Dashboard
echo 0. Keluar
echo =========================================
set /p CHOICE=Pilih menu: 

if "%CHOICE%"=="1" goto LIST
if "%CHOICE%"=="2" goto ADD
if "%CHOICE%"=="3" goto DELETE
if "%CHOICE%"=="4" goto RESTART_ALL
if "%CHOICE%"=="5" goto UPDATE_ALL
if "%CHOICE%"=="6" goto INSTALL_DASHBOARD
if "%CHOICE%"=="7" goto RESTART_DASHBOARD
if "%CHOICE%"=="0" exit

goto MENU

:: =============================
:: 1. LIST PROXY
:: =============================
:LIST
cls
echo =========================================
echo      DAFTAR SIAK PROXY
echo =========================================
echo PORT    STATUS
echo -----------------------------------------

for /f "delims=" %%S in ('
  powershell -NoProfile -Command "Get-Service | Where-Object { $_.Name -like \"%PREFIX%*\" } | ForEach-Object { Write-Output ($_.Name + \",\" + $_.Status) }"
') do (
    for /f "tokens=1,2 delims=," %%A in ("%%S") do (
        set PORT=%%A
        set STATUS=%%B
        set PORT=!PORT:%PREFIX%=!
        echo !PORT!    !STATUS!
    )
)

echo -----------------------------------------
pause
goto MENU

:: =============================
:: 2. TAMBAH PROXY
:: =============================
:ADD
cls
echo === TAMBAH PROXY ===
set /p PORT=Masukkan PORT (contoh 3001): 
if "%PORT%"=="" goto MENU

set DST=%BASE%\%PORT%
set SERVICE=%PREFIX%%PORT%

if exist "%DST%" (
  echo Proxy %PORT% sudah ada
  pause
  goto MENU
)

echo Membuat proxy %PORT% ...

xcopy "%SRC%" "%DST%" /E /I /H >nul
echo { "port": %PORT% } > "%DST%\config.json"

"%NSSM%" install %SERVICE% ^
  "C:\Windows\System32\cmd.exe" ^
  "/c cd /d %DST% && %EXE%"

"%NSSM%" set %SERVICE% AppDirectory "%DST%"
"%NSSM%" set %SERVICE% Start SERVICE_AUTO_START
"%NSSM%" set %SERVICE% AppExit Default Restart
"%NSSM%" set %SERVICE% AppRestartDelay 2000
"%NSSM%" set %SERVICE% AppKillProcessTree 1
"%NSSM%" set %SERVICE% AppStdout "%DST%\stdout.log"
"%NSSM%" set %SERVICE% AppStderr "%DST%\stderr.log"

net start %SERVICE%

echo Proxy %PORT% BERHASIL DIBUAT
pause
goto MENU

:: =============================
:: 3. HAPUS PROXY
:: =============================
:DELETE
cls
echo === HAPUS PROXY ===
set /p PORT=Masukkan PORT: 
if "%PORT%"=="" goto MENU

echo.
set /p CONF=Yakin hapus proxy %PORT%? (Y/N) [Y]: 
if "%CONF%"=="" set CONF=Y
if /I not "%CONF%"=="Y" goto MENU

net stop %PREFIX%%PORT% >nul 2>&1
"%NSSM%" remove %PREFIX%%PORT% confirm
rmdir /S /Q "%BASE%\%PORT%"

echo Proxy %PORT% berhasil dihapus
pause
goto MENU

:: =============================
:: 4. RESTART SEMUA PROXY
:: =============================
:RESTART_ALL
cls
echo === RESTART SEMUA SIAK PROXY ===
echo.

set /p CONF=Yakin restart SEMUA proxy? (Y/N) [Y]: 
if "%CONF%"=="" set CONF=Y
if /I not "%CONF%"=="Y" goto MENU

for /f "delims=" %%S in ('
  powershell -NoProfile -Command "Get-Service | Where-Object { $_.Name -like \"%PREFIX%*\" } | Select-Object -ExpandProperty Name"
') do (
    echo Restarting %%S ...
    net stop %%S >nul 2>&1
    timeout /t 2 >nul
    net start %%S >nul 2>&1
)

echo.
echo Semua proxy berhasil direstart
pause
goto MENU

:: =============================
:: 5. UPDATE SEMUA PROXY
:: =============================
:UPDATE_ALL
cls
echo === UPDATE SEMUA SIAK PROXY ===
echo.

set /p CONF=Yakin update SEMUA proxy? (Y/N) [Y]: 
if "%CONF%"=="" set CONF=Y
if /I not "%CONF%"=="Y" goto MENU

for /f "delims=" %%S in ('
  powershell -NoProfile -Command "Get-Service | Where-Object { $_.Name -like \"%PREFIX%*\" } | Select-Object -ExpandProperty Name"
') do (
    set PORT=%%S
    set PORT=!PORT:%PREFIX%=!
    set DST=%BASE%\!PORT!

    if exist "!DST!" (
        echo Updating proxy !PORT! ...
        net stop %%S >nul 2>&1
        xcopy "%SRC%\*" "!DST!\" /E /H /Y >nul
        net start %%S >nul 2>&1
    )
)

echo.
echo Semua proxy berhasil diupdate
pause
goto MENU

:: =============================
:: 6. INSTALL DASHBOARD
:: =============================
:INSTALL_DASHBOARD
cls
echo === INSTALL DASHBOARD ===
echo.

"%NSSM%" install %DASH_SERVICE% "%NODE_EXE%" "%DASH_DIR%\server.js"
"%NSSM%" set %DASH_SERVICE% AppDirectory "%DASH_DIR%"
"%NSSM%" set %DASH_SERVICE% Start SERVICE_AUTO_START

net start %DASH_SERVICE%

echo Dashboard berhasil diinstall sebagai service
pause
goto MENU

:: =============================
:: 7. RESTART DASHBOARD
:: =============================
:RESTART_DASHBOARD
cls
echo === RESTART DASHBOARD ===
echo.

sc query "%DASH_SERVICE%" >nul 2>&1
if %ERRORLEVEL%==0 (
    net stop "%DASH_SERVICE%" >nul 2>&1
    timeout /t 2 >nul
    net start "%DASH_SERVICE%" >nul 2>&1
    echo Dashboard service berhasil direstart.
) else (
    echo ERROR: Service dashboard tidak ditemukan.
)

pause
goto MENU

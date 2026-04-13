@echo off
setlocal
chcp 65001 >nul
powershell -ExecutionPolicy Bypass -File "%~dp0import_story_from_excel.ps1"
if errorlevel 1 (
    echo.
    echo 剧情导入失败。
    pause
    exit /b 1
)
echo.
echo 剧情导入完成。

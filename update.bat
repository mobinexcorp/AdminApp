@echo off
TITLE MobinexCorpAdmin - Auto Updater
cls
echo ==================================================
echo   Mobinex Corp Admin - Desktop App Auto-Updater
echo ==================================================
echo.
echo  This script updates MobinexCorpAdmin to the latest version
echo  and rebuilds the standalone Windows (.EXE) application.
echo.
echo [1/3] Checking dependencies...
call npm install
echo.
echo [2/3] Building Web Application...
call npm run build
echo.
echo [3/3] Packaging Executable (.EXE) into release/...
call npm run dist
echo.
echo ==================================================
echo   UPDATE COMPLETED SUCCESSFULLY!
echo   New EXE file generated in the \release folder:
echo   - MobinexCorpAdmin-Setup-1.0.0.exe
echo   - MobinexCorpAdmin-1.0.0-portable.exe
echo ==================================================
echo.
pause

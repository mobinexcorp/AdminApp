@echo off
setlocal
TITLE MobinexCorpAdmin - Configure Updates
cd /d "%~dp0"

if not exist node_modules call npm install
call npm run configure:updates
pause

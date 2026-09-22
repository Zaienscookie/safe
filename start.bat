@echo off
chcp 65001 >nul
title Cyber Security Club - Local Server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause

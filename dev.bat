@echo off
rem Cannon VTT debug build: the window updates as the code changes.
rem UI edits apply instantly; main-process edits restart the app. Close this window to stop.
cd /d "%~dp0"
call npm.cmd run dev:watch

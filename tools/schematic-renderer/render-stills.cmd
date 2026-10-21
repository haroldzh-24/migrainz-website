@echo off
rem Drag a .blend onto this file to render the style test stills (no video).
if "%~1"=="" (echo Drag a .blend file onto render-stills.cmd. & pause & exit /b 1)
call "%~dp0_render.cmd" stills %1

@echo off
rem Shared launcher. Usage: _render.cmd <video|stills> [model.blend]
setlocal
set "MODE=%~1"
set "MODEL=%~2"
if not defined SCHEMATIC_WORK_DIR set "SCHEMATIC_WORK_DIR=%USERPROFILE%\schematic-work"
if not exist "%SCHEMATIC_WORK_DIR%\models" mkdir "%SCHEMATIC_WORK_DIR%\models"

if not defined BLENDER (
  for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender *") do if exist "%%~D\blender.exe" set "BLENDER=%%~D\blender.exe"
)
if not defined BLENDER (
  for /f "delims=" %%B in ('where blender 2^>nul') do if not defined BLENDER set "BLENDER=%%B"
)
if not defined BLENDER (
  echo Blender not found. Install it from https://www.blender.org/download/ or set the BLENDER environment variable to blender.exe.
  pause & exit /b 1
)

set "SCRIPT=%~dp0render_schematic.py"
if defined MODEL (
  if /i "%MODE%"=="stills" (
    "%BLENDER%" -b -P "%SCRIPT%" -- --model "%MODEL%" --stills all
  ) else (
    "%BLENDER%" -b -P "%SCRIPT%" -- --model "%MODEL%"
  )
) else (
  echo Batch: every .blend in "%SCHEMATIC_WORK_DIR%\models"
  "%BLENDER%" -b -P "%SCRIPT%" -- --models-dir "%SCHEMATIC_WORK_DIR%\models"
)
echo.
echo Finished. Output: %SCHEMATIC_WORK_DIR%\output  (stills: %SCHEMATIC_WORK_DIR%\renders\^<slug^>\stills)
pause

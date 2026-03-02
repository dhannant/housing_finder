@echo off
setlocal

echo Running functions lint...
call npm --prefix functions run lint
if errorlevel 1 exit /b 1

echo Running functions build...
call npm --prefix functions run build
if errorlevel 1 exit /b 1

exit /b 0

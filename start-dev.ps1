<#
.SYNOPSIS
    Employee Leave Management System - Local Development Startup Script
.DESCRIPTION
    Checks system prerequisites (Java 21, Node.js, MySQL), verifies configuration,
    and starts the Spring Boot backend and React/Vite frontend in separate windows.
.PARAMETER BackendOnly
    Starts only the Spring Boot backend in the current window.
.PARAMETER FrontendOnly
    Starts only the React/Vite frontend in the current window.
#>
[CmdletBinding()]
param (
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Employee Leave Management System - Development Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot
if (-not $rootDir) {
    $rootDir = Get-Location
}

# -----------------------------------------------------------------------------
# 1. Prerequisite Checks
# -----------------------------------------------------------------------------
Write-Host "[1/4] Checking prerequisites..." -ForegroundColor Yellow

# Java Check
$javaFound = $false
try {
    $javaVer = & java -version 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -or $javaVer -match "version") {
        $firstLine = ($javaVer -split "`r?`n")[0]
        Write-Host "  [OK] Java detected: $firstLine" -ForegroundColor Green
        $javaFound = $true
    }
} catch {
    $javaFound = $false
}

if (-not $javaFound) {
    Write-Host "  [ERROR] Java runtime not found in PATH." -ForegroundColor Red
    Write-Host "          Please install JDK 21+ and ensure 'java' is accessible in PATH." -ForegroundColor Red
    exit 1
}

# Node.js Check
$nodeFound = $false
try {
    $nodeVer = & node -v 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Node.js detected: $nodeVer" -ForegroundColor Green
        $nodeFound = $true
    }
} catch {
    $nodeFound = $false
}

if (-not $nodeFound) {
    Write-Host "  [ERROR] Node.js runtime not found in PATH." -ForegroundColor Red
    Write-Host "          Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# MySQL Port Check (localhost:3306)
Write-Host "  [*] Verifying MySQL database connectivity on 127.0.0.1:3306..." -ForegroundColor Gray
$mysqlRunning = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $tcpClient.BeginConnect("127.0.0.1", 3306, $null, $null)
    $success = $asyncResult.AsyncWaitHandle.WaitOne(1500, $false)
    if ($success -and $tcpClient.Connected) {
        $mysqlRunning = $true
        $tcpClient.EndConnect($asyncResult)
    }
    $tcpClient.Close()
} catch {
    $mysqlRunning = $false
}

if ($mysqlRunning) {
    Write-Host "  [OK] MySQL service is listening on port 3306." -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Could not connect to MySQL on localhost:3306." -ForegroundColor Yellow
    Write-Host "            If MySQL is stopped, start it via PowerShell as Administrator:" -ForegroundColor Yellow
    Write-Host "              Start-Service MySQL80   (or 'net start MySQL80')" -ForegroundColor Yellow
    Write-Host "            Continuing startup in case MySQL is hosted remotely or on a custom port..." -ForegroundColor Gray
}

# -----------------------------------------------------------------------------
# 2. Configuration Verification
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Verifying local configuration..." -ForegroundColor Yellow

$localPropsPath = Join-Path $rootDir "src\main\resources\application-local.properties"
$examplePropsPath = Join-Path $rootDir "src\main\resources\application-example.properties"

if (Test-Path $localPropsPath) {
    Write-Host "  [OK] Found local configuration: src/main/resources/application-local.properties (gitignored)" -ForegroundColor Green
} else {
    Write-Host "  [INFO] application-local.properties not found." -ForegroundColor Gray
    if ($env:DB_PASSWORD) {
        Write-Host "  [OK] Using DB_PASSWORD environment variable for MySQL credentials." -ForegroundColor Green
    } else {
        Write-Host "  [INFO] No DB_PASSWORD environment variable set; default empty password will be used." -ForegroundColor Gray
        Write-Host "         To set credentials permanently without committing them to git, create:" -ForegroundColor Gray
        Write-Host "         src/main/resources/application-local.properties" -ForegroundColor Gray
    }
}

# -----------------------------------------------------------------------------
# 3. Execution Routing
# -----------------------------------------------------------------------------
if ($CheckOnly) {
    Write-Host "[3/4] CheckOnly mode specified. Skipping process execution." -ForegroundColor Cyan
    Write-Host "Prerequisites and configuration verification complete." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "[3/4] Preparing application processes..." -ForegroundColor Yellow

if ($BackendOnly) {
    Write-Host "Starting Spring Boot backend directly in this window..." -ForegroundColor Cyan
    Set-Location $rootDir
    & .\mvnw.cmd spring-boot:run
    exit $LASTEXITCODE
}

if ($FrontendOnly) {
    Write-Host "Starting React/Vite frontend directly in this window..." -ForegroundColor Cyan
    Set-Location (Join-Path $rootDir "frontend")
    & npm run dev
    exit $LASTEXITCODE
}

# Standard Mode: Launch both backend and frontend in separate dedicated windows
Write-Host "  -> Launching Spring Boot backend in a dedicated window..." -ForegroundColor Cyan
$backendCmd = "Set-Location '$rootDir'; Write-Host '=========================================' -ForegroundColor Cyan; Write-Host '  Employee Leave Management System - Backend' -ForegroundColor Cyan; Write-Host '  Port: 8080 | Context: /api' -ForegroundColor Cyan; Write-Host '=========================================' -ForegroundColor Cyan; .\mvnw.cmd spring-boot:run"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Write-Host "  -> Launching React/Vite frontend in a dedicated window..." -ForegroundColor Cyan
$frontendDir = Join-Path $rootDir "frontend"
$frontendCmd = "Set-Location '$frontendDir'; Write-Host '=========================================' -ForegroundColor Cyan; Write-Host '  Employee Leave Management System - Frontend' -ForegroundColor Cyan; Write-Host '=========================================' -ForegroundColor Cyan; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

# -----------------------------------------------------------------------------
# 4. Summary & Access Details
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Startup commands initiated!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Application URLs:" -ForegroundColor White
Write-Host "    Frontend:   http://localhost:5173  (or http://localhost:5174)" -ForegroundColor Cyan
Write-Host "    Backend:    http://localhost:8080" -ForegroundColor Cyan
Write-Host "    API Base:   http://localhost:8080/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Demo Credentials:" -ForegroundColor White
Write-Host "    Employee:   employee / Employee@123" -ForegroundColor Yellow
Write-Host "    Manager:    manager  / Manager@123" -ForegroundColor Yellow
Write-Host "    HR Admin:   admin    / Admin@123" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

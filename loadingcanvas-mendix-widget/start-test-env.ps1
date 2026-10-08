<# 
.SYNOPSIS
Starts the Mendix test environment and verifies MCP server connections.

.DESCRIPTION
This script starts the Mendix runtime and verifies that the MCP servers
(mendix-postgres and firefox-devtools) are available for testing.

.NOTES
Run from the project root: d:/source/loadingcanvas-mendix-widget
#>

param(
    [switch]$SkipMendixStart,
    [switch]$VerifyOnly
)

Write-Host "=== LoadingCanvas Widget Test Environment ===" -ForegroundColor Cyan
Write-Host ""

# Check Mendix runtime
function Check-MendixRuntime {
    Write-Host "Checking Mendix runtime on port 8882..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8882/login.html" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] Mendix runtime is running on port 8882" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[FAIL] Mendix runtime not responding on port 8882" -ForegroundColor Red
    }
    return $false
}

# Check PostgreSQL
function Check-PostgreSQL {
    Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
    try {
        if (Get-Command psql -ErrorAction SilentlyContinue) {
            $result = psql "postgresql://mendix:mendix@localhost:5432/mendix" -c "SELECT COUNT(*) FROM datamodelmodule$technicaldetails;" -t -A
            Write-Host "[OK] PostgreSQL connected - TechnicalDetails count: $result" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[WARN] psql not found - install PostgreSQL client tools" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "[FAIL] PostgreSQL connection failed" -ForegroundColor Red
        return $false
    }
}

# Check Firefox
function Check-Firefox {
    Write-Host "Checking Firefox availability..." -ForegroundColor Yellow
    $firefoxPaths = @(
        "C:\Program Files\Mozilla Firefox\firefox.exe",
        "C:\Program Files (x86)\Mozilla Firefox\firefox.exe"
    )
    
    foreach ($path in $firefoxPaths) {
        if (Test-Path $path) {
            Write-Host "[OK] Firefox found at: $path" -ForegroundColor Green
            return $true
        }
    }
    Write-Host "[FAIL] Firefox not found in standard locations" -ForegroundColor Red
    return $false
}

# Check Node.js and npm
function Check-NodeEnvironment {
    Write-Host "Checking Node.js environment..." -ForegroundColor Yellow
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[FAIL] Node.js/npm not found" -ForegroundColor Red
        return $false
    }
}

# Start Mendix runtime
function Start-MendixRuntime {
    Write-Host "Starting Mendix runtime..." -ForegroundColor Yellow
    $mendixPath = "D:/Mendix/TCSTransport-main/deployment"
    if (Test-Path "$mendixPath/runtime/launcher/runtimelauncher.jar") {
        Write-Host "Starting Mendix runtime in background..." -ForegroundColor Yellow
        Start-Process -FilePath "java" -ArgumentList "-jar runtime/launcher/runtimelauncher.jar -d ." -WorkingDirectory $mendixPath -WindowStyle Hidden
        Write-Host "Waiting for runtime to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        return (Check-MendixRuntime)
    } else {
        Write-Host "[FAIL] Mendix runtime launcher not found at expected path" -ForegroundColor Red
        return $false
    }
}

# Main execution
$checks = @()
$checks += @{ Name = "Node.js"; Result = (Check-NodeEnvironment) }
$checks += @{ Name = "Firefox"; Result = (Check-Firefox) }
$checks += @{ Name = "PostgreSQL"; Result = (Check-PostgreSQL) }

if (-not $VerifyOnly) {
    $checks += @{ Name = "Mendix Runtime"; Result = (Check-MendixRuntime) }
    if (-not $checks[-1].Result -and -not $SkipMendixStart) {
        $checks += @{ Name = "Mendix Start"; Result = (Start-MendixRuntime) }
    }
}

Write-Host ""
Write-Host "=== Environment Check Summary ===" -ForegroundColor Cyan
foreach ($check in $checks) {
    $status = if ($check.Result) { "[OK] PASS" } else { "[FAIL] FAIL" }
    $color = if ($check.Result) { "Green" } else { "Red" }
    Write-Host "$status - $($check.Name)" -ForegroundColor $color
}

$allPassed = $true
foreach ($check in $checks) {
    if (-not $check.Result) { $allPassed = $false }
}

if ($allPassed) {
    Write-Host ""
    Write-Host "[OK] All checks passed! Ready for testing." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "[FAIL] Some checks failed. Please fix before testing." -ForegroundColor Red
    exit 1
}
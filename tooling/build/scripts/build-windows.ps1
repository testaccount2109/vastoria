# Build Vastoria IDE for Windows x64 — NSIS installer, MSI, and portable .exe
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path (Join-Path $ScriptDir "..\..\..")
$IdeDir = Join-Path $RootDir "apps\ide"
$TauriDir = Join-Path $IdeDir "src-tauri"
$DistDir = Join-Path $RootDir "dist\builds"

function Read-Version {
    if ($env:VERSION) {
        return $env:VERSION.TrimStart("v")
    }
    $conf = Get-Content (Join-Path $TauriDir "tauri.conf.json") -Raw | ConvertFrom-Json
    return $conf.version
}

function Get-Sha256($Path) {
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Set-Json-Version($Path, $Version) {
    $raw = Get-Content $Path -Raw
    $updated = $raw -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
    if ($updated -ne $raw) {
        Set-Content -Path $Path -Value $updated -Encoding UTF8
    }
}

$Version = Read-Version
$BuildId = if ($env:GITHUB_RUN_ID) { $env:GITHUB_RUN_ID } else { "local" }
$OutDir = Join-Path $DistDir $Version
$BundleRoot = Join-Path $TauriDir "target\release\bundle"

Write-Host "[build] Vastoria Windows build v$Version (build $BuildId)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "pnpm is required"
}

$env:CARGO_BUILD_JOBS = if ($env:CARGO_BUILD_JOBS) { $env:CARGO_BUILD_JOBS } else { "2" }
$env:NODE_OPTIONS = if ($env:NODE_OPTIONS) { $env:NODE_OPTIONS } else { "--max-old-space-size=4096" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "[build] Setting app metadata version to $Version"
Set-Json-Version (Join-Path $TauriDir "tauri.conf.json") $Version
Set-Json-Version (Join-Path $IdeDir "package.json") $Version

Set-Location $RootDir
Write-Host "[build] Installing pnpm dependencies…"
pnpm install --frozen-lockfile 2>$null
if ($LASTEXITCODE -ne 0) { pnpm install }

Write-Host "[build] Building React frontend…"
pnpm --filter @vastoria/ide build

Set-Location $IdeDir
Write-Host "[build] Building Tauri Windows bundles (nsis, msi)…"
pnpm exec tauri build --bundles nsis,msi

# NSIS setup .exe
$NsisDir = Join-Path $BundleRoot "nsis"
$NsisSrc = Get-ChildItem -Path $NsisDir -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $NsisSrc) {
    $NsisSrc = Get-ChildItem -Path $NsisDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $NsisSrc) {
    throw "NSIS installer not found under $NsisDir"
}
$InstallerName = "Vastoria-$Version-x64-setup.exe"
$InstallerOut = Join-Path $OutDir $InstallerName
Copy-Item -Force $NsisSrc.FullName $InstallerOut
Write-Host "[build] Installer → $InstallerOut"

# MSI (optional)
$MsiDir = Join-Path $BundleRoot "msi"
$MsiSrc = Get-ChildItem -Path $MsiDir -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
$MsiOut = $null
if ($MsiSrc) {
    $MsiName = "Vastoria-$Version-x64.msi"
    $MsiOut = Join-Path $OutDir $MsiName
    Copy-Item -Force $MsiSrc.FullName $MsiOut
    Write-Host "[build] MSI → $MsiOut"
}

# Portable: ship the main application executable
$ReleaseExe = Join-Path $TauriDir "target\release\vastoria-ide.exe"
if (-not (Test-Path $ReleaseExe)) {
    $ReleaseExe = Join-Path $TauriDir "target\release\Vastoria.exe"
}
if (-not (Test-Path $ReleaseExe)) {
    throw "Release binary not found in target\release"
}
$PortableName = "Vastoria-$Version-x64-portable.exe"
$PortableOut = Join-Path $OutDir $PortableName
Copy-Item -Force $ReleaseExe $PortableOut
Write-Host "[build] Portable → $PortableOut"

# Manifest for upload script
$Manifest = Join-Path $OutDir "manifest.json"
$manifestObj = [ordered]@{
    version = $Version
    platform = "windows_x86_64"
    installer = @{
        path = $InstallerOut
        filename = $InstallerName
        sha256 = (Get-Sha256 $InstallerOut)
        size_bytes = (Get-Item $InstallerOut).Length
    }
    portable = @{
        path = $PortableOut
        filename = $PortableName
        sha256 = (Get-Sha256 $PortableOut)
        size_bytes = (Get-Item $PortableOut).Length
    }
}
if ($MsiOut) {
    $manifestObj.msi = @{
        path = $MsiOut
        filename = (Split-Path $MsiOut -Leaf)
        sha256 = (Get-Sha256 $MsiOut)
        size_bytes = (Get-Item $MsiOut).Length
    }
}
$manifestObj | ConvertTo-Json -Depth 6 | Set-Content -Path $Manifest -Encoding UTF8
Write-Host "[build] Manifest → $Manifest"
Write-Host "[build] Build complete: $OutDir"

if ($env:SKIP_UPLOAD -eq "0") {
    python (Join-Path $ScriptDir "upload-release.py") --manifest $Manifest
}

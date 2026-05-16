param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('home', 'hu-chi-tieu')]
  [string]$Variant
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$config = if ($Variant -eq 'hu-chi-tieu') {
  @{
    Capacitor = 'capacitor.hu-chi-tieu.json'
    AppId = 'com.luckyhome.huchitieu'
    AppName = 'Hũ Chi Tiêu'
    Icon = 'public/Logo-hu-chi-tieu.png'
  }
} else {
  @{
    Capacitor = 'capacitor.lucky-home.json'
    AppId = 'com.luckyhome.app'
    AppName = 'Lucky Home'
    Icon = 'public/logo.png'
  }
}

if ($Variant -eq 'hu-chi-tieu') {
  $config.AppName = "H$([char]0x0169) Chi Ti$([char]0x00EA)u"
}

Copy-Item -LiteralPath (Join-Path $root $config.Capacitor) -Destination (Join-Path $root 'capacitor.config.json') -Force

$buildGradlePath = Join-Path $root 'android/app/build.gradle'
$buildGradle = Get-Content -Raw -LiteralPath $buildGradlePath
$buildGradle = $buildGradle -replace 'namespace = "[^"]+"', 'namespace = "com.luckyhome.app"'
$buildGradle = $buildGradle -replace 'applicationId "[^"]+"', "applicationId `"$($config.AppId)`""
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($buildGradlePath, $buildGradle, $utf8NoBom)

$stringsPath = Join-Path $root 'android/app/src/main/res/values/strings.xml'
$strings = @"
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">$($config.AppName)</string>
    <string name="title_activity_main">$($config.AppName)</string>
    <string name="package_name">$($config.AppId)</string>
    <string name="custom_url_scheme">$($config.AppId)</string>
</resources>
"@
[System.IO.File]::WriteAllText($stringsPath, $strings, $utf8NoBom)

$iconPath = Join-Path $root $config.Icon
if (Test-Path -LiteralPath $iconPath) {
  Add-Type -AssemblyName System.Drawing
  $src = [System.Drawing.Image]::FromFile($iconPath)
  $densities = @(
    @{Dir='mipmap-mdpi'; Icon=48; Foreground=108},
    @{Dir='mipmap-hdpi'; Icon=72; Foreground=162},
    @{Dir='mipmap-xhdpi'; Icon=96; Foreground=216},
    @{Dir='mipmap-xxhdpi'; Icon=144; Foreground=324},
    @{Dir='mipmap-xxxhdpi'; Icon=192; Foreground=432}
  )

  function Save-ResizedPng($source, $path, $canvasSize, $scale) {
    $bmp = New-Object System.Drawing.Bitmap $canvasSize, $canvasSize
    $bmp.SetResolution(96, 96)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $target = [int][Math]::Round($canvasSize * $scale)
    $offset = [int][Math]::Round(($canvasSize - $target) / 2)
    $graphics.DrawImage($source, $offset, $offset, $target, $target)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
  }

  foreach ($density in $densities) {
    $base = Join-Path (Join-Path $root 'android/app/src/main/res') $density.Dir
    Save-ResizedPng $src (Join-Path $base 'ic_launcher.png') $density.Icon 1.0
    Save-ResizedPng $src (Join-Path $base 'ic_launcher_round.png') $density.Icon 1.0
    Save-ResizedPng $src (Join-Path $base 'ic_launcher_foreground.png') $density.Foreground 0.72
  }
  $src.Dispose()
}

Write-Host "Prepared Android variant: $Variant ($($config.AppId))"

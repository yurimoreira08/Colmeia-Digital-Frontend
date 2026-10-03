Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\yurik\.gemini\antigravity-ide\brain\78116231-c9db-4249-9e45-eb51e225d30e"
$assetsDir = "c:\Users\yurik\Codigos\Colmeia-Digital-Frontend\assets"

$appLogoSrc = Join-Path $brainDir "colmeia_app_logo_1791040827979.jpg"
$adaptiveSrc = Join-Path $brainDir "adaptive_foreground_1791040847531.jpg"
$splashSrc = Join-Path $brainDir "splash_screen_1791040867293.jpg"

function Resize-And-Save($srcPath, $destPath, $width, $height) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graphics.DrawImage($srcImg, 0, 0, $width, $height)
    
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()
    Write-Output "Saved: $destPath ($($width)x$($height))"
}

function Create-Monochrome($srcPath, $destPath, $width, $height) {
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    
    # Grayscale color matrix
    $matrix = New-Object System.Drawing.Imaging.ColorMatrix
    $matrix.Matrix00 = 0.299; $matrix.Matrix01 = 0.299; $matrix.Matrix02 = 0.299
    $matrix.Matrix10 = 0.587; $matrix.Matrix11 = 0.587; $matrix.Matrix12 = 0.587
    $matrix.Matrix20 = 0.114; $matrix.Matrix21 = 0.114; $matrix.Matrix22 = 0.114
    $matrix.Matrix33 = 1.0
    $matrix.Matrix44 = 1.0
    
    $attributes = New-Object System.Drawing.Imaging.ImageAttributes
    $attributes.SetColorMatrix($matrix)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $graphics.DrawImage($srcImg, $rect, 0, 0, $srcImg.Width, $srcImg.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
    
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $attributes.Dispose()
    $graphics.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()
    Write-Output "Saved Monochrome: $destPath"
}

function Create-Background($destPath, $width, $height, $colorHex) {
    $destBmp = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $color = [System.Drawing.ColorTranslator]::FromHtml($colorHex)
    $brush = New-Object System.Drawing.SolidBrush($color)
    $graphics.FillRectangle($brush, 0, 0, $width, $height)
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $brush.Dispose()
    $graphics.Dispose()
    $destBmp.Dispose()
    Write-Output "Saved Background: $destPath"
}

# 1. Main App Icon (1024x1024 PNG)
Resize-And-Save $appLogoSrc (Join-Path $assetsDir "applogo.png") 1024 1024
Resize-And-Save $appLogoSrc (Join-Path $assetsDir "icon.png") 1024 1024

# 2. Android Adaptive Icon Foreground (1024x1024 PNG)
Resize-And-Save $adaptiveSrc (Join-Path $assetsDir "adaptive-icon.png") 1024 1024

# 3. Android Adaptive Background
Create-Background (Join-Path $assetsDir "android-icon-background.png") 1024 1024 "#0E4F55"

# 4. Android Adaptive Monochrome Icon
Create-Monochrome $adaptiveSrc (Join-Path $assetsDir "android-icon-monochrome.png") 1024 1024

# 5. Splash Screen (1284x2778 and 1024x1024)
Resize-And-Save $splashSrc (Join-Path $assetsDir "splash.png") 1284 2778
Resize-And-Save $splashSrc (Join-Path $assetsDir "splash-icon.png") 1024 1024

# 6. Web Favicon (192x192 and 48x48)
Resize-And-Save $appLogoSrc (Join-Path $assetsDir "favicon.png") 192 192

Write-Output "ALL ASSETS GENERATED SUCCESSFULLY!"

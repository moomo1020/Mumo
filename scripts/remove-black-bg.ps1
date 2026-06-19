param(
  [string]$InputPath,
  [string]$OutputPath,
  [int]$BlackMax = 34,
  [int]$BlackChroma = 12
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile($InputPath)
$width = $src.Width
$height = $src.Height
$out = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$srcData = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $out.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$srcBytes = New-Object byte[] ($srcData.Stride * $height)
$dstBytes = New-Object byte[] ($dstData.Stride * $height)
[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBytes, 0, $srcBytes.Length)

for ($y = 0; $y -lt $height; $y++) {
  $row = $y * $srcData.Stride
  for ($x = 0; $x -lt $width; $x++) {
    $i = $row + ($x * 4)
    $b = $srcBytes[$i]
    $g = $srcBytes[$i + 1]
    $r = $srcBytes[$i + 2]
    $a = $srcBytes[$i + 3]
    $max = [Math]::Max($r, [Math]::Max($g, $b))
    $min = [Math]::Min($r, [Math]::Min($g, $b))
    $delta = $max - $min

    if ($a -le 8) {
      $dstBytes[$i] = 0
      $dstBytes[$i + 1] = 0
      $dstBytes[$i + 2] = 0
      $dstBytes[$i + 3] = 0
    }
    elseif ($max -le $BlackMax -and $delta -le $BlackChroma) {
      $dstBytes[$i] = 0
      $dstBytes[$i + 1] = 0
      $dstBytes[$i + 2] = 0
      $dstBytes[$i + 3] = 0
    }
    else {
      $dstBytes[$i] = $b
      $dstBytes[$i + 1] = $g
      $dstBytes[$i + 2] = $r
      $dstBytes[$i + 3] = 255
    }
  }
}

[System.Runtime.InteropServices.Marshal]::Copy($dstBytes, 0, $dstData.Scan0, $dstBytes.Length)
$src.UnlockBits($srcData)
$out.UnlockBits($dstData)
$src.Dispose()

$out.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Write-Output "Saved $OutputPath ($width x $height)"

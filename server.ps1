$ErrorActionPreference = 'SilentlyContinue'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# 用端口 0 让系统自动分配空闲端口，避免冲突
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port

$url = "http://127.0.0.1:$port/index.html"

[System.Diagnostics.Process]::Start($url) | Out-Null

Write-Host ""
Write-Host "  ============================================"
Write-Host "   ' 网络安全社纳新 - 本地离线版'" -ForegroundColor Magenta
Write-Host "    地址: $url"
Write-Host "    请在浏览器中点击「允许」使用摄像头"
Write-Host "    关闭此窗口即停止服务"
Write-Host "  ============================================"
Write-Host ""

function Get-ContentType($ext) {
  switch ($ext.ToLower()) {
    '.html'  { return 'text/html; charset=utf-8' }
    '.js'    { return 'application/javascript; charset=utf-8' }
    '.mjs'   { return 'application/javascript; charset=utf-8' }
    '.css'   { return 'text/css; charset=utf-8' }
    '.json'  { return 'application/json; charset=utf-8' }
    '.wasm'  { return 'application/wasm' }
    '.tflite'{ return 'application/octet-stream' }
    '.data'  { return 'application/octet-stream' }
    '.bin'   { return 'application/octet-stream' }
    '.svg'   { return 'image/svg+xml' }
    '.ico'   { return 'image/x-icon' }
    '.jpg'   { return 'image/jpeg' }
    '.jpeg'  { return 'image/jpeg' }
    '.png'   { return 'image/png' }
    '.mp4'   { return 'video/mp4' }
    '.txt'   { return 'text/plain; charset=utf-8' }
    default  { return 'application/octet-stream' }
  }
}

$rootFull = [System.IO.Path]::GetFullPath($root)

while ($listener.Server.IsBound) {
  $client = $null
  $stream = $null
  try {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $stream.ReadTimeout = 4000

    $reqText = ''
    $buf = New-Object byte[] 16384
    while ($reqText -notmatch "`r`n`r`n") {
      $n = $stream.Read($buf, 0, $buf.Length)
      if ($n -le 0) { break }
      if ($reqText.Length -gt 70000) { break }
      $reqText += [System.Text.Encoding]::ASCII.GetString($buf, 0, $n)
    }

    if ($reqText -match '^GET (\S+)') {
      $path = $Matches[1]
      if ($path.StartsWith('http')) {
        $path = ([System.Uri]$path).AbsolutePath
      }
      if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
      $path = [System.Uri]::UnescapeDataString($path)
      # 剥离 URL 查询参数（?...）与片段（#...），只保留真实文件路径
      $qIdx = $path.IndexOf('?')
      if ($qIdx -ge 0) { $path = $path.Substring(0, $qIdx) }
      $hIdx = $path.IndexOf('#')
      if ($hIdx -ge 0) { $path = $path.Substring(0, $hIdx) }
      $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $file = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      $fileOk = $false
      if ($file.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -and
          (Test-Path -LiteralPath $file -PathType Leaf)) {
        $fileOk = $true
      }
      if ($fileOk) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ct = Get-ContentType ([System.IO.Path]::GetExtension($file))
        $head = [System.Text.Encoding]::ASCII.GetBytes(
          "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-store`r`n`r`n")
        $stream.Write($head, 0, $head.Length)
        $stream.Write($bytes, 0, $bytes.Length)
      } else {
        $body = '404 not found'
        $data = [System.Text.Encoding]::ASCII.GetBytes(
          "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n$body")
        $stream.Write($data, 0, $data.Length)
      }
      $stream.Flush()
    }
  } catch {
  } finally {
    try { if ($stream) { $stream.Close() } } catch {}
    try { if ($client) { $client.Close() } } catch {}
  }
}
$listener.Stop()
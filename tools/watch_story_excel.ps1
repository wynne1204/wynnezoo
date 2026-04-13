$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$excelPath = Join-Path $root 'Doc\剧情.xlsx'
$importerPath = Join-Path $PSScriptRoot 'import_story_from_excel.py'

function Invoke-StoryImport {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检测到变化，开始导入剧情..."
    & (Join-Path $PSScriptRoot 'import_story_from_excel.ps1')
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 导入失败，请检查上面的报错。" -ForegroundColor Red
    } else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 导入完成，刷新游戏即可看到更新。" -ForegroundColor Green
    }
}

if (-not (Test-Path $excelPath)) {
    throw "未找到剧情表：$excelPath"
}

$lastWriteTime = (Get-Item $excelPath).LastWriteTimeUtc
Invoke-StoryImport
Write-Host "正在监听：$excelPath"
Write-Host "保存 Excel 后会自动重新导入。按 Ctrl+C 结束。"

while ($true) {
    Start-Sleep -Milliseconds 900
    $currentWriteTime = (Get-Item $excelPath).LastWriteTimeUtc
    if ($currentWriteTime -ne $lastWriteTime) {
        $lastWriteTime = $currentWriteTime
        Start-Sleep -Milliseconds 500
        Invoke-StoryImport
    }
}

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$rootDir = Split-Path -Parent $PSScriptRoot
$defaultExcelPath = Join-Path $rootDir ([string]([char]0x5267) + [char]0x60C5 + '.xlsx')
$defaultOutputPath = Join-Path $rootDir 'js\story\story-generated-data.js'
$storyAssetRoot = Join-Path $rootDir 'Texture\story'
$portraitFolder = [string]([char]0x7ACB) + [char]0x7ED8
$portraitDir = Join-Path $storyAssetRoot $portraitFolder

$headerOrder = [string][char]0x5E55
$headerSpeaker = [string]([char]0x4EBA) + [char]0x7269
$headerText = [string]([char]0x5BF9) + [char]0x8BDD
$headerScene = [string]([char]0x573A) + [char]0x666F
$headerExtra = [string]([char]0x8865) + [char]0x5145
$headerExtraType = [string]([char]0x8865) + [char]0x5145 + [char]0x7C7B + [char]0x578B
$narrationSpeaker = [string]([char]0x65C1) + [char]0x767D
$prologueTitle = [string]([char]0x5E8F) + [char]0x7AE0
$backgroundKeyword = [string]([char]0x80CC) + [char]0x666F
$fullWidthColon = [string][char]0xFF1A
$fullWidthComma = [string][char]0xFF0C
$transitionMode = 'transition'
$illustrationMode = 'illustration'
$standardMode = 'standard'

$shakeKeywords = @(
    ([string]([char]0x9707) + [char]0x52A8),
    ([string]([char]0x6296) + [char]0x52A8)
)
$zoomKeywords = @(
    ([string]([char]0x955C) + [char]0x5934 + [char]0x62C9 + [char]0x8FD1),
    ([string]([char]0x62C9) + [char]0x8FD1 + [char]0x955C + [char]0x5934),
    ([string]([char]0x62C9) + [char]0x8FD1),
    ([string]([char]0x7279) + [char]0x5199)
)
$panLeftToRightKeywords = @(
    ([string]([char]0x4ECE) + [char]0x5DE6 + [char]0x5230 + [char]0x53F3),
    ([string]([char]0x5DE6) + [char]0x5230 + [char]0x53F3)
)
$panRightToLeftKeywords = @(
    ([string]([char]0x4ECE) + [char]0x53F3 + [char]0x5230 + [char]0x5DE6),
    ([string]([char]0x53F3) + [char]0x5230 + [char]0x5DE6)
)
$backgroundMainValues = @(
    ([string]([char]0x4E3B) + [char]0x754C + [char]0x9762),
    ([string]([char]0x4E3B) + [char]0x9875),
    ([string]([char]0x4E3B) + [char]0x83DC + [char]0x5355),
    ([string]([char]0x52A8) + [char]0x7269 + [char]0x56ED + [char]0x4E3B + [char]0x9875),
    ([string]([char]0x52A8) + [char]0x7269 + [char]0x56ED + [char]0x4E3B + [char]0x754C + [char]0x9762),
    'zoo',
    'zoohome',
    'zoo-home',
    'mainmenu',
    'menu'
)
$charStrong = [string][char]0x5F3A
$charSoft = [string][char]0x8F7B
$leftKeyword = [string][char]0x5DE6
$rightKeyword = [string][char]0x53F3
$supplementTypePanRightToLeft = 1
$supplementTypeShake = 2
$supplementTypeZoomIn = 3
$supplementTypeDualDialogue = 4
$supplementTypeItemReward = 5
$supplementTypeZooHome = 6
$supplementTypeInteraction = 7
$supplementTypeOption = 8
$supplementTypeCollection = 9

<#

<#
$collectionSpeciesMap = @{
    '小熊猫' = @{ speciesId = 'red-panda'; speciesName = '小熊猫' }
    '水豚' = @{ speciesId = 'capybara'; speciesName = '水豚' }
    '大熊猫' = @{ speciesId = 'giant-panda'; speciesName = '大熊猫' }
    '雪豹' = @{ speciesId = 'snow-leopard'; speciesName = '雪豹' }
    '考拉' = @{ speciesId = 'koala'; speciesName = '考拉' }
    '帝企鹅' = @{ speciesId = 'emperor-penguin'; speciesName = '帝企鹅' }
    '环尾狐猴' = @{ speciesId = 'ring-tailed-lemur'; speciesName = '环尾狐猴' }
    '斑马' = @{ speciesId = 'zebra'; speciesName = '斑马' }
    '长颈鹿' = @{ speciesId = 'giraffe'; speciesName = '长颈鹿' }
    '亚洲象' = @{ speciesId = 'asian-elephant'; speciesName = '亚洲象' }
    '水獭' = @{ speciesId = 'otter'; speciesName = '水獭' }
}
#>

<#
$collectionSpeciesMap = @{
    '小熊猫' = @{ speciesId = 'red-panda'; speciesName = '小熊猫' }
    '水豚' = @{ speciesId = 'capybara'; speciesName = '水豚' }
    '大熊猫' = @{ speciesId = 'giant-panda'; speciesName = '大熊猫' }
    '雪豹' = @{ speciesId = 'snow-leopard'; speciesName = '雪豹' }
    '考拉' = @{ speciesId = 'koala'; speciesName = '考拉' }
    '帝企鹅' = @{ speciesId = 'emperor-penguin'; speciesName = '帝企鹅' }
    '环尾狐猴' = @{ speciesId = 'ring-tailed-lemur'; speciesName = '环尾狐猴' }
    '斑马' = @{ speciesId = 'zebra'; speciesName = '斑马' }
    '长颈鹿' = @{ speciesId = 'giraffe'; speciesName = '长颈鹿' }
    '亚洲象' = @{ speciesId = 'asian-elephant'; speciesName = '亚洲象' }
    '水獭' = @{ speciesId = 'otter'; speciesName = '水獭' }
}
#>

$collectionSpeciesMap = @{
    ([string]([char]0x5C0F) + [char]0x718A + [char]0x732B) = @{ speciesId = 'red-panda'; speciesName = ([string]([char]0x5C0F) + [char]0x718A + [char]0x732B) }
    ([string]([char]0x6C34) + [char]0x8C5A) = @{ speciesId = 'capybara'; speciesName = ([string]([char]0x6C34) + [char]0x8C5A) }
    ([string]([char]0x5927) + [char]0x718A + [char]0x732B) = @{ speciesId = 'giant-panda'; speciesName = ([string]([char]0x5927) + [char]0x718A + [char]0x732B) }
    ([string]([char]0x96EA) + [char]0x8C79) = @{ speciesId = 'snow-leopard'; speciesName = ([string]([char]0x96EA) + [char]0x8C79) }
    ([string]([char]0x8003) + [char]0x62C9) = @{ speciesId = 'koala'; speciesName = ([string]([char]0x8003) + [char]0x62C9) }
    ([string]([char]0x5E1D) + [char]0x4F01 + [char]0x9E45) = @{ speciesId = 'emperor-penguin'; speciesName = ([string]([char]0x5E1D) + [char]0x4F01 + [char]0x9E45) }
    ([string]([char]0x73AF) + [char]0x5C3E + [char]0x72D0 + [char]0x7334) = @{ speciesId = 'ring-tailed-lemur'; speciesName = ([string]([char]0x73AF) + [char]0x5C3E + [char]0x72D0 + [char]0x7334) }
    ([string]([char]0x6591) + [char]0x9A6C) = @{ speciesId = 'zebra'; speciesName = ([string]([char]0x6591) + [char]0x9A6C) }
    ([string]([char]0x957F) + [char]0x9888 + [char]0x9E7F) = @{ speciesId = 'giraffe'; speciesName = ([string]([char]0x957F) + [char]0x9888 + [char]0x9E7F) }
    ([string]([char]0x4E9A) + [char]0x6D32 + [char]0x8C61) = @{ speciesId = 'asian-elephant'; speciesName = ([string]([char]0x4E9A) + [char]0x6D32 + [char]0x8C61) }
    ([string]([char]0x6C34) + [char]0x736D) = @{ speciesId = 'otter'; speciesName = ([string]([char]0x6C34) + [char]0x736D) }
}

function Normalize-Text($value) {
    if ($null -eq $value) {
        return ''
    }
    return ([string]$value).Trim()
}

function Parse-OptionChoices([string]$extraText) {
    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return $null
    }

    $parts = Split-ExtraParts $normalized
    if ($parts.Count -eq 0) {
        return $null
    }

    $choices = New-Object System.Collections.Generic.List[object]
    foreach ($part in $parts) {
        $match = [regex]::Match($part, '^(?<id>\d+)-(?<label>.+)$')
        if (-not $match.Success) {
            continue
        }

        $choiceId = $match.Groups['id'].Value
        $label = Normalize-Text $match.Groups['label'].Value
        if (-not $label) {
            continue
        }

        $jump = 0
        if (-not [int]::TryParse($choiceId, [ref]$jump)) {
            $jump = 0
        }

        $choices.Add([ordered]@{
            id = $choiceId
            label = $label
            jump = $jump
        }) | Out-Null
    }

    if ($choices.Count -eq 0) {
        return $null
    }

    return $choices.ToArray()
}

function Get-OptionChoices($supplementType, [string]$extraText) {
    $parsedChoices = Parse-OptionChoices $extraText
    if ($supplementType -eq $supplementTypeOption) {
        return $parsedChoices
    }

    return $parsedChoices
}

function Get-SlugifiedSpeciesId([string]$name) {
    $normalized = if ($name) { $name.ToLowerInvariant() } else { '' }
    $slug = [regex]::Replace($normalized, '[^a-z0-9]+', '-')
    $slug = $slug.Trim('-')
    return if ($slug) { $slug } else { 'species' }
}

function Get-CollectionUnlock([string]$extraText) {
    $label = Normalize-Text $extraText
    if (-not $label) {
        return $null
    }

    if ($collectionSpeciesMap.ContainsKey($label)) {
        return $collectionSpeciesMap[$label]
    }

    return @{
        speciesId = Get-SlugifiedSpeciesId $label
        speciesName = $label
    }
}

function Get-StableId([string]$prefix, [string]$value) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
        $hash = $md5.ComputeHash($bytes)
        $hex = -join ($hash | ForEach-Object { $_.ToString('x2') })
        return "$prefix-$($hex.Substring(0, 10))"
    }
    finally {
        $md5.Dispose()
    }
}

function Build-StoryId([string]$sheetName) {
    if ($sheetName -eq $prologueTitle) {
        return 'prologue'
    }
    return $sheetName
}

function Resolve-ExistingAssetPath([string]$directory, [string]$baseName) {
    $normalizedBaseName = (Normalize-Text $baseName).Replace('\', '/').Trim()
    if (-not $normalizedBaseName) {
        return ''
    }

    $directCandidate = Join-Path $directory $normalizedBaseName
    if ([System.IO.Path]::GetExtension($normalizedBaseName)) {
        if (Test-Path $directCandidate) {
            return $directCandidate
        }
        return ''
    }

    foreach ($extension in @('.webp', '.png')) {
        $assetPath = Join-Path $directory "$normalizedBaseName$extension"
        if (Test-Path $assetPath) {
            return $assetPath
        }
    }

    return ''
}

function Build-StoryAssetSrc([string]$sheetName, [string]$assetName) {
    $normalizedAssetName = (Normalize-Text $assetName).Replace('\', '/').Trim()
    if (-not $normalizedAssetName) {
        return ''
    }

    $assetDirectory = Join-Path $storyAssetRoot $sheetName
    $assetPath = Resolve-ExistingAssetPath $assetDirectory $normalizedAssetName
    if ($assetPath) {
        return "./Texture/story/$sheetName/$([System.IO.Path]::GetFileName($assetPath))"
    }

    if ([System.IO.Path]::GetExtension($normalizedAssetName)) {
        return "./Texture/story/$sheetName/$normalizedAssetName"
    }
    return "./Texture/story/$sheetName/$normalizedAssetName.png"
}

function Build-PortraitAssetSrc([string]$portraitLabel) {
    $normalizedPortraitLabel = (Normalize-Text $portraitLabel).Replace('\', '/').Trim()
    if (-not $normalizedPortraitLabel) {
        return ''
    }

    $portraitPath = Resolve-ExistingAssetPath $portraitDir $normalizedPortraitLabel
    if ($portraitPath) {
        return "./Texture/story/$portraitFolder/$([System.IO.Path]::GetFileName($portraitPath))"
    }

    if ([System.IO.Path]::GetExtension($normalizedPortraitLabel)) {
        return "./Texture/story/$portraitFolder/$normalizedPortraitLabel"
    }
    return "./Texture/story/$portraitFolder/$normalizedPortraitLabel.png"
}

function Build-BackgroundSrc([string]$sheetName, [string]$sceneName) {
    return Build-StoryAssetSrc $sheetName $sceneName
}

function Build-PortraitSrc([string]$portraitLabel) {
    return Build-PortraitAssetSrc $portraitLabel
}

function Test-CgScene([string]$sceneName) {
    return (Normalize-Text $sceneName).ToUpperInvariant().Contains('CG')
}

function Get-CharacterName([string]$speakerLabel) {
    $text = Normalize-Text $speakerLabel
    if (-not $text) {
        return ''
    }
    return $text.Split('-', 2)[0].Trim()
}

function Get-SupplementTypeValue($value) {
    $text = Normalize-Text $value
    if (-not $text) {
        return 0
    }

    $parsed = 0
    if ([int]::TryParse($text, [ref]$parsed)) {
        return $parsed
    }

    return 0
}

function Split-ExtraParts([string]$extraText) {
    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return @()
    }
    return @([regex]::Split($normalized, '[\s,闁挎稑琚埀顑跨盃闁?]+') | Where-Object { $_ })
}

function Get-TaggedExtraValue([string]$part, [string]$tag) {
    $normalizedPart = Normalize-Text $part
    if (-not $normalizedPart) {
        return ''
    }

    foreach ($separator in @('=', ':', $fullWidthColon)) {
        $prefix = "$tag$separator"
        if ($normalizedPart.StartsWith($prefix)) {
            return (Normalize-Text $normalizedPart.Substring($prefix.Length))
        }
    }

    return ''
}

function Get-StagedActorLabels([string]$extraText) {
    $parts = Split-ExtraParts $extraText
    if ($parts.Count -eq 0) {
        return @()
    }

    $leftLabel = ''
    $rightLabel = ''
    foreach ($part in $parts) {
        if (-not $leftLabel) {
            $leftLabel = Get-TaggedExtraValue $part $leftKeyword
            if ($leftLabel) {
                continue
            }
        }

        if (-not $rightLabel) {
            $rightLabel = Get-TaggedExtraValue $part $rightKeyword
        }
    }

    $labels = New-Object System.Collections.Generic.List[string]
    if ($leftLabel) {
        $labels.Add($leftLabel) | Out-Null
    }
    if ($rightLabel) {
        $labels.Add($rightLabel) | Out-Null
    }

    return $labels.ToArray()
}

function Get-EffectClass([string]$extraText) {
    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return ''
    }

    $parts = Split-ExtraParts $normalized
    if ($parts.Count -eq 0) {
        $parts = @($normalized)
    }

    foreach ($part in $parts) {
        $normalizedPart = $part.Replace(' ', '')
        if (-not ($shakeKeywords | Where-Object { $normalizedPart.Contains($_) })) {
            continue
        }

        if ($normalizedPart.Contains($charStrong)) {
            return 'shake-hard'
        }
        if ($normalizedPart.Contains($charSoft)) {
            return 'shake-soft'
        }
        return 'shake-medium'
    }

    return ''
}

function Get-CameraEffect([string]$extraText) {
    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return ''
    }

    $compact = $normalized.Replace(' ', '')
    if ($panRightToLeftKeywords | Where-Object { $compact.Contains($_) }) {
        return 'camera-pan-right-to-left'
    }

    if ($panLeftToRightKeywords | Where-Object { $compact.Contains($_) }) {
        return 'camera-pan-left-to-right'
    }

    $parts = Split-ExtraParts $normalized
    if ($parts.Count -eq 0) {
        $parts = @($normalized)
    }

    foreach ($part in $parts) {
        $normalizedPart = $part.Replace(' ', '')
        if (-not ($zoomKeywords | Where-Object { $normalizedPart.Contains($_) })) {
            continue
        }

        if ($normalizedPart.Contains($charStrong)) {
            return 'camera-zoom-in-strong'
        }
        if ($normalizedPart.Contains($charSoft)) {
            return 'camera-zoom-in-soft'
        }
        return 'camera-zoom-in'
    }

    return ''
}

function Get-BackgroundMode([string]$extraText, [string]$sceneName = '') {
    $normalizedSceneName = (Normalize-Text $sceneName).Replace(' ', '').Trim().ToLowerInvariant()
    if ($backgroundMainValues -contains $normalizedSceneName) {
        return 'zoo-home'
    }

    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return 'story'
    }

    $parts = Split-ExtraParts $normalized
    if ($parts.Count -eq 0) {
        $parts = @($normalized)
    }

    foreach ($part in $parts) {
        $normalizedPart = $part.Replace(' ', '').Trim()
        if ($backgroundMainValues -contains $normalizedPart.ToLowerInvariant()) {
            return 'zoo-home'
        }

        if (-not $normalizedPart.StartsWith($backgroundKeyword)) {
            continue
        }

        $backgroundValue = $normalizedPart.Substring($backgroundKeyword.Length)
        if ($backgroundValue.Length -gt 0 -and @('=', ':', $fullWidthColon) -contains $backgroundValue.Substring(0, 1)) {
            $backgroundValue = $backgroundValue.Substring(1)
        }

        if ($backgroundMainValues -contains $backgroundValue.Trim().ToLowerInvariant()) {
            return 'zoo-home'
        }
    }

    return 'story'
}

function Get-DualDialogueActorLabels([string]$extraText) {
    $taggedLabels = @(Get-StagedActorLabels $extraText)
    if ($taggedLabels.Count -gt 0) {
        return $taggedLabels
    }

    $parts = Split-ExtraParts $extraText
    if ($parts.Count -le 0) {
        return @()
    }

    return @($parts | ForEach-Object { Normalize-Text $_ } | Where-Object { $_ } | Select-Object -First 2)
}

function Resolve-ItemRewardImageSrc([string]$sheetName, [string]$rawImageValue) {
    $normalized = (Normalize-Text $rawImageValue).Replace('\', '/')
    if (-not $normalized) {
        return ''
    }

    if ($normalized -match '^(?:https?:)?//') {
        return $normalized
    }

    if ($normalized.StartsWith('./') -or $normalized.StartsWith('../') -or $normalized.StartsWith('/')) {
        return $normalized
    }

    $hasExtension = $normalized -match '\.[A-Za-z0-9]+$'
    if ($normalized.Contains('/')) {
        return $normalized
    }

    if ($hasExtension) {
        return "./Texture/story/$sheetName/$normalized"
    }
    return Build-StoryAssetSrc $sheetName $normalized
}

function Get-ItemRewardTitle([string]$rawImageValue) {
    $normalized = (Normalize-Text $rawImageValue).Replace('\', '/')
    if (-not $normalized) {
        return ''
    }

    $fileName = $normalized.Split('/')[-1]
    if ($fileName -match '\.[A-Za-z0-9]+$') {
        return [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    }

    return $fileName
}

<#
function Get-ItemReward([string]$sheetName, [string]$extraText, [System.Collections.Generic.HashSet[string]]$warnings) {
    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return $null
    }
    $parts = @([regex]::Split($normalized, '\s*[,閿涘畟\s*') | Where-Object { $_ -ne '' })
    $parts = @([regex]::Split($normalized, '\s*[,闁挎稑鐣焅s*') | Where-Object { $_ -ne '' })
    if ($parts.Count -le 0) {
        return $null
    }

    $rawImageValue = Normalize-Text $parts[0]
    if (-not $rawImageValue) {
        return $null
    }

    $description = ''
        $description = (($parts | Select-Object -Skip 1) -join '閿?).Trim()
        $description = (($parts | Select-Object -Skip 1) -join '闁?).Trim()
    }

    $imageSrc = Resolve-ItemRewardImageSrc $sheetName $rawImageValue
    $title = Get-ItemRewardTitle $rawImageValue

    if ($imageSrc -and $imageSrc.StartsWith('./Texture/story/')) {
        $relativePath = $imageSrc.Substring(2).Replace('/', '\')
        $imagePath = Join-Path $rootDir $relativePath
        if (-not (Test-Path $imagePath)) {
            [void]$warnings.Add("Missing item reward asset: $imagePath")
        }
    }

    return [ordered]@{
        imageSrc = $imageSrc
        title = $title
        text = $description
        buttonLabel = ([string]([char]0x83B7) + [char]0x5F97)
    }
}
#>

function Get-ItemRewardSafe([string]$sheetName, [string]$extraText, [System.Collections.Generic.HashSet[string]]$warnings) {
    $normalized = Normalize-Text $extraText
    if (-not $normalized) {
        return $null
    }

    $parts = @(
        $normalized.Replace($fullWidthComma, ',').Split(',') `
            | ForEach-Object { Normalize-Text $_ } `
            | Where-Object { $_ -ne '' }
    )
    if ($parts.Count -le 0) {
        return $null
    }

    $rawImageValue = Normalize-Text $parts[0]
    if (-not $rawImageValue) {
        return $null
    }

    $description = ''
    if ($parts.Count -gt 1) {
        $description = (($parts | Select-Object -Skip 1) -join $fullWidthComma).Trim()
    }

    $imageSrc = Resolve-ItemRewardImageSrc $sheetName $rawImageValue
    $title = Get-ItemRewardTitle $rawImageValue

    if ($imageSrc -and $imageSrc.StartsWith('./Texture/story/')) {
        $relativePath = $imageSrc.Substring(2).Replace('/', '\')
        $imagePath = Join-Path $rootDir $relativePath
        if (-not (Test-Path $imagePath)) {
            [void]$warnings.Add("Missing item reward asset: $imagePath")
        }
    }

    return [ordered]@{
        imageSrc = $imageSrc
        title = $title
        text = $description
        buttonLabel = ([string]([char]0x83B7) + [char]0x5F97)
    }
}

function Get-ConfiguredEffectClass([int]$supplementType, [string]$extraText) {
    if ($supplementType -eq $supplementTypeShake) {
        $derived = Get-EffectClass $extraText
        if ($derived) {
            return $derived
        }
        return 'shake-medium'
    }

    return ''
}

function Get-ConfiguredCameraEffect([int]$supplementType, [string]$extraText) {
    if ($supplementType -eq $supplementTypePanRightToLeft) {
        return 'camera-pan-right-to-left'
    }

    if ($supplementType -eq $supplementTypeZoomIn) {
        $derived = Get-CameraEffect $extraText
        if ($derived) {
            return $derived
        }
        return 'camera-zoom-in'
    }

    return ''
}

function Get-ConfiguredBackgroundMode([int]$supplementType, [string]$extraText, [string]$sceneName = '') {
    if ($supplementType -eq $supplementTypeZooHome) {
        return 'zoo-home'
    }

    return Get-BackgroundMode $extraText $sceneName
}

function Resolve-CleaningBackgroundSrc([string]$sheetName, [string]$rawValue) {
    $normalized = (Normalize-Text $rawValue).Replace('\', '/')
    if (-not $normalized) {
        return ''
    }

    if ($normalized -match '^(?:https?:)?//') {
        return $normalized
    }

    if ($normalized.StartsWith('./') -or $normalized.StartsWith('../') -or $normalized.StartsWith('/')) {
        return $normalized
    }

    if ($normalized -match '^Texture/') {
        return "./$normalized"
    }

    if ($normalized -match '^UI_Zoo_MainBG(?:\.[A-Za-z0-9]+)?$') {
        $zooAssetPath = Resolve-ExistingAssetPath (Join-Path $rootDir 'Texture\ZOO') $normalized
        if ($zooAssetPath) {
            return "./Texture/ZOO/$([System.IO.Path]::GetFileName($zooAssetPath))"
        }
        $fileName = if ($normalized -match '\.[A-Za-z0-9]+$') { $normalized } else { "$normalized.png" }
        return "./Texture/ZOO/$fileName"
    }

    $hasExtension = $normalized -match '\.[A-Za-z0-9]+$'
    if ($normalized.Contains('/')) {
        return $normalized
    }

    if ($hasExtension) {
        return "./Texture/story/$sheetName/$normalized"
    }
    return Build-StoryAssetSrc $sheetName $normalized
}

function Get-DerivedHalfDirtyBackground([string]$dirtyBackground) {
    $normalized = Normalize-Text $dirtyBackground
    if (-not $normalized) {
        return ''
    }

    $dirtyChar = [string][char]0x810F
    $halfDirty = ([string][char]0x4E00) + [char]0x534A + [char]0x810F
    $dashDirty = "-$dirtyChar"
    $dashHalfDirty = "-$halfDirty"

    if ($normalized.Contains($halfDirty)) {
        return ''
    }

    if ($normalized.Contains($dashDirty)) {
        return $normalized.Replace($dashDirty, $dashHalfDirty)
    }

    if ($normalized.Contains($dirtyChar)) {
        return $normalized.Replace($dirtyChar, $halfDirty)
    }

    return ''
}

function Add-AssetWarning([string]$src, [System.Collections.Generic.HashSet[string]]$warnings) {
    $normalized = Normalize-Text $src
    if (-not $normalized) {
        return
    }

    if ($normalized.StartsWith('./')) {
        $candidatePath = Join-Path $rootDir ($normalized.Substring(2).Replace('/', '\'))
        if (-not (Test-Path $candidatePath)) {
            [void]$warnings.Add("Missing interaction asset: $candidatePath")
        }
    }
}

function Get-CleaningInteraction([string]$sheetName, [string]$backgroundSrc, [string]$extraText, [System.Collections.Generic.HashSet[string]]$warnings) {
    $normalized = Normalize-Text $extraText
    $parts = if ($normalized) {
        @(
            $normalized.Replace($fullWidthComma, ',').Split(',') | ForEach-Object { Normalize-Text $_ } | Where-Object { $_ -ne '' }
        )
    } else {
        @()
    }

    if ($parts.Count -ge 3) {
        $dirtyBackground = Resolve-CleaningBackgroundSrc $sheetName $parts[0]
        $midBackground = Resolve-CleaningBackgroundSrc $sheetName $parts[1]
        $cleanBackground = Resolve-CleaningBackgroundSrc $sheetName $parts[2]
        $prompt1 = if ($parts.Count -ge 4) { $parts[3] } else { '' }
        $prompt2 = if ($parts.Count -ge 5) { $parts[4] } else { '' }
    } else {
        $dirtyBackground = Normalize-Text $backgroundSrc
        $midBackground = Get-DerivedHalfDirtyBackground $dirtyBackground
        $cleanBackground = if ($midBackground) { '' } else { Resolve-CleaningBackgroundSrc $sheetName 'UI_Zoo_MainBG' }
        $prompt1 = ''
        $prompt2 = ''
    }

    Add-AssetWarning $dirtyBackground $warnings
    Add-AssetWarning $midBackground $warnings
    Add-AssetWarning $cleanBackground $warnings

    return [ordered]@{
        type = 'cleaning'
        dirtyBackground = $dirtyBackground
        midBackground = $midBackground
        cleanBackground = $cleanBackground
        prompts = @($prompt1, $prompt2)
        completionText = ''
        buttonLabel = ''
    }
}

function Get-DerivedTitle([string]$indexValue, [string]$speakerLabel, [string]$text, [string]$sceneName) {
    if ($sceneName -and (Test-CgScene $sceneName)) {
        return $sceneName
    }

    $trimmedText = Normalize-Text $text
    if ($trimmedText) {
        if ($trimmedText.Length -gt 12) {
            return $trimmedText.Substring(0, 12) + '...'
        }
        return $trimmedText
    }

    $speaker = Normalize-Text $speakerLabel
    if ($speaker -and $speaker -ne $narrationSpeaker) {
        return Get-CharacterName $speaker
    }

    if ($sceneName) {
        return $sceneName
    }

    $order = Normalize-Text $indexValue
    if (-not $order) {
        $order = '?'
    }
    return "Beat $order"
}

function Ensure-Character($characters, [string]$speakerLabel, [System.Collections.Generic.HashSet[string]]$warnings) {
    $characterName = Get-CharacterName $speakerLabel
    $portraitLabel = Normalize-Text $speakerLabel

    if (-not $characters.Contains($characterName)) {
        $characters[$characterName] = [ordered]@{
            id = Get-StableId 'character' $characterName
            name = $characterName
            portraitsByLabel = [ordered]@{}
        }
    }

    $character = $characters[$characterName]
    if (-not $character.portraitsByLabel.Contains($portraitLabel)) {
        $portraitSrc = Build-PortraitSrc $portraitLabel
        $portraitPath = Join-Path $rootDir ($portraitSrc.Substring(2).Replace('/', '\'))
        if (-not (Test-Path $portraitPath)) {
            [void]$warnings.Add("Missing portrait asset: $portraitPath")
        }

        $character.portraitsByLabel[$portraitLabel] = [ordered]@{
            id = Get-StableId 'portrait' $portraitLabel
            label = $portraitLabel
            src = $portraitSrc
        }
    }

    return @($character.id, $character.portraitsByLabel[$portraitLabel].id)
}

function Get-EntryText($zip, [string]$entryName) {
    $entry = $zip.GetEntry($entryName)
    if ($null -eq $entry) {
        return ''
    }

    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
        $stream.Dispose()
    }
}

function Get-XmlTextNodes($node) {
    return @($node.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.InnerText })
}

function Get-SharedStrings($zip) {
    $xmlText = Get-EntryText $zip 'xl/sharedStrings.xml'
    if (-not $xmlText) {
        return @()
    }

    $xml = [xml]$xmlText
    $items = @()
    foreach ($si in $xml.SelectNodes("//*[local-name()='si']")) {
        $items += ((Get-XmlTextNodes $si) -join '')
    }
    return $items
}

function Get-WorkbookSheets($zip) {
    $workbookXml = [xml](Get-EntryText $zip 'xl/workbook.xml')
    $relsXml = [xml](Get-EntryText $zip 'xl/_rels/workbook.xml.rels')

    $relMap = @{}
    foreach ($rel in $relsXml.SelectNodes("//*[local-name()='Relationship']")) {
        $relMap[$rel.Id] = $rel.Target
    }

    $sheets = @()
    foreach ($sheet in $workbookXml.SelectNodes("//*[local-name()='sheet']")) {
        $relId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        $target = if ($relMap.ContainsKey($relId)) { $relMap[$relId] } else { '' }
        if (-not $target) {
            continue
        }

        $normalizedTarget = $target.Replace('\', '/')
        if (-not $normalizedTarget.StartsWith('/')) {
            $normalizedTarget = "xl/$normalizedTarget"
        } else {
            $normalizedTarget = $normalizedTarget.TrimStart('/')
        }

        $sheets += [ordered]@{
            name = [string]$sheet.name
            path = $normalizedTarget
        }
    }

    return $sheets
}

function Get-ColumnIndex([string]$cellRef) {
    $letters = ''
    foreach ($character in $cellRef.ToCharArray()) {
        if ([char]::IsLetter($character)) {
            $letters += $character
        } else {
            break
        }
    }

    $index = 0
    foreach ($character in $letters.ToUpperInvariant().ToCharArray()) {
        $index = ($index * 26) + ([int][char]$character - [int][char]'A' + 1)
    }
    return $index
}

function Get-CellValue($cell, $sharedStrings) {
    $type = $cell.GetAttribute('t')
    if ($type -eq 'inlineStr') {
        return ((Get-XmlTextNodes $cell) -join '')
    }

    $valueNode = $cell.SelectSingleNode("./*[local-name()='v']")
    $value = if ($valueNode) { $valueNode.InnerText } else { '' }

    if ($type -eq 's') {
        $sharedIndex = 0
        if ([int]::TryParse($value, [ref]$sharedIndex) -and $sharedIndex -ge 0 -and $sharedIndex -lt $sharedStrings.Count) {
            return $sharedStrings[$sharedIndex]
        }
        return ''
    }

    return Normalize-Text $value
}

function Get-SheetRows($zip, [string]$sheetPath, $sharedStrings) {
    $xmlText = Get-EntryText $zip $sheetPath
    if (-not $xmlText) {
        return @{}
    }

    $xml = [xml]$xmlText
    $rows = @{}
    foreach ($rowNode in $xml.SelectNodes("//*[local-name()='sheetData']/*[local-name()='row']")) {
        $rowIndex = [int]$rowNode.r
        $cells = @{}
        foreach ($cell in $rowNode.SelectNodes("./*[local-name()='c']")) {
            $columnIndex = Get-ColumnIndex $cell.r
            $cells[$columnIndex] = Get-CellValue $cell $sharedStrings
        }
        $rows[$rowIndex] = $cells
    }

    return $rows
}

function Get-RowCellText($rows, [int]$rowIndex, [int]$columnIndex) {
    if (-not $rows.ContainsKey($rowIndex)) {
        return ''
    }
    $cells = $rows[$rowIndex]
    if (-not $cells.ContainsKey($columnIndex)) {
        return ''
    }
    return Normalize-Text $cells[$columnIndex]
}

function Convert-SheetRows([string]$sheetName, $rows) {
    if (-not $rows.ContainsKey(1)) {
        return $null
    }

    $headerRow = $rows[1]
    $headerIndex = @{}
    foreach ($columnIndex in $headerRow.Keys) {
        $headerName = Normalize-Text $headerRow[$columnIndex]
        if ($headerName) {
            $headerIndex[$headerName] = [int]$columnIndex
        }
    }

    if ($headerIndex.Count -le 0) {
        return $null
    }

    $characters = [ordered]@{}
    $beats = New-Object System.Collections.Generic.List[object]
    $warnings = New-Object 'System.Collections.Generic.HashSet[string]'
    $currentScene = ''
    $rowIndexes = @($rows.Keys | Where-Object { $_ -gt 1 } | Sort-Object)

    foreach ($rowIndex in $rowIndexes) {
        $orderValue = if ($headerIndex.ContainsKey($headerOrder)) { Get-RowCellText $rows $rowIndex $headerIndex[$headerOrder] } else { '' }
        $speakerLabel = if ($headerIndex.ContainsKey($headerSpeaker)) { Get-RowCellText $rows $rowIndex $headerIndex[$headerSpeaker] } else { '' }
        $text = if ($headerIndex.ContainsKey($headerText)) { Get-RowCellText $rows $rowIndex $headerIndex[$headerText] } else { '' }
        $sceneName = if ($headerIndex.ContainsKey($headerScene)) { Get-RowCellText $rows $rowIndex $headerIndex[$headerScene] } else { '' }
        $extra = if ($headerIndex.ContainsKey($headerExtra)) { Get-RowCellText $rows $rowIndex $headerIndex[$headerExtra] } else { '' }
        $supplementType = if ($headerIndex.ContainsKey($headerExtraType)) { Get-SupplementTypeValue (Get-RowCellText $rows $rowIndex $headerIndex[$headerExtraType]) } else { 0 }

        if ($sceneName) {
            $currentScene = $sceneName
        } elseif ($currentScene) {
            $sceneName = $currentScene
        }

        if (-not ($speakerLabel -or $text -or $sceneName -or $extra -or $supplementType)) {
            continue
        }

        $backgroundMode = Get-ConfiguredBackgroundMode $supplementType $extra $sceneName
        $backgroundSrc = if ($backgroundMode -eq 'zoo-home') { '' } elseif ($sceneName) { Build-BackgroundSrc $sheetName $sceneName } else { '' }
        if ($backgroundSrc) {
            $backgroundPath = Join-Path $rootDir ($backgroundSrc.Substring(2).Replace('/', '\'))
            if (-not (Test-Path $backgroundPath)) {
                [void]$warnings.Add("Missing background asset: $backgroundPath")
            }
        }

        $presentation = if ($sceneName -and (Test-CgScene $sceneName)) { $illustrationMode } else { $standardMode }
        $effectClass = if ($supplementType -gt 0) { Get-ConfiguredEffectClass $supplementType $extra } else { Get-EffectClass $extra }
        $cameraEffect = if ($supplementType -gt 0) { Get-ConfiguredCameraEffect $supplementType $extra } else { Get-CameraEffect $extra }
        $itemReward = if ($supplementType -eq $supplementTypeItemReward) { Get-ItemRewardSafe $sheetName $extra $warnings } else { $null }
        $interaction = if ($supplementType -eq $supplementTypeInteraction) { Get-CleaningInteraction $sheetName $backgroundSrc $extra $warnings } else { $null }
        $collectionUnlock = if ($supplementType -eq $supplementTypeCollection) { Get-CollectionUnlock $extra } else { $null }

        if (-not $speakerLabel -and -not $text) {
            if (-not $sceneName -and -not $effectClass -and -not $cameraEffect -and $backgroundMode -eq 'story' -and $null -eq $itemReward -and $null -eq $interaction) {
                continue
            }

            $beats.Add([ordered]@{
                id = Get-StableId 'beat' "$sheetName-$rowIndex"
                title = Get-DerivedTitle $orderValue $speakerLabel $text $sceneName
                background = $backgroundSrc
                type = 'narration'
                speakerName = ''
                text = ''
                actorCount = 0
                actors = @()
                presentation = if ($sceneName -and $presentation -ne $illustrationMode) { $transitionMode } else { $presentation }
                effectClass = $effectClass
                cameraEffect = $cameraEffect
                backgroundMode = $backgroundMode
                itemReward = $itemReward
                interaction = $interaction
                choices = Get-OptionChoices $supplementType $extra
                collectionUnlock = $collectionUnlock
            }) | Out-Null
            continue
        }

        $isDialogue = [bool]($speakerLabel -and $speakerLabel -ne $narrationSpeaker)
        $beat = [ordered]@{
            id = Get-StableId 'beat' "$sheetName-$rowIndex"
            title = Get-DerivedTitle $orderValue $speakerLabel $text $sceneName
            background = $backgroundSrc
            type = if ($isDialogue) { 'dialogue' } else { 'narration' }
            speakerName = if ($isDialogue) { Get-CharacterName $speakerLabel } else { '' }
            text = $text
            actorCount = 0
            actors = @()
            presentation = $presentation
            effectClass = $effectClass
            cameraEffect = $cameraEffect
            backgroundMode = $backgroundMode
            itemReward = $itemReward
            interaction = $interaction
            choices = Get-OptionChoices $supplementType $extra
            collectionUnlock = $collectionUnlock
        }

        if ($isDialogue) {
            $actorLabels = if ($supplementType -eq $supplementTypeDualDialogue) {
                @(Get-DualDialogueActorLabels $extra)
            } elseif ($supplementType -gt 0) {
                @()
            } else {
                @(Get-StagedActorLabels $extra)
            }
            if ($actorLabels.Count -le 0) {
                $actorLabels = @($speakerLabel)
            }

            $resolvedActors = New-Object System.Collections.Generic.List[object]
            foreach ($actorLabel in ($actorLabels | Select-Object -First 2)) {
                $normalizedActorLabel = Normalize-Text $actorLabel
                if (-not $normalizedActorLabel) {
                    continue
                }

                $characterIds = Ensure-Character $characters $normalizedActorLabel $warnings
                $resolvedActors.Add([ordered]@{
                    characterId = $characterIds[0]
                    portraitId = $characterIds[1]
                }) | Out-Null
            }

            if ($resolvedActors.Count -le 0) {
                $characterIds = Ensure-Character $characters $speakerLabel $warnings
                $resolvedActors.Add([ordered]@{
                    characterId = $characterIds[0]
                    portraitId = $characterIds[1]
                }) | Out-Null
            }

            $beat.actorCount = $resolvedActors.Count
            $beat.actors = $resolvedActors.ToArray()
        }

        $beats.Add($beat) | Out-Null
    }

    if ($beats.Count -le 0) {
        return $null
    }

    $characterList = @()
    foreach ($character in $characters.Values) {
        $portraits = @()
        foreach ($portrait in $character.portraitsByLabel.Values) {
            $portraits += [ordered]@{
                id = $portrait.id
                label = $portrait.label
                src = $portrait.src
            }
        }

        $characterList += [ordered]@{
            id = $character.id
            name = $character.name
            portraits = $portraits
        }
    }

    $storyTitle = [string]$sheetName
    $storyId = if ($storyTitle -eq $prologueTitle) { 'prologue' } else { $storyTitle }
    $stage = @{}
    $stage['maxActorsPerBeat'] = 2
    $stage['singleActorPosition'] = 'center'
    $stage['doubleActorPositions'] = @('left', 'right')

    $project = @{}
    $project['version'] = 1
    $project['storyId'] = $storyId
    $project['title'] = $storyTitle
    $project['stage'] = $stage
    $project['characters'] = $characterList
    $project['beats'] = $beats.ToArray()
    $warningList = @($warnings | Sort-Object)

    $result = @{}
    $result['project'] = $project
    $result['warnings'] = $warningList
    return $result
}

function Import-Workbook([string]$excelPath) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($excelPath)
    try {
        $sharedStrings = Get-SharedStrings $zip
        $stories = [ordered]@{}
        $allWarnings = New-Object 'System.Collections.Generic.HashSet[string]'
        $beatCount = 0

        foreach ($sheet in (Get-WorkbookSheets $zip)) {
            $rows = Get-SheetRows $zip $sheet.path $sharedStrings
            $result = Convert-SheetRows $sheet.name $rows
            if ($null -eq $result) {
                continue
            }

            foreach ($warning in $result.warnings) {
                [void]$allWarnings.Add($warning)
            }

            $project = $result.project
            $stories[$project.storyId] = $project
            $beatCount += @($project.beats).Count
        }

        return [ordered]@{
            stories = $stories
            warnings = @($allWarnings | Sort-Object)
            storyCount = $stories.Count
            beatCount = $beatCount
        }
    }
    finally {
        $zip.Dispose()
    }
}

function Write-GeneratedScript([string]$outputPath, $result, [string]$excelPath) {
    $outputDir = Split-Path -Parent $outputPath
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }

    $payload = $result.stories | ConvertTo-Json -Depth 100
    $meta = [ordered]@{
        source = [System.IO.Path]::GetFileName($excelPath)
        generatedAt = [DateTimeOffset]::Now.ToString('yyyy-MM-ddTHH:mm:sszzz')
        storyCount = $result.storyCount
        beatCount = $result.beatCount
        warnings = @($result.warnings)
    } | ConvertTo-Json -Depth 10

    $scriptText = @"
(function initGeneratedStoryData(globalScope) {
    'use strict';

    globalScope.WynneImportedStories = $payload;
    globalScope.WynneImportedStoryMeta = $meta;
}(window));
"@

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($outputPath, $scriptText, $utf8NoBom)
}

$excelPath = $defaultExcelPath
$outputPath = $defaultOutputPath

if (-not (Test-Path $excelPath)) {
    throw "Workbook not found: $excelPath"
}

$result = Import-Workbook $excelPath
Write-GeneratedScript $outputPath $result $excelPath

Write-Output "Imported $($result.storyCount) stories, $($result.beatCount) beats."
Write-Output "Generated: $outputPath"
if ($result.warnings.Count -gt 0) {
    Write-Output 'Missing assets:'
    foreach ($warning in $result.warnings) {
        Write-Output "- $warning"
    }
}

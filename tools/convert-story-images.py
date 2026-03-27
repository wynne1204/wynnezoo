"""
Convert story PNG images to WebP format for faster loading.
- Background images: max 1440px wide, quality 82
- Portrait images: max 900px wide, quality 85
- Keeps original PNGs as fallback
"""
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

STORY_ROOT = Path(__file__).resolve().parent.parent / "Texture" / "story"
PORTRAIT_FOLDER = "立绘"

# Config per folder type
PORTRAIT_MAX_WIDTH = 1080
PORTRAIT_QUALITY = 88
BG_MAX_WIDTH = 1920
BG_QUALITY = 85

def convert_image(png_path, max_width, quality):
    webp_path = png_path.with_suffix(".webp")
    if webp_path.exists() and webp_path.stat().st_mtime >= png_path.stat().st_mtime:
        return None  # already up to date

    img = Image.open(png_path)
    w, h = img.size

    # Resize if wider than max
    if w > max_width:
        ratio = max_width / w
        new_w = max_width
        new_h = int(h * ratio)
        img = img.resize((new_w, new_h), Image.LANCZOS)

    # Save WebP
    img.save(webp_path, "WEBP", quality=quality, method=4)

    old_kb = png_path.stat().st_size / 1024
    new_kb = webp_path.stat().st_size / 1024
    saving = (1 - new_kb / old_kb) * 100 if old_kb > 0 else 0
    return (png_path.name, old_kb, new_kb, saving)

def main():
    if not STORY_ROOT.exists():
        print(f"Story root not found: {STORY_ROOT}")
        sys.exit(1)

    total_saved = 0
    results = []

    for folder in sorted(STORY_ROOT.iterdir()):
        if not folder.is_dir():
            continue

        is_portrait = folder.name == PORTRAIT_FOLDER
        max_w = PORTRAIT_MAX_WIDTH if is_portrait else BG_MAX_WIDTH
        quality = PORTRAIT_QUALITY if is_portrait else BG_QUALITY

        for png in sorted(folder.glob("*.png")):
            result = convert_image(png, max_w, quality)
            if result:
                name, old_kb, new_kb, saving = result
                results.append(result)
                total_saved += (old_kb - new_kb)
                print(f"  {name}: {old_kb:.0f}KB -> {new_kb:.0f}KB ({saving:.0f}% smaller)")

    if results:
        print(f"\nConverted {len(results)} images, saved {total_saved:.0f}KB total ({total_saved/1024:.1f}MB)")
    else:
        print("All WebP files are up to date.")

if __name__ == "__main__":
    main()

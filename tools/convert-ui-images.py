"""
Convert UI PNG images to WebP format.
- Large backgrounds (>500KB): max 1536px wide, quality 85
- Smaller assets: keep original size, quality 88
"""
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

UI_ROOT = Path(__file__).resolve().parent.parent / "Texture" / "UI"

LARGE_THRESHOLD_KB = 500
LARGE_MAX_WIDTH = 1536
LARGE_QUALITY = 85
SMALL_QUALITY = 88

def convert_image(png_path):
    webp_path = png_path.with_suffix(".webp")
    if webp_path.exists() and webp_path.stat().st_mtime >= png_path.stat().st_mtime:
        return None

    img = Image.open(png_path)
    w, h = img.size
    size_kb = png_path.stat().st_size / 1024
    is_large = size_kb > LARGE_THRESHOLD_KB

    if is_large and w > LARGE_MAX_WIDTH:
        ratio = LARGE_MAX_WIDTH / w
        img = img.resize((LARGE_MAX_WIDTH, int(h * ratio)), Image.LANCZOS)

    quality = LARGE_QUALITY if is_large else SMALL_QUALITY
    img.save(webp_path, "WEBP", quality=quality, method=4)

    new_kb = webp_path.stat().st_size / 1024
    saving = (1 - new_kb / size_kb) * 100 if size_kb > 0 else 0
    return (png_path.name, size_kb, new_kb, saving)

def main():
    if not UI_ROOT.exists():
        print(f"UI root not found: {UI_ROOT}")
        sys.exit(1)

    total_saved = 0
    results = []

    for png in sorted(UI_ROOT.rglob("*.png")):
        result = convert_image(png)
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

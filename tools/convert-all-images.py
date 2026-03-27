"""
Convert all game PNG images to WebP format.
Scans Texture/ directory recursively.
- Images > 500KB or > 1200px wide: resize to max 1920px, quality 85
- Smaller images: keep original size, quality 88
"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent / "Texture"
LARGE_KB = 500
MAX_WIDTH = 1920
LARGE_QUALITY = 85
SMALL_QUALITY = 88

# Skip story folder (handled by convert-story-images.py with its own settings)
SKIP_FOLDERS = {"story"}

def convert(png_path):
    webp_path = png_path.with_suffix(".webp")
    if webp_path.exists() and webp_path.stat().st_mtime >= png_path.stat().st_mtime:
        return None

    img = Image.open(png_path)
    w, h = img.size
    size_kb = png_path.stat().st_size / 1024
    is_large = size_kb > LARGE_KB or w > 1200

    if is_large and w > MAX_WIDTH:
        ratio = MAX_WIDTH / w
        img = img.resize((MAX_WIDTH, int(h * ratio)), Image.LANCZOS)

    quality = LARGE_QUALITY if is_large else SMALL_QUALITY
    img.save(webp_path, "WEBP", quality=quality, method=4)

    new_kb = webp_path.stat().st_size / 1024
    saving = (1 - new_kb / size_kb) * 100 if size_kb > 0 else 0
    return (str(png_path.relative_to(ROOT)), size_kb, new_kb, saving)

def main():
    if not ROOT.exists():
        print(f"Texture root not found: {ROOT}")
        sys.exit(1)

    total_saved = 0
    results = []

    for png in sorted(ROOT.rglob("*.png")):
        # Skip story folder
        rel = png.relative_to(ROOT)
        if rel.parts and rel.parts[0] in SKIP_FOLDERS:
            continue
        result = convert(png)
        if result:
            name, old_kb, new_kb, saving = result
            results.append(result)
            total_saved += (old_kb - new_kb)
            print(f"  {name}: {old_kb:.0f}KB -> {new_kb:.0f}KB ({saving:.0f}% smaller)")

    if results:
        print(f"\nConverted {len(results)} images, saved {total_saved:.0f}KB ({total_saved/1024:.1f}MB)")
    else:
        print("All WebP files are up to date.")

if __name__ == "__main__":
    main()

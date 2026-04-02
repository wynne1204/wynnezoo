---
inclusion: auto
---

# Asset Conventions

## Image Format

- All image assets (backgrounds, icons, textures, etc.) MUST use WebP format for production.
- When adding new image resources, always convert PNG/JPG to WebP before referencing in code.
- Figma-imported assets follow the same rule: after export/download, convert them to `.webp` before committing, and reference the `.webp` file in HTML/CSS/JS.
- Recommended conversion settings:
  - Background images: max 1920px wide, quality 85
  - UI elements/icons: quality 88
  - Use `Pillow` (Python) or equivalent tool for conversion
- Keep original PNG files as fallback, but reference `.webp` in CSS/HTML.
- The project has an existing conversion tool at `tools/convert-story-images.py` that can be referenced for conversion patterns.

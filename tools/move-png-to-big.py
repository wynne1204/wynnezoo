#!/usr/bin/env python3
"""
扫描 Texture 目录，找出同时有 .webp 和 .png 的同名图片，
将 .png 移动到 TextureBig 对应子目录中，保持原目录结构。
"""
import os
import shutil

SRC = "Texture"
DST = "TextureBig"

for root, dirs, files in os.walk(SRC):
    png_files = {f for f in files if f.lower().endswith(".png")}
    webp_files = {f for f in files if f.lower().endswith(".webp")}

    for png in png_files:
        name = os.path.splitext(png)[0]
        webp_name = name + ".webp"
        if webp_name in webp_files:
            rel = os.path.relpath(root, SRC)
            dst_dir = os.path.join(DST, rel)
            os.makedirs(dst_dir, exist_ok=True)
            src_path = os.path.join(root, png)
            dst_path = os.path.join(dst_dir, png)
            shutil.move(src_path, dst_path)
            print(f"Moved: {src_path} -> {dst_path}")

print("Done!")

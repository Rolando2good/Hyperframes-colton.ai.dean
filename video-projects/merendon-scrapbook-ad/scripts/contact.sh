#!/usr/bin/env bash
# contact.sh out.png img1 img2 ... -> labelled grid (5 per row)
out=$1; shift
python3 - "$out" "$@" <<'PY'
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W, H = 360, 640
cols = min(5, len(files)); rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * (H + 24)), 'white')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((W, H))
    x, y = (i % cols) * W, (i // cols) * (H + 24)
    sheet.paste(im, (x, y + 24))
    ImageDraw.Draw(sheet).text((x + 6, y + 6), f.split('/')[-1], fill='black')
sheet.save(out)
PY

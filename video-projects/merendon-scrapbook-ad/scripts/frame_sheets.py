"""Every-frame review helper: renders/frames/*.jpg -> labelled 8x5 contact sheets."""
import glob, os
from PIL import Image, ImageDraw

files = sorted(glob.glob('renders/frames/*.jpg'))
os.makedirs('renders/sheets', exist_ok=True)
per, cols, W, H = 40, 8, 180, 320
for s in range(0, len(files), per):
    chunk = files[s:s + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * (H + 14)), 'white')
    for i, f in enumerate(chunk):
        x, y = (i % cols) * W, (i // cols) * (H + 14)
        sheet.paste(Image.open(f), (x, y + 14))
        n = s + i
        ImageDraw.Draw(sheet).text((x + 4, y + 1), f'{n}  {n / 30:.2f}s', fill='black')
    sheet.save(f'renders/sheets/s{s // per:02d}.jpg', quality=88)
print(len(files), 'frames ->', len(glob.glob('renders/sheets/*.jpg')), 'sheets')

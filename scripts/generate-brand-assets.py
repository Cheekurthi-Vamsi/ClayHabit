"""
Builds ClayHabbit's app icons, splash and in-app artwork from the source art in
`images/` (the rabbit logo and the sign-in preview).

    pip install pillow
    python scripts/generate-brand-assets.py

Outputs into assets/images/:
  icon.png                      1024² full-bleed gradient + rabbit (iOS / legacy Android)
  android-icon-foreground.png   512² rabbit on transparent, inside the adaptive-icon safe zone
  android-icon-background.png   512² violet → blue gradient
  android-icon-monochrome.png   432² white rabbit silhouette (themed icons)
  logo-mark.png                 512² rounded-square logo with transparent corners (in-app mark)
  splash-icon.png               512² same as logo-mark, for the splash screen
  favicon.png                   48²
  auth-illustration.png         the rabbit-on-a-hill scene, edges feathered into the page colour
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC_LOGO = ROOT / "images" / "app logo.png"
SRC_AUTH = ROOT / "images" / "Auth Preview.png"
OUT = ROOT / "assets" / "images"

# Measured on the source logo: the rounded square and its corner radius.
SQUARE = (376, 260, 880, 773)
RADIUS = 140

# Corner colours sampled from the logo, used to redraw the gradient cleanly at any size.
TOP_LEFT = (140, 104, 250)
BOTTOM_RIGHT = (59, 156, 247)


def diagonal_gradient(size: int) -> Image.Image:
    """Violet (top-left) → blue (bottom-right), the logo's own gradient."""
    small = Image.new("RGB", (256, 256))
    px = small.load()
    for y in range(256):
        for x in range(256):
            t = (x + y) / 510
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TOP_LEFT, BOTTOM_RIGHT))
    return small.resize((size, size), Image.BICUBIC)


def rounded_mask(size: tuple[int, int], radius: float, inset: float = 0, scale: int = 4) -> Image.Image:
    """Anti-aliased rounded-rectangle mask (drawn large, then scaled down)."""
    w, h = size
    big = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle(
        (inset * scale, inset * scale, (w - inset) * scale - 1, (h - inset) * scale - 1),
        radius=radius * scale,
        fill=255,
    )
    return big.resize((w, h), Image.LANCZOS)


def square_crop() -> Image.Image:
    return Image.open(SRC_LOGO).convert("RGB").crop(SQUARE)


def rabbit_layer() -> Image.Image:
    """The white rabbit alone, as RGBA: alpha from how white each pixel is, inside the square only."""
    crop = square_crop()
    w, h = crop.size
    lightness = ImageChops.darker(ImageChops.darker(crop.getchannel("R"), crop.getchannel("G")), crop.getchannel("B"))
    # min(R,G,B): ≤150 on the violet/blue background, ≥200 across the rabbit (incl. its lavender shading).
    alpha = lightness.point(lambda v: max(0, min(255, round((v - 150) * 255 / 50))))
    alpha = ImageChops.multiply(alpha, rounded_mask((w, h), RADIUS, inset=14))
    layer = crop.convert("RGBA")
    layer.putalpha(alpha)
    return layer.crop(alpha.getbbox())


def place_centered(layer: Image.Image, canvas: int, fraction: float) -> Image.Image:
    """`layer` scaled so its longer side is `fraction` of the canvas, centred on transparent."""
    scale = canvas * fraction / max(layer.size)
    resized = layer.resize((round(layer.width * scale), round(layer.height * scale)), Image.LANCZOS)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.alpha_composite(resized, ((canvas - resized.width) // 2, (canvas - resized.height) // 2))
    return out


def logo_mark(size: int) -> Image.Image:
    crop = square_crop().resize((size, size), Image.LANCZOS).convert("RGBA")
    crop.putalpha(rounded_mask((size, size), RADIUS * size / (SQUARE[2] - SQUARE[0]), inset=size / 256))
    return crop


def auth_illustration() -> Image.Image:
    art = Image.open(SRC_AUTH).convert("RGB").crop((110, 728, 870, 1088))
    w, h = art.size
    # Feather every edge so the scene melts into the page (#F7F8FC) instead of ending in a box.
    feather = Image.new("L", (w, h), 0)
    ImageDraw.Draw(feather).rectangle((36, 30, w - 37, h - 30), fill=255)
    feather = feather.filter(ImageFilter.GaussianBlur(22))
    layer = art.convert("RGBA")
    layer.putalpha(feather)
    return layer


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rabbit = rabbit_layer()

    icon = diagonal_gradient(1024).convert("RGBA")
    icon.alpha_composite(place_centered(rabbit, 1024, 0.62))
    icon.save(OUT / "icon.png")

    # Android adaptive icons: 108dp canvas, the launcher mask shows the central ~66%.
    place_centered(rabbit, 512, 0.5).save(OUT / "android-icon-foreground.png")
    diagonal_gradient(512).convert("RGBA").save(OUT / "android-icon-background.png")

    mono = place_centered(rabbit, 432, 0.5)
    white = Image.new("RGBA", mono.size, (255, 255, 255, 255))
    white.putalpha(mono.getchannel("A"))
    white.save(OUT / "android-icon-monochrome.png")

    logo_mark(512).save(OUT / "logo-mark.png")
    logo_mark(512).save(OUT / "splash-icon.png")
    logo_mark(48).save(OUT / "favicon.png")
    auth_illustration().save(OUT / "auth-illustration.png")
    print("Brand assets written to", OUT)


if __name__ == "__main__":
    main()

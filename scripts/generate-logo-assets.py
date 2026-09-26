"""
Builds every app icon, splash and in-app logo from images/logo.jpg (the lime
"DO" mark). Run: python scripts/generate-logo-assets.py  (needs Pillow).

The logo is white shapes on lime. The white is lifted out by its blue channel
(lime has almost none, white is near 255), so the cut-out letters inside the
shapes stay transparent and soft edges keep their anti-aliasing.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "images" / "logo.jpg"
OUT = ROOT / "assets" / "images"
LIME = (199, 247, 1)


def white_mark(src: Image.Image) -> Image.Image:
    """The white shapes on a transparent background, cropped to their bounds."""
    blue = src.getchannel("B")
    alpha = blue.point(lambda b: 0 if b < 70 else 255 if b > 200 else int((b - 70) * 255 / 130))
    mark = Image.new("RGBA", src.size, (255, 255, 255, 0))
    mark.putalpha(alpha)
    return mark.crop(alpha.getbbox())


def fit(mark: Image.Image, size: int, fraction: float) -> Image.Image:
    """`mark` scaled so its longer side is `fraction` of a `size` square, centred on transparency."""
    scale = size * fraction / max(mark.size)
    resized = mark.resize((round(mark.width * scale), round(mark.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def with_shadow(mark: Image.Image) -> Image.Image:
    """A soft drop shadow like the source art's, so white shapes read on lime."""
    shadow = Image.new("RGBA", mark.size, (80, 110, 0, 0))
    shadow.putalpha(mark.getchannel("A").point(lambda a: a * 0.35))
    shadow = shadow.filter(ImageFilter.GaussianBlur(mark.width * 0.02))
    out = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    out.alpha_composite(ImageChops.offset(shadow, 0, round(mark.width * 0.015)))
    out.alpha_composite(mark)
    return out


def rounded(img: Image.Image, radius_fraction: float) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *img.size), radius=round(img.width * radius_fraction), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def main() -> None:
    src = Image.open(SOURCE).convert("RGB")
    mark = white_mark(src)

    # Full-bleed store / legacy icon: the artwork itself, squared.
    icon = src.resize((1024, 1024), Image.LANCZOS).convert("RGBA")
    icon.save(OUT / "icon.png")
    icon.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")

    # Adaptive icon: the mark within the 66% safe zone over a lime layer.
    with_shadow(fit(mark, 512, 0.6)).save(OUT / "android-icon-foreground.png")
    Image.new("RGBA", (512, 512), (*LIME, 255)).save(OUT / "android-icon-background.png")
    fit(mark, 432, 0.6).save(OUT / "android-icon-monochrome.png")

    # Splash: the white mark, shown on a lime splash background (app.json).
    with_shadow(fit(mark, 512, 0.9)).save(OUT / "splash-icon.png")

    # In-app logo tile (welcome banner, Cloud screens).
    tile = Image.new("RGBA", (512, 512), (*LIME, 255))
    tile.alpha_composite(with_shadow(fit(mark, 512, 0.72)))
    rounded(tile, 0.24).save(OUT / "logo-mark.png")

    # Android notification small icon: white silhouette only (the system tints it).
    fit(mark, 96, 0.92).save(OUT / "notification-icon.png")

    print("Logo assets written to", OUT)


if __name__ == "__main__":
    main()

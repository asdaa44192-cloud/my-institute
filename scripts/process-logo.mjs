import sharp from "sharp";

const SRC = "public/logo.jpg";

async function main() {
  const img = sharp(SRC).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const redness = r - Math.max(g, b);
    // Keep only the red ink (rope border, text, icon). Everything else
    // (checkerboard remnants, dark vignette) becomes transparent.
    let alpha = 0;
    if (redness > 15 && r > 90) {
      alpha = Math.max(0, Math.min(255, Math.round((redness - 15) * 6)));
    }
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = alpha;
  }

  const masked = sharp(out, { raw: { width, height, channels: 4 } });

  // Trim the fully-transparent margin so the exported logo is tightly cropped.
  const trimmed = await masked.png().trim({ threshold: 10 }).toBuffer();
  const meta = await sharp(trimmed).metadata();
  console.log("trimmed size", meta.width, meta.height);

  await sharp(trimmed)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("public/logo-mark.png");

  // Solid-background version for SEO/schema/og (transparent PNGs render
  // inconsistently in crawlers and dark-mode social previews).
  await sharp("public/logo-mark.png")
    .flatten({ background: "#ffffff" })
    .resize(512, 512)
    .png()
    .toFile("public/logo-og.png");

  // App-router favicon + apple touch icon.
  await sharp("public/logo-mark.png").resize(256, 256).png().toFile("src/app/icon.png");
  await sharp("public/logo-og.png").resize(180, 180).png().toFile("src/app/apple-icon.png");

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

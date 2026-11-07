# wallgrade

wallgrade recolors wallpapers with a color palette and crops them to the sizes of
your monitors. Pick where each picture is cropped, so heads stay on at 21:9 and
across three monitors, preview the palette before anything is rendered, and write
every file in every size at once.

It runs locally as a small Nuxt app around two command line tools:
[lutgen](https://github.com/ozwaldorf/lutgen-rs) builds a lookup table (Hald CLUT)
from a palette and maps every pixel onto it, and [libvips](https://www.libvips.org/)
crops, scales and encodes.

## Features

- **Palettes:** every palette lutgen knows (Catppuccin, Gruvbox, Nord, Rosé Pine,
  Tokyo Night, Everforest …), with its four algorithms and their options: Gaussian
  blur, Gaussian RBF, Shepard's method and nearest neighbor, plus luminosity
  factor, Hald level and "preserve original luminosity".
- **Outputs:** any number of sizes per file, e.g. Ultrawide 3440×1440 and Portrait
  1440×2560, or one picture spanning all monitors. Enter your monitor layout and a
  spanning output shows where each monitor sits.
- **Focus points:** click or drag on a preview to set where a file is cropped. One
  point serves every output: wide ones use its height, tall ones its width. Files
  without a point start where libvips' attention strategy would crop them. The
  whole batch can also be cropped at the centre, or by attention or entropy.
- **Per-file overrides:** give one file its own palette, LUT options or focus
  mode; everything else follows the batch settings.
- **Batch and Single:** Batch shows every file with the crop of one output, for
  setting focus points quickly and rendering everything. Single shows one file
  before and after, step by step, with the equivalent `lutgen` and `vips` commands.
- **Formats:** AVIF, JPEG XL, WebP, JPEG and PNG, with a quality setting, and a file
  name template such as `{w}x{h}-{palette}/{name}`.
- **Only what changed:** wallgrade remembers what each output was made from and
  renders it again only when the file, its point or a setting that affects it
  changes.
- **Adding files:** drop images anywhere, paste one from the clipboard, or pick
  them with "Add files". They are saved in the source directory.
- **Presets:** save the batch settings under a name and switch between them.
- **ZIP:** download every rendered output at once.

## Running wallgrade

### With Docker

The image `ghcr.io/kazuto/wallgrade` brings lutgen and vips along. Tell Compose
where your wallpapers are, in a `.env` file next to `compose.yaml`:

```bash
WALLPAPER_DIR=~/wallpapers
```

Then start it:

```bash
docker compose up -d
```

Open <http://localhost:3000>. The outputs land in `output/` inside your wallpaper
folder, and the previews in the volume `cache`.

Compose pulls the image, or builds it from your checkout when it can't.
`docker compose pull` gets a newer one, `docker compose up -d --build` builds your
checkout instead.

| Variable        | Default  | Description                                        |
| --------------- | -------- | -------------------------------------------------- |
| `WALLPAPER_DIR` | required | Your wallpaper folder, mounted at `/data/source`   |
| `IMAGE_TAG`     | `latest` | `latest` (master), `develop` or a version          |
| `PORT`          | `3000`   | Port on this machine                               |
| `LOCAL_UID`     | `1000`   | User the container runs as, who owns the new files |
| `LOCAL_GID`     | `1000`   | Group of that user                                 |

wallgrade has no sign-in, so the port is only open to this machine. The image is
for x86-64.

### Without Docker

You need:

- [Bun](https://bun.sh/) and Node.js 24
- `lutgen` 1.x
- `vips`, libvips' command line tool, built with libheif for AVIF and libjxl for
  JPEG XL

On Arch Linux:

```bash
sudo pacman -S libvips libheif libjxl
paru -S lutgen-bin
```

wallgrade shows a warning when it can't find either tool. Then:

```bash
bun install
cp .env.example .env    # then point NUXT_SOURCE_DIR at your wallpapers
bun run dev
```

Open <http://localhost:3000>.

For everyday use, build it once and start the server:

```bash
bun run build
node --env-file=.env .output/server/index.mjs
```

### Configuration

| Variable          | Default           | Description                                       |
| ----------------- | ----------------- | ------------------------------------------------- |
| `NUXT_SOURCE_DIR` | `./.data/source`  | Wallpapers to convert, including folders below it |
| `NUXT_OUTPUT_DIR` | `<source>/output` | Where the outputs are written                     |
| `NUXT_CACHE_DIR`  | `./.data/cache`   | Previews and generated LUTs; safe to delete       |

Relative paths start in the directory the server runs in; `~` stands for your home
directory. The scan skips hidden files and folders and the output and cache
directories.

Settings, focus points, overrides, presets and what each output was made from are
kept in `.wallgrade.json` in the source directory, next to your pictures. Back it
up with them: the focus points took you a while. When wallgrade can't read the file,
it says so and leaves it alone.

## Using wallgrade

### Batch

1. **Outputs:** under "Outputs per file", tick the sizes you want. Add a size with a
   name and `WIDTHxHEIGHT`. Under "Monitor layout", enter one monitor per line as
   `WIDTHxHEIGHT+X+Y`, e.g. `1440x2560+0+0`.
2. **Palette:** pick one of the featured palettes or search all of them. "Tune"
   opens the algorithm and its options.
3. **Focus:** choose the output under "Crop preview" above the grid and click into a
   thumbnail to set its point. "Manual" uses the points you set; "Centre",
   "Attention" and "Entropy" ignore them.
4. **Format:** pick the format, quality and file name template.
5. **Render:** "Render" writes every output of the ticked files that isn't up to
   date. Untick a file in the queue to skip it. "Download ZIP" packs the outputs of
   the ticked files.

"Settings apply to" switches between all files and the selected one. Changes made
for one file are overrides, shown as a chip on its card; "Use batch palette" and
"Use batch focus" remove them.

### Single

Open a file by clicking its name. The left column lists the pipeline's steps; each
opens its settings on the right. The preview compares before and after with a split
you can drag, and shows the crop of the chosen output. Click or drag to move the
focus point, or focus the handle and use the arrow keys (Shift for larger steps).

"Commands" lists the `lutgen` and `vips` commands that make the same output, to copy
into a script.

Keys: ← and → go to the previous and next file, Esc goes back to Batch.

### File name template

| Token       | Becomes                                        |
| ----------- | ---------------------------------------------- |
| `{name}`    | The file's name without extension              |
| `{palette}` | The palette, or `original` when the LUT is off |
| `{w}` `{h}` | The output's width and height                  |
| `{output}`  | The output's name, e.g. `ultrawide`            |

Slashes make folders. A template needs `{name}`, and `{w}`, `{h}` or `{output}`, so
files and outputs don't overwrite each other. Two files can still end up at the
same place, e.g. `a/wall.png` and `b/wall.png` with the default template. Both are
then marked, and neither renders until you rename one or change the template.

## Development

```bash
bun run dev          # development server
bun run test         # unit and component tests
bun run typecheck
bun run code:check   # ESLint and Prettier; code:fix fixes what it can
```

`test/unit` tests the shared and server code in Node. Its pipeline tests run the
real `lutgen` and `vips` and are skipped where those aren't installed. `test/nuxt`
mounts components in a Nuxt app.

### Releases

Every push to `develop` or `master` publishes an image tagged with the branch;
`master`'s is also `latest`. Pushes to `develop` keep a release PR to `master` up
to date. Its title is the next version, from the commit types since the last
release: `feat` raises the minor version, a breaking change the major one,
anything else the patch. Merging it creates the release, tags the image with the
version and resets `develop` to `master`.

## License

MIT

# Scan to Result

An interactive explainer of how a brain MRI becomes a number you can trust.
Three walkthroughs (diffusion, structural, functional) with live demos on a
synthetic phantom, plus a viewer that processes real NIfTI files entirely in
the browser.

Built with SvelteKit 2, Svelte 5 and [NiiVue](https://github.com/niivue/niivue).
Everything runs client-side. Nothing is uploaded.

## Pages

| Route         | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `/`           | Home: hero, one card per modality, one for the viewer                      |
| `/diffusion`  | 8 steps: acquisition, dataset, artifacts, preprocessing, tensor, crossing fibers, tractography, statistics |
| `/structural` | 5 steps: contrast, reconstruction, cleanup, segmentation, registration     |
| `/functional` | 4 steps: BOLD, preprocessing, GLM, inference                               |
| `/viewer`     | Drop in `.nii`/`.nii.gz` + `.bval`/`.bvec`, fit a tensor, segment tissue   |
| `/about`      | Short author bio                                                           |

## Running it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # serve the build locally
npm run check      # svelte-check
```

## Where things live

```
src/lib/site.ts            name, tagline, URL, author. Edit this first.
src/lib/phantom/           synthetic 2D brain phantom and DWI synthesis
src/lib/math/              DTI fit, eigen-decomposition, FFT, RNG, colormaps
src/lib/demos/             one Svelte component per interactive demo
src/lib/components/        Walkthrough, Demo, Slider shared UI
src/lib/viewer/            NIfTI parsing, Otsu, DTI + segmentation Web Workers
src/routes/                pages
static/                    favicon, og.png, robots.txt, sitemap.xml
```

### Adding a demo

1. Create `src/lib/demos/MyDemo.svelte`.
2. Wrap the output in `<Demo title caption>` and put controls in the
   `controls` snippet and numbers in the `readout` snippet.
3. Drive it from `makePhantom()` so it matches the rest of the site.
4. Drop it into a `<section class="step">` on the relevant page.

## Deploying

The project uses `@sveltejs/adapter-auto`, so Vercel, Netlify and Cloudflare
Pages work with no configuration. For any other host, swap in the matching
adapter in `vite.config.ts`. There is no server code, so a static adapter
also works.

Before deploying, update the URL in `src/lib/site.ts`, `static/robots.txt`
and `static/sitemap.xml`.

## Viewer limitations

The in-browser pipeline is for exploration, not publication.

- DTI is a plain linear least-squares fit. No denoising, no eddy-current,
  motion or susceptibility correction, no Gibbs removal.
- The brain mask is a single Otsu threshold on the b=0 image.
- Segmentation is a three-class k-means on intensity with no bias-field
  correction and no spatial prior.
- Gradient directions are taken as given in the `.bvec` file, with no
  reorientation to the image axes.

Use MRtrix3, FSL, DSI Studio or DIPY for anything that matters.

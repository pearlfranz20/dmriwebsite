<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom, synthesizeDwi } from '$lib/phantom/phantom2d';
	import { fibonacciSphere, mulberry32 } from '$lib/math/rng';
	import { makeDtiFitter, fitVoxel } from '$lib/math/dti';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';
	import { paintScalar, hot } from '$lib/math/colormaps';

	let eddy = $state(0.6);
	let motion = $state(0.5);
	let corrected = $state(false);

	const ph = makePhantom(128);
	const n = ph.n;
	const nVox = n * n;
	const nDir = 24;
	const dirs = fibonacciSphere(nDir, true);
	const bvals = [0, ...Array(nDir).fill(1000)];
	const bvecs = new Float32Array((nDir + 1) * 3);
	bvecs.set([0, 0, 1], 0);
	bvecs.set(dirs, 3);
	const fitter = makeDtiFitter(bvals, bvecs);
	const clean = synthesizeDwi(ph, bvals, bvecs, 40, 5);

	// fixed per-volume motion "history"
	const rot = Array.from({ length: nDir + 1 }, (_, i) => (i ? (mulberry32(100 + i)() - 0.5) * 2 : 0));

	const W = 520;
	const H = 268;
	const P = 240;
	const gap = (W - 2 * P) / 3;

	let canvas: HTMLCanvasElement;
	const stats = $state({ meanFa: 0 });

	function bilinear(src: Float32Array, x: number, y: number) {
		if (x < 0 || y < 0 || x > n - 1 || y > n - 1) return 0;
		const x0 = Math.floor(x);
		const y0 = Math.floor(y);
		const x1 = Math.min(n - 1, x0 + 1);
		const y1 = Math.min(n - 1, y0 + 1);
		const fx = x - x0;
		const fy = y - y0;
		return (
			src[y0 * n + x0] * (1 - fx) * (1 - fy) +
			src[y0 * n + x1] * fx * (1 - fy) +
			src[y1 * n + x0] * (1 - fx) * fy +
			src[y1 * n + x1] * fx * fy
		);
	}

	$effect(() => {
		const data = new Float32Array(clean.length);
		const c = (n - 1) / 2;
		for (let d = 0; d <= nDir; d++) {
			const src = clean.subarray(d * nVox, (d + 1) * nVox);
			const dst = data.subarray(d * nVox, (d + 1) * nVox);
			if (corrected || d === 0) {
				dst.set(src);
				continue;
			}
			const gx = bvecs[d * 3];
			const gy = bvecs[d * 3 + 1];
			const gz = bvecs[d * 3 + 2];
			// Eddy-current field: shear, scale and shift along the phase-encode (vertical) axis,
			// each proportional to a gradient component. Motion: rotation about the centre.
			const shear = eddy * 0.18 * gx;
			const scale = 1 + eddy * 0.12 * gy;
			const shift = eddy * 4 * gz;
			const ang = (motion * 6 * rot[d] * Math.PI) / 180;
			const ca = Math.cos(ang);
			const sa = Math.sin(ang);
			for (let y = 0; y < n; y++) {
				for (let x = 0; x < n; x++) {
					// inverse map: output pixel -> source location
					const dx = x - c;
					const dy = y - c;
					let sx = dx * ca + dy * sa;
					let sy = -dx * sa + dy * ca;
					sy = (sy - shift) / scale - shear * sx;
					dst[y * n + x] = bilinear(src, sx + c, sy + c);
				}
			}
		}

		const fa = new Float32Array(nVox);
		const rgb = new ImageData(n, n);
		const sig = new Float32Array(nDir + 1);
		let sum = 0;
		let cnt = 0;
		for (let k = 0; k < nVox; k++) {
			if (!ph.mask[k]) continue;
			for (let d = 0; d <= nDir; d++) sig[d] = data[d * nVox + k];
			const m = fitVoxel(fitter, sig);
			fa[k] = m.fa;
			sum += m.fa;
			cnt++;
			const p = k * 4;
			rgb.data[p] = Math.abs(m.e1[0]) * m.fa * 255;
			rgb.data[p + 1] = Math.abs(m.e1[1]) * m.fa * 255;
			rgb.data[p + 2] = Math.abs(m.e1[2]) * m.fa * 255;
			rgb.data[p + 3] = 255;
		}
		for (let k = 0; k < nVox; k++) {
			if (!ph.mask[k]) {
				const p = k * 4;
				rgb.data[p] = 10;
				rgb.data[p + 1] = 14;
				rgb.data[p + 2] = 20;
				rgb.data[p + 3] = 255;
			}
		}
		stats.meanFa = sum / cnt;

		const ctx = setupCanvas(canvas, W, H);
		clear(ctx, W, H);
		const imgFa = new ImageData(n, n);
		paintScalar(imgFa, fa, 0, 1, hot, ph.mask);
		const top = (H - P) / 2;
		blit(ctx, imgFa, gap, top, P, P);
		blit(ctx, rgb, 2 * gap + P, top, P, P);
		label(ctx, corrected ? 'FA · corrected' : 'FA · uncorrected', gap + 8, top + 8);
		label(ctx, 'direction-encoded FA', 2 * gap + P + 8, top + 8);
	});
</script>

<Demo
	title="Why eddy-current and motion correction come first"
	caption="Each diffusion-weighted volume is warped slightly differently, because each gradient induces its own eddy currents, and the subject drifts between volumes. Fit a tensor to misaligned volumes and you get bright rims and smeared directions at every tissue edge. Correction aligns the volumes before any model is fit."
>
	<canvas bind:this={canvas} style="aspect-ratio: {W} / {H}"></canvas>

	{#snippet controls()}
		<Slider label="Eddy-current strength" bind:value={eddy} min={0} max={1} step={0.05} />
		<Slider label="Subject motion" bind:value={motion} min={0} max={1} step={0.05} />
		<label class="check">
			<input type="checkbox" bind:checked={corrected} />
			<span>Apply correction (align volumes)</span>
		</label>
	{/snippet}

	{#snippet readout()}
		<div>Mean FA in head: <b>{stats.meanFa.toFixed(3)}</b></div>
		<div>Corrected reference: <b>≈0.33</b></div>
	{/snippet}
</Demo>

<style>
	.check {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		font-size: 0.85rem;
		color: var(--ink-2);
		font-weight: 500;
	}

	.check input {
		accent-color: var(--accent);
		width: 1rem;
		height: 1rem;
	}
</style>

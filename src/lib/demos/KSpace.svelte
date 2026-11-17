<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom } from '$lib/phantom/phantom2d';
	import { fft2d, fftshift2d } from '$lib/math/fft';
	import { gaussian, mulberry32 } from '$lib/math/rng';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';
	import { paintScalar, gray, viridis } from '$lib/math/colormaps';

	let keep = $state(100); // percent of k-space extent kept per axis
	let noise = $state(0); // k-space noise
	let motion = $state(0); // number of corrupted phase-encode lines

	const ph = makePhantom(128);
	const n = ph.n;
	const W = 520;
	const H = 268;
	const P = 240;
	const gap = (W - 2 * P) / 3;

	let canvas: HTMLCanvasElement;

	$effect(() => {
		const nVox = n * n;
		const re = new Float64Array(nVox);
		const im = new Float64Array(nVox);
		for (let k = 0; k < nVox; k++) re[k] = ph.s0[k];

		fft2d(re, im, n);
		fftshift2d(re, n);
		fftshift2d(im, n);

		const g = gaussian(mulberry32(3));
		const half = n / 2;
		const limit = Math.round((keep / 100) * half);
		// Motion: a handful of random phase-encode rows acquired while the head moved.
		const bad = new Set<number>();
		const pick = mulberry32(21);
		while (bad.size < motion) {
			const row = Math.floor(pick() * n);
			if (Math.abs(row - half) > 4) bad.add(row);
		}
		const sigma = noise * 0.6;

		for (let y = 0; y < n; y++) {
			const phase = bad.has(y) ? (pick() - 0.5) * Math.PI * 1.6 : 0;
			const c = Math.cos(phase);
			const s = Math.sin(phase);
			for (let x = 0; x < n; x++) {
				const k = y * n + x;
				if (Math.abs(x - half) >= limit || Math.abs(y - half) >= limit) {
					re[k] = 0;
					im[k] = 0;
					continue;
				}
				if (phase) {
					const r0 = re[k];
					const i0 = im[k];
					re[k] = r0 * c - i0 * s;
					im[k] = r0 * s + i0 * c;
				}
				if (sigma > 0) {
					re[k] += sigma * g();
					im[k] += sigma * g();
				}
			}
		}

		// log-magnitude k-space for display
		const kmag = new Float32Array(nVox);
		let kmax = 0;
		for (let k = 0; k < nVox; k++) {
			kmag[k] = Math.log1p(Math.hypot(re[k], im[k]));
			if (kmag[k] > kmax) kmax = kmag[k];
		}

		fftshift2d(re, n);
		fftshift2d(im, n);
		fft2d(re, im, n, true);
		const recon = new Float32Array(nVox);
		for (let k = 0; k < nVox; k++) recon[k] = Math.hypot(re[k], im[k]);

		const ctx = setupCanvas(canvas, W, H);
		clear(ctx, W, H);
		const imgK = new ImageData(n, n);
		const imgR = new ImageData(n, n);
		paintScalar(imgK, kmag, 0, kmax, viridis);
		paintScalar(imgR, recon, 0, 1.05, gray);
		const top = (H - P) / 2;
		blit(ctx, imgK, gap, top, P, P);
		blit(ctx, imgR, 2 * gap + P, top, P, P);
		label(ctx, 'k-space (log |S|)', gap + 8, top + 8);
		label(ctx, 'reconstructed image', 2 * gap + P + 8, top + 8);

		// outline the kept region
		if (keep < 100) {
			const px = P / n;
			ctx.save();
			ctx.strokeStyle = 'rgba(255,255,255,0.6)';
			ctx.setLineDash([3, 3]);
			ctx.strokeRect(gap + (half - limit) * px, top + (half - limit) * px, 2 * limit * px, 2 * limit * px);
			ctx.restore();
		}
	});
</script>

<Demo
	title="Where artifacts come from: the k-space view"
	caption="The scanner never records the image; it records its spatial frequencies. Keep fewer of them and edges ring (Gibbs ringing). Add noise and it spreads everywhere. Move during a few phase-encode lines and the whole image ghosts. Each one is a separate preprocessing step later."
>
	<canvas bind:this={canvas} style="aspect-ratio: {W} / {H}"></canvas>

	{#snippet controls()}
		<Slider label="k-space extent kept" bind:value={keep} min={15} max={100} step={1} unit="%" />
		<Slider label="Noise" bind:value={noise} min={0} max={10} step={0.5} />
		<Slider label="Corrupted lines (motion)" bind:value={motion} min={0} max={24} step={1} />
	{/snippet}

	{#snippet readout()}
		<div>Effective matrix: <b>{Math.round((keep / 100) * n)} × {Math.round((keep / 100) * n)}</b></div>
		<div>Effective voxel: <b>{(2 / (keep / 100)).toFixed(1)} mm</b> (nominal 2 mm)</div>
	{/snippet}
</Demo>

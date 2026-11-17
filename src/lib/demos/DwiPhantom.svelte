<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom, synthesizeDwi, TISSUE } from '$lib/phantom/phantom2d';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';
	import { paintScalar, gray } from '$lib/math/colormaps';

	let b = $state(1000);
	let dirDeg = $state(0);
	let snr = $state(30);

	const ph = makePhantom(128);
	const n = ph.n;
	const W = 520;
	const H = 268;
	const P = 240; // panel size
	const gap = (W - 2 * P) / 3;

	let canvas: HTMLCanvasElement;

	const wmMean = $state({ b0: 0, dwi: 0 });

	$effect(() => {
		const rad = (dirDeg * Math.PI) / 180;
		const bvals = [0, b];
		const bvecs = [0, 0, 1, Math.cos(rad), Math.sin(rad), 0];
		const dwi = synthesizeDwi(ph, bvals, bvecs, snr, 11);
		const nVox = n * n;
		const b0 = dwi.subarray(0, nVox);
		const dw = dwi.subarray(nVox, 2 * nVox);

		// mean white-matter signal readout
		let s0 = 0;
		let s1 = 0;
		let c = 0;
		for (let k = 0; k < nVox; k++) {
			if (ph.tissue[k] === TISSUE.WM) {
				s0 += b0[k];
				s1 += dw[k];
				c++;
			}
		}
		wmMean.b0 = s0 / c;
		wmMean.dwi = s1 / c;

		const ctx = setupCanvas(canvas, W, H);
		clear(ctx, W, H);
		const imgA = new ImageData(n, n);
		const imgB = new ImageData(n, n);
		paintScalar(imgA, b0, 0, 1.05, gray);
		paintScalar(imgB, dw, 0, 1.05, gray);
		const top = (H - P) / 2;
		blit(ctx, imgA, gap, top, P, P);
		blit(ctx, imgB, 2 * gap + P, top, P, P);
		label(ctx, 'b = 0', gap + 8, top + 8);
		label(ctx, `b = ${b}`, 2 * gap + P + 8, top + 8);

		// gradient direction arrow
		const cx = 2 * gap + P + P - 30;
		const cy = top + P - 30;
		const L = 18;
		ctx.save();
		ctx.strokeStyle = '#ffd27a';
		ctx.fillStyle = '#ffd27a';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(cx - Math.cos(rad) * L, cy + Math.sin(rad) * L);
		ctx.lineTo(cx + Math.cos(rad) * L, cy - Math.sin(rad) * L);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cx + Math.cos(rad) * L, cy - Math.sin(rad) * L, 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		label(ctx, 'G', cx - 4, cy + 14, '#ffd27a');
	});
</script>

<Demo
	title="A single diffusion-weighted image"
	caption="Left: the b=0 image, essentially T2-weighted. Right: the same slice after a diffusion gradient. Rotate the gradient and watch the fiber bundles brighten when they run across it and darken when they run along it. Ventricles go dark first: free water."
>
	<canvas bind:this={canvas} style="aspect-ratio: {W} / {H}"></canvas>

	{#snippet controls()}
		<Slider label="b-value" bind:value={b} min={0} max={3000} step={50} unit=" s/mm²" />
		<Slider label="Gradient direction" bind:value={dirDeg} min={0} max={180} step={1} unit="°" />
		<Slider label="SNR at b=0" bind:value={snr} min={3} max={80} step={1} />
	{/snippet}

	{#snippet readout()}
		<div>Mean WM signal, b=0: <b>{wmMean.b0.toFixed(2)}</b></div>
		<div>Mean WM signal, b={b}: <b>{wmMean.dwi.toFixed(2)}</b></div>
		<div>Attenuation: <b>{(wmMean.dwi / wmMean.b0).toFixed(2)}</b></div>
	{/snippet}
</Demo>

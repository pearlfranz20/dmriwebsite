<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom, relaxSignal, relaxation, TISSUE, type TissueId } from '$lib/phantom/phantom2d';
	import { gaussian, mulberry32 } from '$lib/math/rng';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';
	import { paintScalar, gray } from '$lib/math/colormaps';

	let tr = $state(500);
	let te = $state(15);
	let ti = $state(2500);
	let ir = $state(false);

	const presets = [
		{ name: 'T1-weighted', tr: 500, te: 15, ir: false },
		{ name: 'T2-weighted', tr: 4000, te: 100, ir: false },
		{ name: 'Proton density', tr: 4000, te: 15, ir: false },
		{ name: 'FLAIR', tr: 9000, te: 100, ir: true, ti: 2500 }
	];

	const ph = makePhantom(128);
	const n = ph.n;
	const W = 520;
	const H = 268;
	const P = 240;
	const gap = (W - 2 * P) / 3;

	let canvas: HTMLCanvasElement;

	const tissues: TissueId[] = [TISSUE.CSF, TISSUE.GM, TISSUE.WM];
	const signals = $derived(tissues.map((t) => relaxSignal(t, tr, te, ir ? ti : null)));

	$effect(() => {
		const sig = signals;
		const g = gaussian(mulberry32(5));
		const img = new Float32Array(n * n);
		for (let k = 0; k < n * n; k++) {
			const t = ph.tissue[k] as TissueId;
			img[k] = (t ? sig[t - 1] : 0) + 0.012 * g();
		}
		const hi = Math.max(0.05, ...sig) * 1.05;
		const ctx = setupCanvas(canvas, W, H);
		clear(ctx, W, H);
		const im = new ImageData(n, n);
		paintScalar(im, img, 0, hi, gray);
		const top = (H - P) / 2;
		blit(ctx, im, gap, top, P, P);
		label(ctx, ir ? `IR  TR ${tr}  TE ${te}  TI ${ti}` : `SE  TR ${tr}  TE ${te}`, gap + 8, top + 8);

		// bar chart of tissue signals
		const bx = 2 * gap + P;
		const bw = P;
		const barH = P - 50;
		ctx.fillStyle = 'rgba(255,255,255,0.05)';
		ctx.fillRect(bx, top, bw, P);
		const colors = ['#4a8fd4', '#d68f36', '#e9eef2'];
		const names = ['CSF', 'GM', 'WM'];
		const maxS = Math.max(0.05, ...sig);
		for (let i = 0; i < 3; i++) {
			const h = (sig[i] / maxS) * barH;
			const x = bx + 24 + i * 72;
			ctx.fillStyle = colors[i];
			ctx.fillRect(x, top + 20 + barH - h, 44, h);
			label(ctx, names[i], x + 8, top + 26 + barH, 'rgba(255,255,255,0.7)');
			label(ctx, sig[i].toFixed(2), x + 2, top + 8 + barH - h, 'rgba(255,255,255,0.9)');
		}
		label(ctx, 'relative signal', bx + 8, top + 6, 'rgba(255,255,255,0.4)');
	});

	function apply(p: (typeof presets)[number]) {
		tr = p.tr;
		te = p.te;
		ir = p.ir;
		if (p.ti) ti = p.ti;
	}
</script>

<Demo
	title="Dial in a contrast"
	caption="Same slice, same tissue, different timing. Short TR and TE make tissue with fast T1 recovery (white matter) bright: T1-weighted. Long TR and TE let slow-T2 tissue (CSF) keep its signal: T2-weighted. Inversion recovery with the right TI nulls CSF entirely: FLAIR, which is why lesions next to ventricles become visible."
>
	<canvas bind:this={canvas} style="aspect-ratio: {W} / {H}"></canvas>

	{#snippet controls()}
		<div class="presets">
			{#each presets as p (p.name)}
				<button type="button" onclick={() => apply(p)}>{p.name}</button>
			{/each}
		</div>
		<Slider label="TR (repetition time)" bind:value={tr} min={200} max={10000} step={50} unit=" ms" />
		<Slider label="TE (echo time)" bind:value={te} min={5} max={200} step={1} unit=" ms" />
		<label class="check">
			<input type="checkbox" bind:checked={ir} />
			<span>Inversion recovery</span>
		</label>
		{#if ir}
			<Slider label="TI (inversion time)" bind:value={ti} min={100} max={4000} step={10} unit=" ms" />
		{/if}
	{/snippet}

	{#snippet readout()}
		{#each tissues as t, i (t)}
			<div>{relaxation[t].name}: T1 {relaxation[t].t1} · T2 {relaxation[t].t2} ms → <b>{signals[i].toFixed(2)}</b></div>
		{/each}
	{/snippet}
</Demo>

<style>
	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.presets button {
		font: 500 0.72rem var(--font-mono);
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}

	.presets button:hover {
		border-color: var(--ink);
		color: var(--ink);
	}

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

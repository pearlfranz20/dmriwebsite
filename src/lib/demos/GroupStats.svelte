<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { gaussian, mulberry32 } from '$lib/math/rng';

	let {
		metric = 'FA',
		context = 'tract',
		caption = 'Top: mean FA along a tract for two groups, with a real difference planted in the shaded span. Bottom: the t-statistic at each position. The dashed line is the usual p < 0.05 cutoff applied 60 separate times; the solid line is the threshold from permuting group labels and recording the largest statistic each time. Permutation keeps false positives honest, which is why connectometry and TBSS both use it.'
	}: { metric?: string; context?: string; caption?: string } = $props();

	let nPer = $state(15);
	let effect = $state(0.8); // Cohen's d inside the true region
	let seed = $state(1);

	const P = 60; // positions along the tract
	const region = [22, 36];
	const nPerm = 400;
	const W = 520;
	const H = 320;
	const padL = 40;
	const padR = 12;

	const sim = $derived.by(() => {
		const rnd = mulberry32(seed * 7919);
		const g = gaussian(rnd);
		const A = new Float32Array(nPer * P);
		const B = new Float32Array(nPer * P);
		for (let s = 0; s < nPer; s++) {
			const subjA = g() * 0.4; // subject-level offset: FA values are correlated along a tract
			const subjB = g() * 0.4;
			for (let p = 0; p < P; p++) {
				const base = 0.45 + 0.1 * Math.sin((p / P) * Math.PI);
				const inRegion = p >= region[0] && p <= region[1];
				A[s * P + p] = base + 0.05 * (subjA + g());
				B[s * P + p] = base + 0.05 * (subjB + g()) - (inRegion ? effect * 0.05 : 0);
			}
		}
		const all = new Float32Array(2 * nPer * P);
		all.set(A);
		all.set(B, nPer * P);

		const tStat = (labels: Uint8Array) => {
			const t = new Float32Array(P);
			for (let p = 0; p < P; p++) {
				let sa = 0;
				let sb = 0;
				let qa = 0;
				let qb = 0;
				for (let s = 0; s < 2 * nPer; s++) {
					const v = all[s * P + p];
					if (labels[s]) {
						sb += v;
						qb += v * v;
					} else {
						sa += v;
						qa += v * v;
					}
				}
				const ma = sa / nPer;
				const mb = sb / nPer;
				const va = (qa - nPer * ma * ma) / (nPer - 1);
				const vb = (qb - nPer * mb * mb) / (nPer - 1);
				t[p] = (ma - mb) / Math.sqrt((va + vb) / nPer || 1e-9);
			}
			return t;
		};

		const labels = new Uint8Array(2 * nPer);
		for (let s = nPer; s < 2 * nPer; s++) labels[s] = 1;
		const tObs = tStat(labels);

		// permutation distribution of the maximum |t| across positions
		const maxT: number[] = [];
		const perm = Uint8Array.from(labels);
		for (let i = 0; i < nPerm; i++) {
			for (let s = perm.length - 1; s > 0; s--) {
				const j = Math.floor(rnd() * (s + 1));
				[perm[s], perm[j]] = [perm[j], perm[s]];
			}
			const t = tStat(perm);
			let m = 0;
			for (let p = 0; p < P; p++) if (Math.abs(t[p]) > m) m = Math.abs(t[p]);
			maxT.push(m);
		}
		maxT.sort((a, b) => a - b);
		const fwe = maxT[Math.floor(0.95 * nPerm)];
		const unc = tCrit(2 * nPer - 2);

		const meanA = new Float32Array(P);
		const meanB = new Float32Array(P);
		for (let p = 0; p < P; p++) {
			let a = 0;
			let b = 0;
			for (let s = 0; s < nPer; s++) {
				a += A[s * P + p];
				b += B[s * P + p];
			}
			meanA[p] = a / nPer;
			meanB[p] = b / nPer;
		}

		let sigUnc = 0;
		let sigFwe = 0;
		let falseUnc = 0;
		let falseFwe = 0;
		for (let p = 0; p < P; p++) {
			const inRegion = p >= region[0] && p <= region[1];
			if (Math.abs(tObs[p]) > unc) {
				sigUnc++;
				if (!inRegion) falseUnc++;
			}
			if (Math.abs(tObs[p]) > fwe) {
				sigFwe++;
				if (!inRegion) falseFwe++;
			}
		}
		return { tObs, fwe, unc, meanA, meanB, sigUnc, sigFwe, falseUnc, falseFwe };
	});

	/** two-sided 0.05 critical t, crude approximation good enough for a demo */
	function tCrit(df: number) {
		return 1.96 + 2.4 / df + 5 / (df * df);
	}

	const x = (p: number) => padL + (p / (P - 1)) * (W - padL - padR);
	const topH = 130;
	const botTop = 160;
	const botH = 140;
	const yTop = (v: number) => 14 + (1 - (v - 0.3) / 0.35) * (topH - 14);
	const tMax = 6;
	const yBot = (t: number) => botTop + botH - (Math.min(Math.abs(t), tMax) / tMax) * botH;

	const toPath = (arr: Float32Array, yf: (v: number) => number) =>
		Array.from(arr, (v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yf(v).toFixed(1)).join('');
</script>

<Demo
	title="Finding a group difference along a {context}, honestly"
	{caption}
>
	<svg viewBox="0 0 {W} {H}" role="img" aria-label="Group comparison along a tract with permutation threshold">
		<rect width={W} height={H} fill="#0b1f2e" rx="12" />
		<rect x={x(region[0])} y="10" width={x(region[1]) - x(region[0])} height={H - 20} fill="rgba(255,159,67,0.1)" />

		<path d={toPath(sim.meanA, yTop)} fill="none" stroke="#5ee0ff" stroke-width="2" />
		<path d={toPath(sim.meanB, yTop)} fill="none" stroke="#ff9f43" stroke-width="2" />
		<text x={padL} y="22" fill="#5ee0ff" font-size="10" font-family="JetBrains Mono, monospace">group A</text>
		<text x={padL + 60} y="22" fill="#ff9f43" font-size="10" font-family="JetBrains Mono, monospace">group B</text>
		<text x={W - padR} y="22" fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="end" font-family="JetBrains Mono, monospace">mean {metric}</text>

		<line x1={padL} x2={W - padR} y1={botTop + botH} y2={botTop + botH} stroke="rgba(255,255,255,0.15)" />
		{#each sim.tObs as t, i (i)}
			<rect
				x={x(i) - 3}
				y={yBot(t)}
				width="6"
				height={botTop + botH - yBot(t)}
				fill={Math.abs(t) > sim.fwe ? '#ff9f43' : Math.abs(t) > sim.unc ? 'rgba(255,159,67,0.45)' : 'rgba(255,255,255,0.25)'}
			/>
		{/each}
		<line x1={padL} x2={W - padR} y1={yBot(sim.unc)} y2={yBot(sim.unc)} stroke="rgba(255,255,255,0.6)" stroke-dasharray="4 4" />
		<line x1={padL} x2={W - padR} y1={yBot(sim.fwe)} y2={yBot(sim.fwe)} stroke="#ff9f43" stroke-width="1.5" />
		<text x={padL} y={botTop + 12} fill="rgba(255,255,255,0.4)" font-size="10" font-family="JetBrains Mono, monospace">|t| per position</text>
		<text x={W - padR} y={yBot(sim.unc) - 4} fill="rgba(255,255,255,0.6)" font-size="10" text-anchor="end" font-family="JetBrains Mono, monospace">uncorrected</text>
		<text x={W - padR} y={yBot(sim.fwe) - 4} fill="#ff9f43" font-size="10" text-anchor="end" font-family="JetBrains Mono, monospace">permutation FWE</text>
		<text x={W / 2} y={H - 6} fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="middle" font-family="JetBrains Mono, monospace">position along {context}</text>
	</svg>

	{#snippet controls()}
		<Slider label="Subjects per group" bind:value={nPer} min={5} max={40} step={1} />
		<Slider label="True effect size (d)" bind:value={effect} min={0} max={1.5} step={0.05} format={(v) => v.toFixed(2)} />
		<button type="button" class="reseed" onclick={() => (seed += 1)}>Draw a new sample</button>
	{/snippet}

	{#snippet readout()}
		<div>Uncorrected: <b>{sim.sigUnc}</b> positions, <b>{sim.falseUnc}</b> outside the true span</div>
		<div>Permutation FWE: <b>{sim.sigFwe}</b> positions, <b>{sim.falseFwe}</b> outside</div>
		<div>Thresholds: |t| &gt; {sim.unc.toFixed(2)} vs {sim.fwe.toFixed(2)}</div>
	{/snippet}
</Demo>

<style>
	.reseed {
		font: 500 0.75rem var(--font-mono);
		padding: 0.45rem 0.7rem;
		border-radius: 6px;
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
		justify-self: start;
	}

	.reseed:hover {
		border-color: var(--ink);
		color: var(--ink);
	}
</style>

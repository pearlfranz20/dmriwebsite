<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { fibonacciSphere } from '$lib/math/rng';
	import { makeDtiFitter, fitVoxel } from '$lib/math/dti';
	import { diffusivity } from '$lib/phantom/phantom2d';

	let crossing = $state(60); // degrees between the two bundles
	let f1 = $state(0.5);
	let b = $state(1000);

	const S = 300;
	const cx = S / 2;
	const cy = S / 2;
	const R = 120;

	const nDir = 48;
	const dirs = fibonacciSphere(nDir, true);
	const lPar = diffusivity.fiberPar;
	const lPerp = diffusivity.fiberPerp;

	const result = $derived.by(() => {
		const th2 = (crossing * Math.PI) / 180;
		const bvals = [0, ...Array(nDir).fill(b)];
		const bvecs = new Float32Array((nDir + 1) * 3);
		bvecs.set([0, 0, 1], 0);
		bvecs.set(dirs, 3);
		const sig = new Float32Array(nDir + 1);
		sig[0] = 1;
		for (let i = 0; i < nDir; i++) {
			const gx = dirs[i * 3];
			const gy = dirs[i * 3 + 1];
			const c1 = gx; // fiber 1 along +x
			const c2 = Math.cos(th2) * gx + Math.sin(th2) * gy;
			sig[i + 1] =
				f1 * Math.exp(-b * (lPerp + (lPar - lPerp) * c1 * c1)) +
				(1 - f1) * Math.exp(-b * (lPerp + (lPar - lPerp) * c2 * c2));
		}
		const fitter = makeDtiFitter(bvals, bvecs);
		const m = fitVoxel(fitter, sig);
		// in-plane angle of the fitted principal direction
		const e1Angle = Math.atan2(m.e1[1], m.e1[0]);
		const d1 = angDiff(e1Angle, 0);
		const d2 = angDiff(e1Angle, th2);
		return { m, th2, e1Angle, err: Math.min(d1, d2) };
	});

	function angDiff(a: number, b: number) {
		let d = Math.abs(a - b) % Math.PI;
		if (d > Math.PI / 2) d = Math.PI - d;
		return (d * 180) / Math.PI;
	}

	/** Diffusion ODF of a cylindrical tensor along in-plane direction at angle phi (unnormalised). */
	function odfFiber(phi: number, fiberAngle: number) {
		const c = Math.cos(phi - fiberAngle);
		const s = Math.sin(phi - fiberAngle);
		const q = (c * c) / lPar + (s * s) / lPerp;
		return Math.pow(q, -1.5);
	}

	const polar = $derived.by(() => {
		const N = 180;
		const trueVals: number[] = [];
		const dtiVals: number[] = [];
		const { m, th2 } = result;
		// fitted tensor restricted to the plane: quadratic form with the in-plane inverse
		const e = m.evals.map((v) => Math.max(v, 1e-5));
		for (let i = 0; i <= N; i++) {
			const phi = (i / N) * Math.PI * 2;
			trueVals.push(f1 * odfFiber(phi, 0) + (1 - f1) * odfFiber(phi, th2));
			// use fitted eigen-decomposition: q = sum_k (u·e_k)^2 / lambda_k
			const ux = Math.cos(phi);
			const uy = Math.sin(phi);
			// quadratic form of the fitted tensor's inverse: the e1 component and the mean of the rest
			const c1 = ux * m.e1[0] + uy * m.e1[1];
			const q = (c1 * c1) / e[0] + (1 - c1 * c1) / ((e[1] + e[2]) / 2);
			dtiVals.push(Math.pow(q, -1.5));
		}
		const tMax = Math.max(...trueVals);
		const dMax = Math.max(...dtiVals);
		const toPath = (vals: number[], max: number) =>
			vals
				.map((v, i) => {
					const phi = (i / N) * Math.PI * 2;
					const r = (v / max) * R;
					return (i ? 'L' : 'M') + (cx + r * Math.cos(phi)).toFixed(1) + ' ' + (cy - r * Math.sin(phi)).toFixed(1);
				})
				.join('') + 'Z';
		return { truePath: toPath(trueVals, tMax), dtiPath: toPath(dtiVals, dMax) };
	});

	const fiberLine = (ang: number) => ({
		x1: cx - Math.cos(ang) * (R + 15),
		y1: cy + Math.sin(ang) * (R + 15),
		x2: cx + Math.cos(ang) * (R + 15),
		y2: cy - Math.sin(ang) * (R + 15)
	});

	const e1Line = $derived(fiberLine(result.e1Angle));
</script>

<Demo
	title="Two bundles in one voxel"
	caption="Teal: the true orientation distribution of a voxel containing two fiber populations. Amber: the single tensor a DTI fit returns for it. At wide crossing angles the tensor becomes a flattened disc pointing between the bundles, with low FA, even though both bundles are perfectly healthy. Roughly a third of white-matter voxels look like this."
>
	<svg viewBox="0 0 {S} {S}" role="img" aria-label="Orientation distribution of a crossing-fiber voxel versus a single tensor">
		<rect width={S} height={S} fill="#0b1f2e" rx="12" />
		<circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.08)" />
		<circle cx={cx} cy={cy} r={R / 2} fill="none" stroke="rgba(255,255,255,0.08)" />
		{#each [0, result.th2] as a, i (i)}
			{@const l = fiberLine(a)}
			<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(255,255,255,0.35)" stroke-width="1" stroke-dasharray="4 4" />
		{/each}
		<path d={polar.truePath} fill="rgba(44,193,200,0.28)" stroke="#2cc1c8" stroke-width="1.8" />
		<path d={polar.dtiPath} fill="none" stroke="#ff9f43" stroke-width="2" />
		<line x1={e1Line.x1} y1={e1Line.y1} x2={e1Line.x2} y2={e1Line.y2} stroke="#ff9f43" stroke-width="1.5" opacity="0.8" />
		<text x="12" y="20" fill="#2cc1c8" font-size="11" font-family="JetBrains Mono, monospace">true ODF</text>
		<text x="12" y="36" fill="#ff9f43" font-size="11" font-family="JetBrains Mono, monospace">single tensor fit</text>
	</svg>

	{#snippet controls()}
		<Slider label="Crossing angle" bind:value={crossing} min={0} max={90} step={1} unit="°" />
		<Slider label="Fraction of bundle 1" bind:value={f1} min={0.2} max={0.8} step={0.05} format={(v) => v.toFixed(2)} />
		<Slider label="b-value" bind:value={b} min={500} max={3000} step={100} unit=" s/mm²" />
	{/snippet}

	{#snippet readout()}
		<div>Fitted FA: <b>{result.m.fa.toFixed(3)}</b> (each bundle alone: 0.84)</div>
		<div>Angular error of e₁: <b>{result.err.toFixed(1)}°</b></div>
		<div>MD: <b>{(result.m.md * 1000).toFixed(2)} µm²/ms</b></div>
	{/snippet}
</Demo>

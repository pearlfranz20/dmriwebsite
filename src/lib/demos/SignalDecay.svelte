<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { diffusivity } from '$lib/phantom/phantom2d';

	let b = $state(1000);
	let angle = $state(0); // angle between gradient and fiber, degrees

	const W = 520;
	const H = 300;
	const padL = 46;
	const padR = 16;
	const padT = 16;
	const padB = 36;
	const bMax = 3000;

	const dEff = $derived.by(() => {
		const c = Math.cos((angle * Math.PI) / 180);
		return diffusivity.fiberPerp + (diffusivity.fiberPar - diffusivity.fiberPerp) * c * c;
	});

	const series = $derived([
		{ name: 'CSF', d: diffusivity.csf, color: '#4a8fd4' },
		{ name: 'Gray matter', d: diffusivity.gm, color: '#d68f36' },
		{ name: `White matter, gradient ${angle}° to fiber`, d: dEff, color: '#2cc1c8' }
	]);

	const x = (bv: number) => padL + (bv / bMax) * (W - padL - padR);
	const y = (s: number) => padT + (1 - s) * (H - padT - padB);

	function path(d: number) {
		let p = '';
		for (let i = 0; i <= 60; i++) {
			const bv = (i / 60) * bMax;
			const s = Math.exp(-bv * d);
			p += (i ? ' L' : 'M') + x(bv).toFixed(1) + ' ' + y(s).toFixed(1);
		}
		return p;
	}

	const fmt = (v: number) => v.toFixed(2);
</script>

<Demo
	title="How much signal survives a diffusion gradient"
	caption="Signal falls exponentially with b-value, faster where water moves more freely. Along an axon bundle water travels far (strong attenuation); across it, membranes get in the way. That gap is the whole basis of diffusion MRI."
>
	<svg viewBox="0 0 {W} {H}" role="img" aria-label="Signal attenuation versus b-value for three tissues">
		<rect width={W} height={H} fill="#0b1f2e" rx="12" />
		{#each [0, 0.25, 0.5, 0.75, 1] as g (g)}
			<line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.08)" />
			<text x={padL - 8} y={y(g) + 4} fill="rgba(255,255,255,0.55)" font-size="10" text-anchor="end" font-family="JetBrains Mono, monospace">{g.toFixed(2)}</text>
		{/each}
		{#each [0, 1000, 2000, 3000] as bv (bv)}
			<text x={x(bv)} y={H - 12} fill="rgba(255,255,255,0.55)" font-size="10" text-anchor="middle" font-family="JetBrains Mono, monospace">{bv}</text>
		{/each}
		<text x={W - padR} y={H - 24} fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="end" font-family="JetBrains Mono, monospace">b (s/mm²)</text>
		<text x={padL + 4} y={padT + 10} fill="rgba(255,255,255,0.4)" font-size="10" font-family="JetBrains Mono, monospace">S / S₀</text>

		{#each series as s (s.name)}
			<path d={path(s.d)} fill="none" stroke={s.color} stroke-width="2.2" />
			<circle cx={x(b)} cy={y(Math.exp(-b * s.d))} r="4" fill={s.color} stroke="#0b1f2e" stroke-width="1.5" />
		{/each}
		<line x1={x(b)} x2={x(b)} y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.35)" stroke-dasharray="3 3" />
	</svg>

	{#snippet controls()}
		<Slider label="b-value" bind:value={b} min={0} max={bMax} step={50} unit=" s/mm²" />
		<Slider label="Gradient angle to fiber" bind:value={angle} min={0} max={90} step={1} unit="°" />
	{/snippet}

	{#snippet readout()}
		{#each series as s (s.name)}
			<div><span style="color:{s.color}">■</span> {s.name}: <b>{fmt(Math.exp(-b * s.d))}</b></div>
		{/each}
		<div>Effective D along gradient in WM: <b>{(dEff * 1000).toFixed(2)} µm²/ms</b></div>
	{/snippet}
</Demo>

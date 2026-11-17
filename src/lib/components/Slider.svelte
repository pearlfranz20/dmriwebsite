<script lang="ts">
	let {
		label,
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		unit = '',
		format = (v: number) => String(v)
	}: {
		label: string;
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		format?: (v: number) => string;
	} = $props();
</script>

<label class="slider">
	<span class="row">
		<span class="name">{label}</span>
		<output>{format(value)}<span class="unit">{unit}</span></output>
	</span>
	<input type="range" bind:value {min} {max} {step} />
</label>

<style>
	.slider {
		display: grid;
		gap: 0.35rem;
		font-size: 0.85rem;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
	}

	.name {
		color: var(--ink-2);
		font-weight: 500;
	}

	output {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--ink);
	}

	.unit {
		color: var(--muted);
		margin-left: 0.2em;
	}

	input[type='range'] {
		width: 100%;
		margin: 0;
		accent-color: var(--accent);
		height: 1.25rem;
	}
</style>

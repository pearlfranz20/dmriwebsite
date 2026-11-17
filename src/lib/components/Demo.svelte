<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		caption = '',
		children,
		controls,
		readout
	}: {
		title: string;
		caption?: string;
		children: Snippet;
		controls?: Snippet;
		readout?: Snippet;
	} = $props();
</script>

<figure class="demo">
	<div class="head">
		<span class="tag">Try it</span>
		<h4>{title}</h4>
	</div>
	<div class="body" class:has-controls={!!controls}>
		<div class="stage">
			{@render children()}
		</div>
		{#if controls}
			<div class="controls">
				{@render controls()}
				{#if readout}
					<div class="readout">{@render readout()}</div>
				{/if}
			</div>
		{/if}
	</div>
	{#if caption}
		<figcaption>{caption}</figcaption>
	{/if}
</figure>

<style>
	.demo {
		margin: 2rem 0;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: #fff;
		box-shadow: var(--shadow);
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1.25rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}

	.tag {
		font: 500 0.65rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-ink);
		background: var(--accent-soft);
		padding: 0.3rem 0.5rem;
		border-radius: 6px;
	}

	h4 {
		margin: 0;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-weight: 600;
	}

	.body {
		display: grid;
		gap: 1.25rem;
		padding: 1.25rem;
	}

	.body.has-controls {
		grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.8fr);
	}

	.stage {
		min-width: 0;
	}

	.stage :global(canvas),
	.stage :global(svg) {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius);
	}

	.controls {
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.readout {
		padding-top: 0.9rem;
		border-top: 1px solid var(--line);
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--ink-2);
		display: grid;
		gap: 0.3rem;
	}

	.readout :global(b) {
		color: var(--ink);
		font-weight: 500;
	}

	figcaption {
		padding: 0.85rem 1.25rem;
		border-top: 1px solid var(--line);
		font-size: 0.85rem;
		color: var(--ink-2);
		background: var(--paper);
	}

	@media (max-width: 720px) {
		.body.has-controls {
			grid-template-columns: 1fr;
		}
	}
</style>

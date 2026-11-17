<script lang="ts">
	import type { Snippet } from 'svelte';

	export type StepInfo = { id: string; title: string };

	let {
		eyebrow,
		title,
		lead,
		steps,
		accent = 'var(--accent)',
		children
	}: {
		eyebrow: string;
		title: string;
		lead: string;
		steps: StepInfo[];
		accent?: string;
		children: Snippet;
	} = $props();

	let active = $state('');

	$effect(() => {
		if (!active) active = steps[0]?.id ?? '';
		const sections = steps
			.map((s) => document.getElementById(s.id))
			.filter((el): el is HTMLElement => !!el);
		if (!sections.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				// pick the top-most visible section
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) active = visible[0].target.id;
			},
			{ rootMargin: '-20% 0px -65% 0px', threshold: 0 }
		);
		sections.forEach((s) => io.observe(s));
		return () => io.disconnect();
	});
</script>

<header class="intro wrap" style="--step-accent: {accent}">
	<p class="eyebrow">{eyebrow}</p>
	<h1>{title}</h1>
	<p class="lead">{lead}</p>
</header>

<div class="walk wrap" style="--step-accent: {accent}">
	<nav class="steps" aria-label="Steps">
		<ol>
			{#each steps as s, i (s.id)}
				<li class:active={active === s.id}>
					<a href="#{s.id}">
						<span class="n">{String(i + 1).padStart(2, '0')}</span>
						<span>{s.title}</span>
					</a>
				</li>
			{/each}
		</ol>
	</nav>

	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.intro {
		padding: clamp(3rem, 6vw, 5rem) 0 clamp(1.5rem, 3vw, 2.5rem);
		max-width: 760px;
		margin-left: auto;
		margin-right: auto;
	}

	.intro h1 {
		font-size: clamp(2.4rem, 5vw, 3.8rem);
		font-weight: 400;
		font-variation-settings: 'opsz' 144;
		letter-spacing: -0.025em;
	}

	.lead {
		margin-top: 1.25rem;
		font-size: 1.1rem;
		color: var(--ink-2);
	}

	.walk {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: clamp(2rem, 5vw, 5rem);
		align-items: start;
		padding-bottom: 3rem;
	}

	.steps {
		position: sticky;
		top: 5.5rem;
	}

	.steps ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.15rem;
		border-left: 1px solid var(--line);
	}

	.steps a {
		display: flex;
		gap: 0.7rem;
		align-items: baseline;
		padding: 0.45rem 0.9rem;
		margin-left: -1px;
		border-left: 2px solid transparent;
		text-decoration: none;
		font-size: 0.85rem;
		color: var(--muted);
		transition:
			color 140ms ease,
			border-color 140ms ease;
	}

	.steps .n {
		font: 500 0.68rem var(--font-mono);
		letter-spacing: 0.06em;
	}

	.steps a:hover {
		color: var(--ink);
	}

	.steps li.active a {
		color: var(--ink);
		border-left-color: var(--step-accent);
	}

	.content {
		max-width: 760px;
		min-width: 0;
	}

	/* ---- Step sections, styled globally so pages can use plain markup ---- */
	.content :global(.step) {
		padding: 1rem 0 2.5rem;
		scroll-margin-top: 5.5rem;
	}

	.content :global(.step + .step) {
		border-top: 1px solid var(--line);
		padding-top: 3rem;
	}

	.content :global(.step .step-n) {
		font: 500 0.72rem var(--font-mono);
		letter-spacing: 0.08em;
		color: var(--step-accent);
		display: block;
		margin-bottom: 0.6rem;
	}

	.content :global(.step h2) {
		font-size: clamp(1.7rem, 3vw, 2.3rem);
		margin-bottom: 1rem;
	}

	.content :global(.step h3) {
		font-size: 1.3rem;
		margin: 2rem 0 0.6rem;
	}

	.content :global(.step p) {
		color: var(--ink-2);
		margin-bottom: 1rem;
		max-width: 68ch;
	}

	.content :global(.step ul),
	.content :global(.step ol) {
		color: var(--ink-2);
		padding-left: 1.2rem;
		margin: 0 0 1rem;
	}

	.content :global(.step li) {
		margin-bottom: 0.35rem;
	}

	.content :global(.step strong) {
		color: var(--ink);
		font-weight: 600;
	}

	.content :global(.step code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		background: var(--paper-2);
		padding: 0.1em 0.4em;
		border-radius: 4px;
	}

	.content :global(.step .math) {
		font-family: var(--font-mono);
		font-size: 0.92rem;
		background: var(--paper-2);
		padding: 0.8rem 1rem;
		border-radius: var(--radius);
		margin: 1rem 0;
		color: var(--ink);
		overflow-x: auto;
	}

	.content :global(.step .aside) {
		border-left: 2px solid var(--step-accent);
		padding: 0.25rem 0 0.25rem 1rem;
		margin: 1.25rem 0;
		font-size: 0.95rem;
	}

	.content :global(.step .aside p) {
		margin: 0;
	}

	.content :global(.step .pitfall) {
		border-left-color: var(--amber);
	}

	.content :global(.step .pitfall::before) {
		content: 'Where it goes wrong';
		display: block;
		font: 500 0.68rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--amber);
		margin-bottom: 0.3rem;
	}

	.content :global(.step .tools) {
		font-size: 0.85rem;
		color: var(--muted);
		margin-top: 1rem;
	}

	.content :global(.step .tools b) {
		color: var(--ink-2);
		font-weight: 500;
	}

	@media (max-width: 900px) {
		.walk {
			grid-template-columns: 1fr;
		}

		.steps {
			position: static;
			overflow-x: auto;
			margin-bottom: 1rem;
		}

		.steps ol {
			display: flex;
			gap: 0.25rem;
			border-left: none;
			border-bottom: 1px solid var(--line);
			padding-bottom: 0.25rem;
		}

		.steps a {
			white-space: nowrap;
			border-left: none;
			border-bottom: 2px solid transparent;
			margin: 0;
			padding: 0.5rem 0.6rem;
		}

		.steps li.active a {
			border-bottom-color: var(--step-accent);
		}
	}
</style>

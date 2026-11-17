<script lang="ts">
	import Tracts from '$lib/components/Tracts.svelte';
	import { site, modalities } from '$lib/site';

	const title = `${site.name} · How brain MRI gets processed`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={site.description} />
	<link rel="canonical" href="{site.url}/" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={site.description} />
	<meta property="og:url" content="{site.url}/" />
</svelte:head>

<section class="hero wrap">
	<div class="hero-copy">
		<p class="eyebrow">Interactive explainer · runs in your browser</p>
		<h1>{site.tagline}</h1>
		<p class="lead">
			Between the scanner and the figure in a paper sit a dozen processing steps that most people
			never see. This site walks through them for diffusion, structural, and functional MRI, with a
			live demo at every step that you can push until it breaks. When you're done, load your own
			scan and run the pipeline on it. Nothing leaves your machine.
		</p>
		<div class="actions">
			<a class="btn btn-primary" href="/diffusion">Start with diffusion MRI</a>
			<a class="btn btn-ghost" href="/viewer">Process your own data</a>
		</div>
	</div>
	<figure class="hero-art">
		<Tracts />
	</figure>
</section>

<section class="paths wrap">
	<header class="section-head">
		<p class="eyebrow">Three modalities</p>
		<h2>Pick a pipeline</h2>
	</header>
	<div class="grid">
		{#each modalities as m (m.slug)}
			<a class="card" href="/{m.slug}" style="--card-accent: {m.accent}">
				<span class="card-short">{m.short}</span>
				<h3>{m.title}</h3>
				<p>{m.blurb}</p>
				<span class="card-meta">{m.steps} steps · interactive</span>
			</a>
		{/each}
		<a class="card viewer" href="/viewer">
			<span class="card-short">NIfTI in, maps out</span>
			<h3>Process your data</h3>
			<p>
				Drop in a NIfTI file. Fit a diffusion tensor, segment tissue, and look at the result in a
				proper 3D viewer, all in the browser.
			</p>
			<span class="card-meta">no upload · no install</span>
		</a>
	</div>
</section>

<section class="why wrap">
	<div class="why-grid">
		<div>
			<p class="eyebrow">Why this exists</p>
			<h2>Pipelines are taught as commands. They should be taught as decisions.</h2>
		</div>
		<div class="why-body">
			<p>
				Most people learn neuroimaging by inheriting a script. It runs, it produces a map, and the
				map goes in the paper. What the script assumed, where it is fragile, and which knob changed
				the result are rarely visible. Every demo here is built so that you can turn the knob
				yourself.
			</p>
			<p>
				Written for people who just joined an imaging lab, by someone who did the same not long
				ago. All demos use a synthetic phantom so nothing here is a real patient. The methods and
				the failure modes are real.
			</p>
			<a class="more" href="/about">About the author →</a>
		</div>
	</div>
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: clamp(2rem, 5vw, 4.5rem);
		align-items: center;
		padding: clamp(3rem, 7vw, 6rem) 0 clamp(2rem, 4vw, 3rem);
	}

	.hero h1 {
		font-size: clamp(2.6rem, 5.2vw, 4.2rem);
		font-weight: 400;
		font-variation-settings: 'opsz' 144;
		letter-spacing: -0.025em;
	}

	.lead {
		margin-top: 1.5rem;
		font-size: 1.1rem;
		line-height: 1.65;
		color: var(--ink-2);
		max-width: 56ch;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.hero-art {
		margin: 0;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow), 0 40px 80px -40px rgba(11, 31, 46, 0.5);
		overflow: hidden;
	}

	.section-head {
		margin-bottom: 1.5rem;
	}

	.section-head h2,
	.why h2 {
		font-size: clamp(1.9rem, 3.4vw, 2.6rem);
	}

	.paths {
		padding: clamp(2rem, 5vw, 4rem) 0;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1px;
		background: var(--line);
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1.6rem 1.5rem;
		background: var(--paper);
		text-decoration: none;
		position: relative;
		transition: background-color 160ms ease;
	}

	.card::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--card-accent, var(--ink));
		opacity: 0;
		transition: opacity 160ms ease;
	}

	.card:hover {
		background: #fbf9f4;
	}

	.card:hover::before {
		opacity: 1;
	}

	.card-short {
		font: 500 0.7rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.card h3 {
		font-size: 1.4rem;
	}

	.card p {
		color: var(--ink-2);
		font-size: 0.93rem;
		flex: 1;
	}

	.card-meta {
		font: 500 0.7rem var(--font-mono);
		color: var(--accent-ink);
		margin-top: 0.5rem;
	}

	.card.viewer {
		background: var(--navy);
		color: #e9eef2;
	}

	.card.viewer p {
		color: #b4c0cb;
	}

	.card.viewer .card-meta {
		color: #6fd3e4;
	}

	.card.viewer:hover {
		background: var(--navy-2);
	}

	.why {
		padding: clamp(2rem, 5vw, 4rem) 0;
	}

	.why-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		gap: clamp(2rem, 5vw, 4rem);
		padding-top: 3rem;
		border-top: 1px solid var(--line);
	}

	.why-body p {
		color: var(--ink-2);
		margin-bottom: 1rem;
		max-width: 60ch;
	}

	.more {
		text-decoration: none;
		color: var(--accent-ink);
		font-weight: 500;
	}

	@media (max-width: 960px) {
		.hero {
			grid-template-columns: 1fr;
		}

		.hero-art {
			max-width: 620px;
		}

		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.why-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>

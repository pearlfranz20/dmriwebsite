<svelte:head>
	<title>DMRI Analytics | Tract-Level Insights from MRI Data</title>
	<meta
		name="description"
		content="DMRI analysis services for identifying statistically significant tracts linked to traits and tracking longitudinal tract density changes over time."
	/>
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<p class="eyebrow">DMRI analysis services</p>
		<h1>Turn raw MRI scans into tract-level evidence.</h1>
		<p class="lead">
			I help researchers and clinicians analyze diffusion MRI data to reveal which white matter tracts
			are associated with specific traits, and to track how tract density changes across time.
		</p>
		<div class="actions">
			<a class="button primary" href="mailto:hello@dmrianalytics.example">Request a consultation</a>
			<a class="button secondary" href="#services">Explore services</a>
		</div>
	</div>

	<div class="hero-card">
		<h2>What I offer</h2>
		<ul>
			<li>Trait-associated tract analysis from raw dMRI data</li>
			<li>Longitudinal tracking of tract density change</li>
			<li>Statistical reporting with interpretable figures</li>
		</ul>
	</div>
</section>

<section id="services" class="services">
	<div class="section-header">
		<p class="eyebrow">Services</p>
		<h2>Focused analyses for neuroimaging questions.</h2>
	</div>

	<div class="card-grid">
		<article class="card">
			<h3>Trait association analysis</h3>
			<p>
				Identify statistically significant tracts linked to demographic, behavioral, or clinical traits
				using robust diffusion MRI analysis workflows.
			</p>
		</article>

		<article class="card">
			<h3>Longitudinal change analysis</h3>
			<p>
				Track how tract density or microstructural measures evolve over time and summarize meaningful
				changes across visits or cohorts.
			</p>
		</article>

		<article class="card">
			<h3>Clear reporting</h3>
			<p>
				Receive concise reports, statistical summaries, and publication-ready visuals that make your
				findings easy to interpret and share.
			</p>
		</article>
	</div>
</section>

<section class="workflow">
	<div class="section-header">
		<p class="eyebrow">Workflow</p>
		<h2>From data to insight in three steps.</h2>
	</div>

	<div class="steps">
		<div>
			<span>1</span>
			<h3>Share your scans</h3>
			<p>Provide the raw MRI data and any trait or longitudinal metadata you want analyzed.</p>
		</div>
		<div>
			<span>2</span>
			<h3>Run the analysis</h3>
			<p>I process the data and identify significant tract-level patterns with statistical support.</p>
		</div>
		<div>
			<span>3</span>
			<h3>Receive results</h3>
			<p>Get a clear summary of findings, figures, and next-step recommendations.</p>
		</div>
	</div>
</section>

<section class="contact">
	<h2>Interested in a DMRI analysis project?</h2>
	<p>Let’s discuss your dataset, your question, and the kind of tract-level insight you need.</p>
	<a class="button primary" href="mailto:hello@dmrianalytics.example">Start a conversation</a>
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: Inter, 'Segoe UI', Roboto, Arial, sans-serif;
		background: linear-gradient(135deg, #07111f 0%, #10243e 100%);
		color: #f5f7fb;
	}

	:global(*) {
		box-sizing: border-box;
	}

	section {
		width: min(1120px, calc(100% - 2rem));
		margin: 0 auto;
		padding: 4rem 0;
	}

	.hero {
		display: grid;
		grid-template-columns: 1.3fr 0.9fr;
		gap: 2rem;
		align-items: center;
		padding-top: 5rem;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 0.8rem;
		font-weight: 700;
		color: #7dd3fc;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: clamp(2.2rem, 4vw, 3.5rem);
		line-height: 1.1;
		margin: 0 0 1rem;
	}

	.lead {
		font-size: 1.08rem;
		line-height: 1.7;
		max-width: 680px;
		color: #d0dce9;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.button {
		display: inline-block;
		padding: 0.8rem 1.15rem;
		border-radius: 999px;
		text-decoration: none;
		font-weight: 600;
		transition: transform 160ms ease;
	}

	.button:hover {
		transform: translateY(-1px);
	}

	.button.primary {
		background: #7dd3fc;
		color: #02121f;
	}

	.button.secondary {
		border: 1px solid rgba(125, 211, 252, 0.35);
		color: #f5f7fb;
	}

	.hero-card,
	.card,
	.contact {
		background: rgba(255, 255, 255, 0.07);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.13);
		border-radius: 1.2rem;
		padding: 1.4rem;
		box-shadow: 0 18px 45px rgba(0, 0, 0, 0.2);
	}

	.hero-card ul {
		padding-left: 1.1rem;
		line-height: 1.8;
		color: #dce9f7;
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.card h3 {
		margin-top: 0;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.steps div {
		background: rgba(255, 255, 255, 0.05);
		padding: 1.2rem;
		border-radius: 1rem;
	}

	.steps span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: #7dd3fc;
		color: #02121f;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.contact {
		text-align: center;
	}

	@media (max-width: 860px) {
		.hero,
		.card-grid,
		.steps {
			grid-template-columns: 1fr;
		}
	}
</style>

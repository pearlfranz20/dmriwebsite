<svelte:head>
	<title>DMRI Analytics | Diffusion MRI Analysis Services</title>
	<meta
		name="description"
		content="DMRI analysis services for connectometry, longitudinal change analysis, fingerprinting, tractography, and visualization of diffusion MRI data."
	/>
	<meta
		name="keywords"
		content="diffusion MRI, DMRI analysis, connectometry, tractography, neuroimaging, longitudinal MRI analysis"
	/>
	<meta name="author" content="DMRI Analytics" />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href="https://dmri-analytics.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="DMRI Analytics | Diffusion MRI Analysis Services" />
	<meta
		property="og:description"
		content="Turn raw MRI scans into tract-level evidence with connectometry, longitudinal analysis, fingerprinting, and tractography workflows."
	/>
	<meta property="og:url" content="https://dmri-analytics.com/" />
	<meta property="og:site_name" content="DMRI Analytics" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="DMRI Analytics | Diffusion MRI Analysis Services" />
	<meta
		name="twitter:description"
		content="Turn raw MRI scans into tract-level evidence with connectometry, longitudinal analysis, fingerprinting, and tractography workflows."
	/>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "ProfessionalService",
			"name": "DMRI Analytics",
			"url": "https://dmri-analytics.com/",
			"description": "Diffusion MRI analysis services for connectometry, longitudinal change analysis, fingerprinting, tractography, and visualization.",
			"areaServed": "Worldwide",
			"serviceType": ["Diffusion MRI analysis", "Connectometry analysis", "Tractography visualization"]
		}
	</script>
</svelte:head>

<section class="hero">
	<div class="hero-header">
		<p class="eyebrow">DMRI analysis services</p>
	</div>
	<div class="hero-copy">
		<h1>Turn raw MRI scans into tract-level evidence.</h1>
		<p class="lead">
			I help researchers and clinicians analyze diffusion MRI data to build connectometry databases,
			quantify longitudinal change, perform fingerprinting, generate population-average templates,
			and carry out correlational tractography and fiber tracking with visualization.
		</p>
		<div class="actions">
			<a class="button primary" href="/inquiry">Request a consultation</a>
		</div>
	</div>

	<div class="hero-card">
		<h2>What I offer</h2>
		<ul>
			<li>Connectometry database creation and longitudinal change analysis</li>
			<li>Fingerprinting and population-average template generation</li>
			<li>Correlational tractography and fiber tracking with visualization</li>
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
			<h3>Connectometry<br />& longitudinal analysis</h3>
			<p>
				Build connectometry databases and quantify longitudinal changes in tract structure or density over
				time.
			</p>
		</article>

		<article class="card">
			<h3>Fingerprinting<br />& population templates</h3>
			<p>
				Apply fingerprinting approaches and generate population-average templates to summarize group-level
				structure and variability.
			</p>
		</article>

		<article class="card">
			<h3>Correlational tractography<br />& visualization</h3>
			<p>
				Perform correlational tractography analyses and fiber tracking workflows, with visualization that
				supports interpretation and presentation.
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

<section class="qualifications">
	<div class="section-header">
		<p class="eyebrow">Qualifications</p>
		<h2>Training grounded in neuroscience, engineering, and tractography research.</h2>
	</div>
	<p class="qual-paragraph">
		I hold a B.S. in Neuroscience and an M.S. in Biomedical Engineering, and I completed both degrees at
		Carnegie Mellon University. I also did research as part of Dr. Yeh’s fiber tractography work at the
		University of Pittsburgh, which helped shape my quantitative and imaging background and gave me a
		strong foundation for analyzing diffusion MRI data and interpreting tract-level findings.
	</p>
</section>

<section class="contact">
	<h2>Interested in a DMRI analysis project?</h2>
	<p>Let’s discuss your dataset, your question, and the kind of tract-level insight you need.</p>
	<a class="button primary" href="/inquiry">Start a conversation</a>
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
		background: linear-gradient(135deg, #f7fbff 0%, #e4f2ff 45%, #ffe9d6 100%);
		color: #12304a;
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
		padding-top: 3rem;
	}

	.hero-header {
		grid-column: 1 / -1;
		margin-bottom: 0.75rem;
		padding: 0.9rem 0;
		border-bottom: 1px solid rgba(15, 108, 159, 0.16);
		width: 100%;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.18em;
		font-size: 1.25rem;
		font-weight: 800;
		color: #0f6c9f;
		margin: 0 0 0.75rem;
		display: block;
		width: 100%;
	}

	h1 {
		font-family: 'Manrope', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
		font-size: clamp(2.2rem, 4vw, 3.5rem);
		line-height: 1.1;
		margin: 0 0 1rem;
	}

	h2,
	h3 {
		font-family: 'Manrope', 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
	}

	.lead {
		font-size: 1.08rem;
		line-height: 1.7;
		max-width: 680px;
		color: #355066;
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
		background: #1397d8;
		color: #ffffff;
	}

	.button.secondary {
		border: 1px solid rgba(19, 151, 216, 0.25);
		color: #12304a;
		background: rgba(255, 255, 255, 0.7);
	}

	.hero-card,
	.card,
	.contact {
		background: rgba(255, 255, 255, 0.82);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(17, 84, 122, 0.12);
		border-radius: 1.2rem;
		padding: 1.4rem;
		box-shadow: 0 18px 45px rgba(28, 86, 121, 0.16);
	}

	.hero-card ul {
		padding-left: 1.1rem;
		line-height: 1.8;
		color: #355066;
	}

	.hero-image {
		width: 100%;
		height: 220px;
		object-fit: cover;
		border-radius: 1rem;
		margin-top: 1rem;
		display: block;
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.card-grid,
	.qualifications-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.card h3 {
		margin-top: 0;
	}

	.qual-paragraph {
		font-size: 1.05rem;
		line-height: 1.8;
		max-width: 850px;
		color: #355066;
		margin: 0;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.steps div {
		background: rgba(255, 255, 255, 0.7);
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
		background: #1397d8;
		color: #ffffff;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.contact {
		text-align: center;
		margin-bottom: 2rem;
	}

	@media (max-width: 860px) {
		.hero,
		.card-grid,
		.steps {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
	import { site } from '$lib/site';

	const title = `About · ${site.name}`;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content="Who built this site, why, and how the demos work." />
	<link rel="canonical" href="{site.url}/about" />
</svelte:head>

<section class="about wrap">
	<header>
		<p class="eyebrow">About</p>
		<h1>Built by one person who wanted this to exist when they started.</h1>
	</header>

	<div class="cols">
		<div class="body">
			<h2>The author</h2>
			<p>
				I'm {site.author.name}. {site.author.bio} I process diffusion MRI data for research groups,
				and the questions I get asked most often are not about the final statistics but about what
				happened on the way there. This site is the answer I wished I could link to.
			</p>

			<h2>How the demos work</h2>
			<p>
				Every image on the explainer pages is generated from a single synthetic phantom: a 2D "brain
				slice" with CSF, gray matter, white matter, two crossing fiber bundles, and realistic
				relaxation and diffusion parameters. Diffusion signals, k-space, tensor fits, tractography,
				and group statistics are all computed live in your browser from that phantom, with the same
				equations real pipelines use, simplified only where the simplification is stated. No real
				patient data appears anywhere on this site.
			</p>
			<p>
				The viewer page uses <a href="https://niivue.com" rel="noopener">NiiVue</a> to render NIfTI
				files, and small Web Workers to run a linear tensor fit and a k-means segmentation. Files
				you load are read by your browser and never uploaded.
			</p>

			<h2>What this is not</h2>
			<p>
				It is not a processing pipeline you should publish with, and it is not medical advice. The
				in-browser fits skip the correction steps the explainer spends so much time on, precisely so
				you can see what they are for. For real work use the tools named at the end of each step.
			</p>

			<h2>Corrections and questions</h2>
			<p>
				If something is wrong, unclear, or missing, write to
				<a href="mailto:{site.author.email}">{site.author.email}</a>. Corrections from people who
				know a method better than I do are the most useful mail I get.
			</p>
		</div>

		<aside class="side">
			<dl>
				<div>
					<dt>Built with</dt>
					<dd>SvelteKit, NiiVue, hand-written math. No tracking, no cookies.</dd>
				</div>
				<div>
					<dt>Methods referenced</dt>
					<dd>DTI, CSD, GQI, connectometry, correlational tractography, TBSS, permutation inference, N4 bias correction, k-means and probabilistic tissue segmentation, the canonical HRF and the GLM.</dd>
				</div>
				<div>
					<dt>Tools referenced</dt>
					<dd>dcm2niix, MRtrix3, FSL, DSI Studio, DIPY, QSIPrep, ANTs, FreeSurfer, fMRIPrep, SPM, AFNI.</dd>
				</div>
				<div>
					<dt>Contact</dt>
					<dd><a href="mailto:{site.author.email}">{site.author.email}</a></dd>
				</div>
			</dl>
		</aside>
	</div>
</section>

<style>
	.about {
		padding: clamp(3rem, 6vw, 5rem) 0 2rem;
	}

	header {
		max-width: 760px;
		margin-bottom: clamp(2rem, 4vw, 3.5rem);
	}

	h1 {
		font-size: clamp(2.2rem, 4.4vw, 3.4rem);
		font-weight: 400;
		font-variation-settings: 'opsz' 144;
		letter-spacing: -0.025em;
	}

	.cols {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.8fr);
		gap: clamp(2rem, 5vw, 5rem);
		align-items: start;
	}

	.body h2 {
		font-size: 1.4rem;
		margin: 2rem 0 0.6rem;
	}

	.body h2:first-child {
		margin-top: 0;
	}

	.body p {
		color: var(--ink-2);
		margin-bottom: 1rem;
		max-width: 64ch;
	}

	.body a {
		color: var(--accent-ink);
	}

	.side {
		position: sticky;
		top: 5.5rem;
	}

	dl {
		margin: 0;
		display: grid;
		gap: 1rem;
	}

	dl div {
		border-top: 1px solid var(--line);
		padding-top: 0.75rem;
	}

	dt {
		font: 500 0.7rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	dd {
		margin: 0.3rem 0 0;
		font-size: 0.92rem;
		color: var(--ink-2);
	}

	dd a {
		color: var(--accent-ink);
		text-decoration: none;
	}

	@media (max-width: 860px) {
		.cols {
			grid-template-columns: 1fr;
		}

		.side {
			position: static;
		}
	}
</style>

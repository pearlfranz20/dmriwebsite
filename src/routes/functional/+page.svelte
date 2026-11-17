<script lang="ts">
	import Walkthrough from '$lib/components/Walkthrough.svelte';
	import GlmDemo from '$lib/demos/GlmDemo.svelte';
	import GroupStats from '$lib/demos/GroupStats.svelte';
	import { site } from '$lib/site';

	const steps = [
		{ id: 'bold', title: 'What BOLD measures' },
		{ id: 'preprocessing', title: 'Preprocessing' },
		{ id: 'glm', title: 'The general linear model' },
		{ id: 'inference', title: 'Inference and connectivity' }
	];

	const title = `Functional MRI, start to finish · ${site.name}`;
	const description =
		'How the BOLD signal arises, how fMRI time series are preprocessed, how the general linear model turns them into activation maps, and how resting-state connectivity is computed. Interactive demos.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{site.url}/functional" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>

<Walkthrough
	eyebrow="Functional MRI"
	title="From a sluggish blood signal to an activation map."
	lead="Functional MRI never sees neurons. It sees a slow, small change in blood oxygenation that follows neural activity by several seconds, buried under noise that is often larger than the effect. The pipeline is an exercise in knowing exactly what you expect and testing for it."
	{steps}
	accent="#c8b6ff"
>
	<section class="step" id="bold">
		<span class="step-n">01</span>
		<h2>What BOLD measures</h2>
		<p>
			When a patch of cortex works harder it draws more oxygenated blood than it uses. The local
			ratio of oxygenated to deoxygenated hemoglobin shifts, and because deoxyhemoglobin is
			paramagnetic and disturbs the field, the T2* signal in that voxel rises by one or two percent.
			That is the <strong>blood-oxygen-level-dependent</strong> signal. It peaks about five seconds
			after the neural event and takes twenty to settle, a shape called the
			<strong>hemodynamic response function</strong>.
		</p>
		<p>
			An fMRI run is a 4D dataset: a whole-brain T2*-weighted EPI volume every one to three seconds
			(the <strong>TR</strong>), for five to fifteen minutes. Each voxel is a time series of a few
			hundred points. The spatial resolution is coarse, two to three millimetres, and the raw signal
			units are arbitrary; everything meaningful is expressed as percent change.
		</p>
		<div class="aside">
			<p>
				Two study designs dominate. <strong>Task fMRI</strong> presents stimuli on a known
				schedule and looks for voxels whose signal follows it. <strong>Resting-state fMRI</strong>
				presents nothing and looks for voxels whose spontaneous fluctuations are correlated with each
				other. The preprocessing is the same; the statistics are not.
			</p>
		</div>
	</section>

	<section class="step" id="preprocessing">
		<span class="step-n">02</span>
		<h2>Preprocessing</h2>
		<p>
			The effect is one percent. Head motion of a millimetre moves voxels across tissue boundaries
			worth ten times that. Nearly all of fMRI preprocessing exists to remove signal changes that
			are not BOLD.
		</p>
		<ul>
			<li>
				<strong>Motion correction.</strong> Rigid-body registration of every volume to a reference.
				The six estimated parameters are kept and later regressed out, and volumes with large
				framewise displacement are flagged or censored.
			</li>
			<li>
				<strong>Slice-timing correction.</strong> Slices in a volume are acquired at different
				times within the TR; each slice's time series is shifted to a common reference time.
				Matters more for event-related designs and long TRs.
			</li>
			<li>
				<strong>Distortion correction.</strong> EPI stretches near the sinuses, exactly as in
				diffusion MRI. Field maps or reverse-phase-encode images fix it.
			</li>
			<li>
				<strong>Co-registration and normalisation.</strong> Align the functional data to the
				subject's T1, then warp into template space so subjects can be combined.
			</li>
			<li>
				<strong>Spatial smoothing.</strong> A Gaussian blur of four to eight millimetres, which
				improves SNR, makes anatomy overlap better across subjects, and makes the random field
				theory used for inference valid. It also blurs away anything small.
			</li>
			<li>
				<strong>Temporal filtering and nuisance regression.</strong> Remove slow scanner drift,
				and regress out motion parameters, white-matter and CSF signals, and physiological
				noise. For resting-state data this step decides the result more than any other.
			</li>
		</ul>
		<div class="aside pitfall">
			<p>
				Motion is correlated with age, diagnosis, and attention, so motion artifacts masquerade as
				group differences. Report framewise displacement, match groups on it, and treat any
				finding that disappears under stricter motion censoring as a motion finding.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> fMRIPrep (the current standard end-to-end pipeline), FSL FEAT, SPM, AFNI,
			XCP-D for post-processing resting-state data.
		</p>
	</section>

	<section class="step" id="glm">
		<span class="step-n">03</span>
		<h2>The general linear model</h2>
		<p>
			Task analysis is model-based. You know when the stimuli happened, you know the shape of the
			hemodynamic response, so you can predict what a responding voxel's time series should look
			like: the stimulus schedule convolved with the HRF. The <strong>general linear model</strong>
			fits each voxel's measured series as a weighted sum of that prediction plus nuisance
			regressors:
		</p>
		<div class="math">y = X·β + ε</div>
		<p>
			where the columns of X are the predicted response, a constant, drift terms, and the motion
			parameters. The weight β on the task column is the effect size, and dividing it by its
			standard error gives a t-statistic. Do this in every voxel and you have a statistical map.
		</p>

		<GlmDemo />

		<p>
			The quality of the result depends on the quality of the model. A wrong HRF shape, an omitted
			drift term, or an unmodelled motion spike all leak into the residuals, inflate the error
			estimate, and hide real effects, or, if the nuisance happens to correlate with the task,
			invent them.
		</p>
	</section>

	<section class="step" id="inference">
		<span class="step-n">04</span>
		<h2>Inference and connectivity</h2>
		<p>
			A whole-brain map has a hundred thousand voxels, each with a t-statistic. At p &lt; 0.05 you
			would expect five thousand false positives. Three approaches control that.
		</p>
		<ul>
			<li>
				<strong>Voxel-wise family-wise error</strong> correction, via random field theory or
				permutation. Strict, and safe.
			</li>
			<li>
				<strong>Cluster-level inference</strong>: threshold the map, then ask whether a cluster of
				that size could occur by chance. More sensitive, but cluster-forming thresholds that are too
				lenient produce false-positive rates far above nominal, a widely discussed problem since
				2016. Permutation-based cluster inference avoids the parametric assumptions.
			</li>
			<li>
				<strong>Region-of-interest analysis</strong>: decide the regions beforehand, average
				within them, and run a handful of tests instead of a hundred thousand.
			</li>
		</ul>

		<GroupStats
			metric="% signal change"
			context="strip of cortex"
			caption="Top: mean BOLD response along a strip of cortex for two groups, with a real difference planted in the shaded span. Bottom: the t-statistic at each position. The dashed line is p < 0.05 applied separately at every position; the solid line is the threshold from permuting group labels and recording the largest statistic each time. Scale this from 60 positions to 100,000 voxels and the gap between the two lines is the entire multiple-comparisons problem."
		/>

		<h3>Resting-state connectivity</h3>
		<p>
			Without a task there is nothing to model, so the analysis turns to correlation. Pick a seed
			region or a parcellation, extract the mean time series of each region, and correlate them
			pairwise. The resulting matrix is a <strong>functional connectome</strong>, and the graph
			theory applied to it is where "networks" such as the default mode network come from.
			Everything that was said about motion applies twice over, because motion raises correlations
			between nearby regions and lowers them between distant ones in a way that looks exactly like
			a group effect.
		</p>
		<p class="tools">
			<b>Tools:</b> <code>randomise</code> (FSL) for permutation inference, SPM and FSL cluster
			tools, CONN and nilearn for connectivity, the Schaefer and Glasser parcellations.
		</p>
	</section>
</Walkthrough>

<section class="next wrap">
	<div class="next-inner">
		<div>
			<p class="eyebrow">Keep going</p>
			<h2>See how the same ideas play out in diffusion MRI</h2>
			<p>Distortion correction, registration, and permutation inference all reappear, with a different signal and a different set of traps.</p>
		</div>
		<a class="btn btn-primary" href="/diffusion">Diffusion walkthrough</a>
	</div>
</section>

<style>
	.next {
		padding: 1rem 0 2rem;
	}

	.next-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: clamp(1.5rem, 3vw, 2.5rem);
		border-radius: var(--radius-lg);
		background: var(--navy);
		color: #e9eef2;
	}

	.next-inner .eyebrow {
		color: #c8b6ff;
	}

	.next-inner h2 {
		font-size: clamp(1.5rem, 2.6vw, 2rem);
		margin-bottom: 0.5rem;
	}

	.next-inner p:not(.eyebrow) {
		color: #b4c0cb;
		max-width: 52ch;
	}

	.next-inner .btn {
		flex: none;
		background: #fff;
		color: var(--ink);
	}

	@media (max-width: 640px) {
		.next-inner {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>

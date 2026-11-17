<script lang="ts">
	import Walkthrough from '$lib/components/Walkthrough.svelte';
	import SignalDecay from '$lib/demos/SignalDecay.svelte';
	import DwiPhantom from '$lib/demos/DwiPhantom.svelte';
	import KSpace from '$lib/demos/KSpace.svelte';
	import EddyDemo from '$lib/demos/EddyDemo.svelte';
	import TensorEllipsoid from '$lib/demos/TensorEllipsoid.svelte';
	import CrossingOdf from '$lib/demos/CrossingOdf.svelte';
	import Tractography2D from '$lib/demos/Tractography2D.svelte';
	import GroupStats from '$lib/demos/GroupStats.svelte';
	import { site } from '$lib/site';

	const steps = [
		{ id: 'acquisition', title: 'What the scanner measures' },
		{ id: 'dataset', title: 'What a dataset looks like' },
		{ id: 'artifacts', title: 'Artifacts and k-space' },
		{ id: 'preprocessing', title: 'Preprocessing' },
		{ id: 'tensor', title: 'Fitting the tensor' },
		{ id: 'crossing', title: 'Beyond the tensor' },
		{ id: 'tractography', title: 'Tractography' },
		{ id: 'statistics', title: 'Group analysis' }
	];

	const title = `Diffusion MRI, start to finish · ${site.name}`;
	const description =
		'An interactive walkthrough of the diffusion MRI pipeline: acquisition, artifacts, preprocessing, tensor fitting, crossing fibers, tractography, and group statistics, with live demos on synthetic data.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{site.url}/diffusion" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>

<Walkthrough
	eyebrow="Diffusion MRI"
	title="From water molecules to white-matter statistics."
	lead="Diffusion MRI measures how far water travels in a few tens of milliseconds. Because axons get in the way, that measurement carries the orientation and integrity of white matter. Getting from the raw signal to a defensible result takes eight steps. Every one of them has a demo you can break."
	{steps}
	accent="#2cc1c8"
>
	<!-- 1 -->
	<section class="step" id="acquisition">
		<span class="step-n">01</span>
		<h2>What the scanner measures</h2>
		<p>
			A diffusion-weighted sequence applies two strong, brief magnetic field gradients separated by a
			short delay. The first one tags each water molecule with a phase that depends on its position.
			The second one undoes that tag, but only for molecules that have not moved. Molecules that
			diffused during the delay end up with a leftover phase, and their signals no longer add up
			coherently. The more motion along the gradient direction, the more signal is lost.
		</p>
		<p>
			How aggressively the sequence probes diffusion is summarised by the <strong>b-value</strong>, in
			s/mm². It combines gradient strength, duration, and the delay between the two pulses. For simple
			Gaussian diffusion the measured signal is
		</p>
		<div class="math">S(b) = S₀ · exp(−b · D)</div>
		<p>
			where <strong>D</strong> is the apparent diffusion coefficient along the gradient direction. In
			the brain, D is about 3 µm²/ms in cerebrospinal fluid, under 1 in gray matter, and in white
			matter it depends on where you look: roughly 1.7 along a bundle and 0.3 across it. That
			directional dependence is the entire reason the method works.
		</p>

		<SignalDecay />

		<div class="aside">
			<p>
				Typical clinical research protocols use b = 1000 s/mm² with 30 to 64 gradient directions.
				Multi-shell protocols add b = 2000 or 3000 to support richer models. Higher b means more
				contrast between fiber populations and less signal overall, so the two are always traded
				against each other.
			</p>
		</div>
	</section>

	<!-- 2 -->
	<section class="step" id="dataset">
		<span class="step-n">02</span>
		<h2>What a diffusion dataset looks like</h2>
		<p>
			A diffusion acquisition is not one image. It is a stack: a few images with no diffusion
			weighting (the <strong>b=0</strong> volumes, which look like a blurry T2-weighted scan), then one
			volume per gradient direction. Each of those is the same slice with signal removed wherever water
			moved along that particular direction. The dataset arrives as a 4D NIfTI file plus two text files,
			<code>.bval</code> and <code>.bvec</code>, listing the b-value and the unit gradient vector for
			every volume.
		</p>

		<DwiPhantom />

		<p>
			Look at the two vertical bundles when the gradient points straight up: they darken, because water
			slides freely along the axons. Turn the gradient horizontal and they brighten, because membranes
			hinder motion across the fibers. The curved bundle shows the same effect but in a direction that
			changes along its length. A single voxel's signal across all directions is what every later model
			works from.
		</p>

		<div class="aside pitfall">
			<p>
				The <code>.bvec</code> file is written in the scanner's or converter's coordinate frame, not
				necessarily the image's. A sign flip in one axis produces tracts that look plausible and are
				completely wrong. Always check the gradient table visually, for example by confirming the
				corpus callosum is red (left–right) on a direction-encoded map.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> dcm2niix converts DICOM to NIfTI and writes the bval/bvec files. <code>dwigradcheck</code>
			in MRtrix3 tests the gradient table by running short tractography with each possible flip.
		</p>
	</section>

	<!-- 3 -->
	<section class="step" id="artifacts">
		<span class="step-n">03</span>
		<h2>Artifacts, and where they come from</h2>
		<p>
			Diffusion images are acquired with echo-planar imaging, which reads an entire slice in about
			50 ms to freeze motion. The price is that EPI is fragile. Three artifacts show up in almost every
			dataset, and all three are easiest to understand in <strong>k-space</strong>, the grid of
			spatial frequencies the scanner actually samples. The image is the inverse Fourier transform of
			that grid.
		</p>

		<KSpace />

		<h3>Noise</h3>
		<p>
			Diffusion weighting throws signal away on purpose, so these are among the noisiest images in
			MRI. Worse, the magnitude operation turns zero-mean Gaussian noise into a <strong>Rician</strong>
			distribution with a positive floor, which biases every later estimate upward at low signal. Modern
			pipelines denoise first, usually with Marchenko–Pastur PCA, which separates the noise
			eigenvalues of a local patch from the signal ones.
		</p>
		<h3>Gibbs ringing</h3>
		<p>
			The scanner only samples k-space out to some maximum frequency. Truncating a Fourier series makes
			sharp edges overshoot and ring. Around the ventricles the ringing can push a white-matter voxel's
			b=0 signal below its diffusion-weighted signal, producing a negative diffusivity. Partial
			Fourier acquisitions make it worse. The standard fix shifts the image by sub-voxel amounts to find
			the position that minimises the oscillation.
		</p>
		<h3>Motion</h3>
		<p>
			If the head moves during a few phase-encode lines, those lines carry the wrong phase, and the
			reconstruction smears copies of the brain along the phase-encode axis. Within a single EPI shot
			this is rare, but slow drift between volumes is universal and is handled in the next step.
		</p>
		<p class="tools">
			<b>Tools:</b> <code>dwidenoise</code> and <code>mrdegibbs</code> (MRtrix3), Patch2Self (DIPY).
		</p>
	</section>

	<!-- 4 -->
	<section class="step" id="preprocessing">
		<span class="step-n">04</span>
		<h2>Preprocessing: making the volumes agree</h2>
		<p>
			Every model in the next steps assumes that voxel (x, y, z) refers to the same piece of tissue in
			all 60-odd volumes. Three things break that assumption.
		</p>
		<ul>
			<li>
				<strong>Eddy currents.</strong> Switching the diffusion gradients on and off induces currents
				in the scanner's conductors, which produce their own small, slowly decaying fields. Each
				gradient direction induces a different one, so each volume is stretched, sheared, and shifted
				slightly differently along the phase-encode axis.
			</li>
			<li>
				<strong>Subject motion.</strong> A diffusion scan takes five to fifteen minutes. People drift.
				Each volume ends up in a slightly different position, and the gradient table needs rotating to
				match.
			</li>
			<li>
				<strong>Susceptibility distortion.</strong> Air in the sinuses and ear canals warps the main
				field, and EPI's slow phase-encode direction turns that into stretching and pile-up of signal
				near the frontal and temporal poles. It is the same in every volume, so it is fixed separately,
				usually from a pair of b=0 images acquired with opposite phase-encode directions.
			</li>
		</ul>

		<EddyDemo />

		<p>
			Notice what misalignment does to the fit: FA lights up around every edge, because the model
			sees a signal that changes between volumes and attributes it to anisotropy. The directions in the
			color map become noisy. None of this is subtle, and none of it is reversible once a model has been
			fit. Preprocessing is not optional.
		</p>
		<p class="tools">
			<b>Tools:</b> <code>topup</code> and <code>eddy</code> (FSL), <code>dwifslpreproc</code> (MRtrix3 wrapper),
			QSIPrep (an end-to-end preprocessing pipeline), SynB0-DisCo for distortion correction without a
			reverse-phase scan.
		</p>
	</section>

	<!-- 5 -->
	<section class="step" id="tensor">
		<span class="step-n">05</span>
		<h2>Fitting a model: the diffusion tensor</h2>
		<p>
			With clean, aligned volumes, each voxel has one signal value per gradient direction. The oldest
			and still most common model, <strong>diffusion tensor imaging</strong>, assumes diffusion is
			Gaussian but can differ by direction, which is exactly a 3×3 symmetric matrix D. The signal
			model becomes
		</p>
		<div class="math">S(b, g) = S₀ · exp(−b · gᵀ D g)</div>
		<p>
			Taking the logarithm makes this linear in the six unknown elements of D plus ln S₀, so with at
			least seven measurements (one b=0 and six directions) it is an ordinary least-squares problem. In
			practice 30 or more directions are used to beat down noise. Decomposing D into eigenvalues and
			eigenvectors gives everything the field reports:
		</p>
		<ul>
			<li><strong>Mean diffusivity (MD)</strong>: the average of the three eigenvalues. Overall mobility.</li>
			<li>
				<strong>Fractional anisotropy (FA)</strong>: how unequal the eigenvalues are, from 0 (sphere)
				to 1 (line). The most-reported number in the field.
			</li>
			<li><strong>Axial and radial diffusivity</strong>: the largest eigenvalue, and the mean of the other two.</li>
			<li><strong>The principal eigenvector</strong>: the estimated fiber direction, shown as red–green–blue for left–right, front–back, up–down.</li>
		</ul>

		<TensorEllipsoid />

		<div class="aside pitfall">
			<p>
				FA is not a measure of "white-matter integrity", however often the phrase appears. It drops
				when fibers cross, when axons fan, when a bundle is partial-volumed with cortex, and when
				SNR falls. It rises in the ventricle edge voxels that Gibbs ringing corrupts. Interpreting an
				FA change requires knowing which of those changed.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> <code>dtifit</code> (FSL), <code>dwi2tensor</code> (MRtrix3), DIPY's <code>TensorModel</code>,
			DSI Studio's reconstruction step.
		</p>
	</section>

	<!-- 6 -->
	<section class="step" id="crossing">
		<span class="step-n">06</span>
		<h2>Beyond the tensor: crossing fibers</h2>
		<p>
			A 2 mm voxel contains hundreds of thousands of axons, and in most of the white matter they do
			not all point the same way. Where the corpus callosum passes through the corticospinal tract,
			or where association bundles fan into cortex, a single ellipsoid cannot describe what is there.
			The tensor fit does not fail loudly; it returns a flattened disc with a low FA and a principal
			direction that points between the bundles.
		</p>

		<CrossingOdf />

		<p>
			Models that handle this estimate an <strong>orientation distribution function</strong>, a
			function on the sphere with a peak for each fiber population, instead of a single direction.
			The main families:
		</p>
		<ul>
			<li>
				<strong>Constrained spherical deconvolution (CSD)</strong> assumes every bundle has the same
				response function, measured from the most coherent voxels, and deconvolves it out of the
				signal to leave the fiber orientation distribution.
			</li>
			<li>
				<strong>Q-ball and generalized q-sampling imaging (GQI)</strong> reconstruct the diffusion ODF
				more directly from the signal without assuming a response function. GQI is what DSI Studio
				uses, and it works on any sampling scheme.
			</li>
			<li>
				<strong>Multi-compartment models</strong> such as NODDI or ball-and-stick fit explicit tissue
				compartments and report their volume fractions, at the cost of stronger assumptions.
			</li>
		</ul>
		<p>
			These need more and higher-b measurements than a tensor, which is why modern protocols are
			multi-shell. For scalar metrics GQI gives <strong>quantitative anisotropy (QA)</strong> per fiber
			peak rather than one FA per voxel, which is what makes tract-specific statistics possible later.
		</p>
	</section>

	<!-- 7 -->
	<section class="step" id="tractography">
		<span class="step-n">07</span>
		<h2>Tractography</h2>
		<p>
			Tractography reconstructs the long-range path of bundles by following local fiber directions
			from voxel to voxel. The deterministic version is nothing more than numerical integration:
			start at a seed, read the direction, step a fraction of a voxel, read again. Three parameters
			govern nearly everything about the result.
		</p>
		<ul>
			<li><strong>Step size</strong>: smaller follows curves better and takes longer.</li>
			<li><strong>Angular threshold</strong>: the sharpest turn allowed between steps. Too permissive and streamlines jump between bundles; too strict and they stop in curved ones.</li>
			<li><strong>Termination threshold</strong>: stop when anisotropy drops, which keeps streamlines out of gray matter and CSF but also kills them in crossings if the metric is FA.</li>
		</ul>

		<Tractography2D />

		<p>
			<strong>Probabilistic</strong> tractography samples the direction from the ODF instead of taking
			its peak, producing thousands of slightly different streamlines whose density reflects
			uncertainty. It finds more of the true pathways and also more false ones. Either way, the output
			is a set of polylines, and the step that matters most is the one after: filtering, by anatomical
			constraints, by whether a streamline connects plausible endpoints, or by whether its path is
			consistent with the signal (SIFT, LiFE).
		</p>
		<div class="aside pitfall">
			<p>
				A streamline is a hypothesis, not an axon. Tractography has a known tendency to generate many
				more false-positive bundles than false negatives, and the count of streamlines between two
				regions is not a measure of connection strength. Treat tracts as regions of interest for
				measuring something else, not as the measurement itself.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> <code>tckgen</code> and <code>tcksift</code> (MRtrix3), DSI Studio's fiber tracking with
			its automatic tract recognition, DIPY's <code>LocalTracking</code>, TrackVis.
		</p>
	</section>

	<!-- 8 -->
	<section class="step" id="statistics">
		<span class="step-n">08</span>
		<h2>Group analysis: turning maps into a claim</h2>
		<p>
			Every subject now has a map of FA, QA, or whatever metric the model produced, and a set of
			tracts. The research question is almost always comparative: does the metric differ between
			groups, change over time, or correlate with a score? Three strategies dominate.
		</p>
		<ul>
			<li>
				<strong>Region or tract averaging.</strong> Define a bundle, average the metric inside it,
				get one number per subject, run an ordinary test. Robust, low-powered, and blind to where
				along the bundle the effect sits.
			</li>
			<li>
				<strong>Voxel-wise and skeleton-based comparison (TBSS).</strong> Warp every subject's map to a
				template, project onto a white-matter skeleton to limit misalignment, test every skeleton
				voxel. The multiple-comparison problem is enormous, so inference is permutation-based.
			</li>
			<li>
				<strong>Connectometry and correlational tractography.</strong> Instead of testing voxels, test
				local fiber segments and track along the ones whose metric correlates with the variable of
				interest. The result is a tract, not a blob, and significance comes from permuting the
				variable and tracking again to see how long a spurious tract can get.
			</li>
		</ul>

		<GroupStats />

		<p>
			The common thread is <strong>permutation</strong>. Every method above runs the analysis many
			times on shuffled labels and asks how extreme the real result is against that distribution. It is
			slow, it is honest, and it is the only part of the pipeline that directly controls how often you
			publish noise.
		</p>
		<div class="aside">
			<p>
				Before any of this works, subjects must be in a common space. For diffusion data that means
				either warping scalar maps with a nonlinear registration or, in DSI Studio's case, building
				a population-average template of the ODFs themselves so that fiber orientations, not just
				intensities, align across people.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> <code>randomise</code> and TBSS (FSL), DSI Studio connectometry, <code>fixelcfestats</code>
			(MRtrix3's fixel-based analysis), TractSeg for automatic bundle segmentation.
		</p>
	</section>
</Walkthrough>

<section class="next wrap">
	<div class="next-inner">
		<div>
			<p class="eyebrow">Try it on real data</p>
			<h2>Fit a tensor to your own scan</h2>
			<p>Load a NIfTI file with its bval and bvec in the browser and get FA, MD, and a direction map. Nothing is uploaded.</p>
		</div>
		<a class="btn btn-primary" href="/viewer">Open the viewer</a>
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
		color: #6fd3e4;
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

<script lang="ts">
	import Walkthrough from '$lib/components/Walkthrough.svelte';
	import ContrastDemo from '$lib/demos/ContrastDemo.svelte';
	import KSpace from '$lib/demos/KSpace.svelte';
	import SegmentationDemo from '$lib/demos/SegmentationDemo.svelte';
	import RegistrationDemo from '$lib/demos/RegistrationDemo.svelte';
	import { site } from '$lib/site';

	const steps = [
		{ id: 'contrast', title: 'Where contrast comes from' },
		{ id: 'reconstruction', title: 'From k-space to image' },
		{ id: 'cleanup', title: 'Bias field and skull stripping' },
		{ id: 'segmentation', title: 'Segmentation and volumes' },
		{ id: 'registration', title: 'Registration and templates' }
	];

	const title = `Structural MRI, start to finish · ${site.name}`;
	const description =
		'How T1, T2, and FLAIR images get their contrast, and how a structural scan is reconstructed, bias-corrected, skull-stripped, segmented, and registered to a template. Interactive demos on synthetic data.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{site.url}/structural" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>

<Walkthrough
	eyebrow="Structural MRI"
	title="From relaxation times to cortical thickness."
	lead="A structural scan is the anatomical backbone of nearly every study: the image other modalities are aligned to, the source of tissue volumes and cortical thickness, and the thing a radiologist actually reads. Its pipeline is shorter than diffusion's but every step is reused by the others."
	{steps}
	accent="#ff9f43"
>
	<section class="step" id="contrast">
		<span class="step-n">01</span>
		<h2>Where contrast comes from</h2>
		<p>
			MRI does not image tissue directly. It tips the magnetisation of hydrogen nuclei out of
			alignment and listens to them relax back. Two time constants describe that relaxation and
			differ by tissue: <strong>T1</strong>, how fast longitudinal magnetisation recovers, and
			<strong>T2</strong>, how fast transverse magnetisation decays. A third quantity,
			<strong>proton density</strong>, is simply how much water is there.
		</p>
		<p>
			A sequence chooses how much each of these matters through its timing. For a spin echo:
		</p>
		<div class="math">S = PD · (1 − exp(−TR / T1)) · exp(−TE / T2)</div>
		<p>
			Short TR punishes tissue with slow T1 recovery, long TE punishes tissue with fast T2 decay.
			White matter has the fastest T1, cerebrospinal fluid by far the slowest, which is why the same
			head can look like a negative of itself between two scans acquired minutes apart.
		</p>

		<ContrastDemo />

		<p>
			Most research protocols acquire a high-resolution 3D T1-weighted image (MPRAGE or similar,
			around 1 mm isotropic) as the anatomical reference. T2-weighted and FLAIR scans are added
			when lesions, edema, or ventricles are the question. FLAIR is T2 contrast with the CSF signal
			nulled by an inversion pulse, so a bright periventricular lesion no longer hides next to bright
			ventricles.
		</p>
		<p class="tools">
			<b>Tools:</b> contrast is fixed at acquisition; the choice lives in the sequence protocol, not
			in software.
		</p>
	</section>

	<section class="step" id="reconstruction">
		<span class="step-n">02</span>
		<h2>From k-space to image</h2>
		<p>
			The scanner samples spatial frequencies, not pixels. Each readout traverses a line of
			k-space, and the image is the inverse Fourier transform of the full grid. Resolution is set by
			how far out in k-space you sample; field of view by how finely. Three artifacts that every
			analyst meets live here.
		</p>

		<KSpace />

		<ul>
			<li>
				<strong>Gibbs ringing</strong> at sharp edges, from truncating the sampled frequencies. On
				T1 images it shows up as faint stripes parallel to the skull and ventricles.
			</li>
			<li>
				<strong>Motion</strong> during acquisition corrupts phase-encode lines and ghosts the whole
				image. Structural scans take five to eight minutes, so this is the most common reason a
				scan is unusable. Prospective motion correction and quick quality ratings catch it.
			</li>
			<li>
				<strong>Noise</strong>, which for parallel-imaging reconstructions is also spatially
				varying, denser where the coils see less.
			</li>
		</ul>
		<p>
			Reconstruction happens on the scanner and produces DICOM files; the first software step in
			any pipeline is converting them to NIfTI, a single header plus voxel array with an affine
			matrix that says where in the scanner each voxel sits. That affine is the thread every later
			step depends on.
		</p>
		<p class="tools">
			<b>Tools:</b> dcm2niix for conversion, MRIQC for automated quality metrics.
		</p>
	</section>

	<section class="step" id="cleanup">
		<span class="step-n">03</span>
		<h2>Bias field and skull stripping</h2>
		<p>
			The receive coil is closer to some parts of the head than others, so the same tissue is
			brighter near the coil elements and darker in the centre. The result is a smooth
			multiplicative <strong>bias field</strong> across the image. Human eyes ignore it. Intensity
			classifiers do not. Bias correction estimates that smooth field, usually by iteratively
			sharpening the intensity histogram, and divides it out.
		</p>
		<p>
			<strong>Skull stripping</strong> removes everything that is not brain: scalp, skull, eyes,
			neck. It matters because the next steps are statistical, and fat in the scalp has a T1
			signal that looks like white matter. Historically a source of endless manual fixing; deep
			learning tools have made it close to solved for healthy adult heads.
		</p>
		<div class="aside pitfall">
			<p>
				Skull stripping fails quietly at the inferior temporal lobes and the top of the cortex.
				Check the mask on every subject before anything is computed from it. The same goes for
				bias correction on scans with large lesions, where the "smooth field" assumption breaks.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> N4BiasFieldCorrection (ANTs), <code>bet</code> (FSL), SynthStrip (FreeSurfer),
			HD-BET.
		</p>
	</section>

	<section class="step" id="segmentation">
		<span class="step-n">04</span>
		<h2>Segmentation and volumes</h2>
		<p>
			With a clean, bias-corrected T1 image, voxels can be assigned to tissue. The simplest
			approach is to cluster intensities: on a T1 image, CSF is darkest, gray matter in the middle,
			white matter brightest. Real tools add two things on top of that: a <strong>spatial prior</strong>
			(an atlas saying how likely each tissue is at each location) and a model of
			<strong>partial volume</strong>, since a 1 mm voxel at the cortical boundary contains both
			gray and white matter.
		</p>

		<SegmentationDemo />

		<p>
			From the segmentation come the numbers people report: total intracranial volume, gray and
			white matter volume, ventricle volume, and, via a very different surface-based pipeline,
			<strong>cortical thickness</strong>. The surface approach fits a mesh to the white-matter
			boundary and another to the pial surface and measures the distance between them, which
			sidesteps the voxel grid entirely and is far more sensitive to thinning than volume is.
		</p>
		<div class="aside pitfall">
			<p>
				Volumes depend on the scanner, the sequence, the software version, and the head size.
				Compare within a study processed identically, normalise by intracranial volume when the
				question is relative, and never mix FreeSurfer versions in one cohort.
			</p>
		</div>
		<p class="tools">
			<b>Tools:</b> <code>fast</code> (FSL), SPM's unified segmentation, FreeSurfer's <code>recon-all</code>
			for surfaces and thickness, FastSurfer and SynthSeg for fast deep-learning equivalents.
		</p>
	</section>

	<section class="step" id="registration">
		<span class="step-n">05</span>
		<h2>Registration and templates</h2>
		<p>
			Almost every multi-subject analysis needs voxels to correspond across people, and almost every
			multi-modal analysis needs a subject's diffusion or functional data aligned to their own
			anatomy. Both are registration: find the transform that maps one image onto another by
			minimising a cost function.
		</p>

		<RegistrationDemo />

		<p>
			The demo uses six parameters (really three, in 2D). Real registration climbs a ladder:
		</p>
		<ul>
			<li><strong>Rigid</strong>: rotation and translation. Same person, different session.</li>
			<li><strong>Affine</strong>: adds scaling and shear. Gross size differences between people.</li>
			<li>
				<strong>Nonlinear (deformable)</strong>: a smooth warp field with millions of parameters,
				regularised so it stays plausible. This is what maps individual anatomy onto a template
				such as MNI152.
			</li>
		</ul>
		<p>
			The cost function matters as much as the transform. Mean squared difference only works when
			intensities match; <strong>mutual information</strong> handles different contrasts, which is
			how a T1 and a b=0 diffusion image can be aligned at all. Everything downstream, from
			voxel-based morphometry to the TBSS skeleton in the diffusion walkthrough, inherits whatever
			misalignment survives this step.
		</p>
		<p class="tools">
			<b>Tools:</b> <code>flirt</code> and <code>fnirt</code> (FSL), ANTs <code>antsRegistration</code>
			(the usual accuracy benchmark), SPM normalise, <code>bbregister</code> for boundary-based
			functional-to-anatomical alignment.
		</p>
	</section>
</Walkthrough>

<section class="next wrap">
	<div class="next-inner">
		<div>
			<p class="eyebrow">Try it on real data</p>
			<h2>Segment your own T1</h2>
			<p>Load a structural NIfTI and run a three-class segmentation in the browser. See where intensity alone gets it right and where it needs priors.</p>
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
		color: #ffd27a;
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

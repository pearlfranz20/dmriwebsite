/**
 * Site-wide settings. Edit here and every page picks the change up.
 */
export const site = {
	// Working title. Rename freely.
	name: 'Scan to Result',
	tagline: 'How a brain MRI becomes a number you can trust.',
	description:
		'An interactive walkthrough of how diffusion, structural, and functional brain MRI are processed, with live demos and an in-browser viewer that can process your own NIfTI files.',
	url: 'https://dmri-analytics.com',
	author: {
		// TODO: replace with your real name.
		name: 'Pearl Franz',
		email: 'pfranz@alumni.cmu.edu',
		bio: 'B.S. Neuroscience and M.S. Biomedical Engineering, Carnegie Mellon University. Research in fiber tractography in Dr. Yeh’s lab at the University of Pittsburgh.'
	}
};

export const modalities = [
	{
		slug: 'diffusion',
		title: 'Diffusion MRI',
		short: 'dMRI',
		blurb: 'From water molecules bumping into axons to tract-level statistics. The full pipeline, with the places it goes wrong.',
		steps: 8,
		accent: '#2cc1c8'
	},
	{
		slug: 'structural',
		title: 'Structural MRI',
		short: 'T1 · T2 · FLAIR',
		blurb: 'Why tissue looks bright or dark, and how a T1 image turns into segmentations, volumes, and a common space.',
		steps: 5,
		accent: '#ff9f43'
	},
	{
		slug: 'functional',
		title: 'Functional MRI',
		short: 'BOLD',
		blurb: 'A slow blood-flow signal, a model of what it should look like, and the statistics that turn it into a map.',
		steps: 4,
		accent: '#c8b6ff'
	}
] as const;

export type ModalitySlug = (typeof modalities)[number]['slug'];

<script lang="ts">
	let name = $state('');
	let email = $state('');
	let message = $state('');
	let submitted = $state(false);
	let statusMessage = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();
		const trimmedMessage = message.trim();

		if (!trimmedName || !trimmedEmail || !trimmedMessage) {
			submitted = false;
			statusMessage = 'Please fill in your name, email, and project details.';
			return;
		}

		isSubmitting = true;
		statusMessage = 'Sending…';

		try {
			const response = await fetch('/api/inquiry', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					name: trimmedName,
					email: trimmedEmail,
					message: trimmedMessage
				})
			});

			if (!response.ok) {
				throw new Error('Unable to send your message right now.');
			}

			submitted = true;
			statusMessage = 'Thanks! Your message was sent successfully.';
			name = '';
			email = '';
			message = '';
		} catch (error) {
			submitted = false;
			statusMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Contact | DMRI Analytics</title>
	<meta name="description" content="Submit an inquiry for diffusion MRI analysis services, including connectometry, tractography, and longitudinal tract change workflows." />
	<meta name="robots" content="index,follow" />
	<link rel="canonical" href="https://dmri-analytics.com/inquiry" />
	<meta property="og:title" content="Contact DMRI Analytics" />
	<meta
		property="og:description"
		content="Request a consultation for diffusion MRI analysis, tractography, and longitudinal MRI data workflows."
	/>
	<meta property="og:url" content="https://dmri-analytics.com/inquiry" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Contact DMRI Analytics" />
	<meta
		name="twitter:description"
		content="Request a consultation for diffusion MRI analysis, tractography, and longitudinal MRI data workflows."
	/>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebPage",
			"name": "Contact DMRI Analytics",
			"url": "https://dmri-analytics.com/inquiry",
			"description": "Contact page for diffusion MRI analysis consultation and inquiry requests."
		}
	</script>
</svelte:head>

<section class="page">
	<div class="card">
		<p class="eyebrow">Inquiry form</p>
		<h1>Tell me about your DMRI project.</h1>
		<p class="lead">
			Share a bit about your dataset, the questions you want to answer, the analysis workflow you’re
			interested in, and the timeline you have in mind. I can work with diffusion MRI data in DICOM,
			NIfTI, Bruker 2dseq, and Varian fdf formats.
		</p>

		<form on:submit|preventDefault={handleSubmit}>
			<label>
				<span>Name</span>
				<input type="text" name="name" bind:value={name} placeholder="Your name" />
			</label>

			<label>
				<span>Email</span>
				<input type="email" name="email" bind:value={email} placeholder="you@example.com" />
			</label>

			<label>
				<span>Project details</span>
				<textarea name="message" rows="6" bind:value={message} placeholder="Describe the MRI data, analysis goals, and any timeline considerations."></textarea>
			</label>

			{#if statusMessage}
				<p class={submitted ? 'success' : 'error'} role="status" aria-live="polite">
					{statusMessage}
				</p>
			{/if}

			<button type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Sending…' : 'Send inquiry'}
			</button>
		</form>
	</div>
</section>

<style>
	:global(body) {
		margin: 0;
		font-family: Inter, 'Segoe UI', Roboto, Arial, sans-serif;
		background: linear-gradient(135deg, #f7fbff 0%, #e4f2ff 45%, #ffe9d6 100%);
		color: #12304a;
	}

	.page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.card {
		width: min(700px, 100%);
		background: rgba(255, 255, 255, 0.84);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(17, 84, 122, 0.12);
		border-radius: 1.2rem;
		padding: 2rem;
		box-shadow: 0 18px 45px rgba(28, 86, 121, 0.16);
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 0.8rem;
		font-weight: 700;
		color: #0f6c9f;
		margin-bottom: 0.75rem;
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: clamp(1.8rem, 3vw, 2.5rem);
	}

	.lead {
		line-height: 1.7;
		color: #355066;
		margin-bottom: 1.5rem;
	}

	form {
		display: grid;
		gap: 1rem;
	}

	label {
		display: grid;
		gap: 0.4rem;
		font-weight: 600;
		color: #12304a;
	}

	input,
	textarea {
		width: 100%;
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(17, 84, 122, 0.2);
		border-radius: 0.75rem;
		font: inherit;
		background: #fdfefe;
		color: #12304a;
	}

	button {
		border: none;
		padding: 0.9rem 1.1rem;
		border-radius: 999px;
		background: #1397d8;
		color: #ffffff;
		font-weight: 700;
		cursor: pointer;
		justify-self: start;
	}

	button:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	.success,
	.error {
		margin: 0;
		padding: 0.8rem 1rem;
		border-radius: 0.8rem;
		font-weight: 600;
	}

	.success {
		background: #e8f8ee;
		color: #1f6b3a;
		border: 1px solid rgba(31, 107, 58, 0.2);
	}

	.error {
		background: #fff1f0;
		color: #a33a2f;
		border: 1px solid rgba(163, 58, 47, 0.2);
	}
</style>

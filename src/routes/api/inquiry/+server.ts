import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { Resend } from 'resend';

const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
const recipientEmail = env.CONTACT_TO_EMAIL || process.env.CONTACT_TO_EMAIL || 'pfranz@alumni.cmu.edu';
const resend = new Resend(resendApiKey);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') || '';
		const rawBody = await request.text();
		let name = '';
		let email = '';
		let message = '';

		console.log('inquiry content-type:', contentType);
		console.log('inquiry raw body:', rawBody);

		if (!rawBody) {
			return new Response(JSON.stringify({ error: 'Missing request body.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			});
		}

		if (contentType.includes('application/json')) {
			const data = JSON.parse(rawBody);
			name = data.name || '';
			email = data.email || '';
			message = data.message || '';
		} else {
			const formData = new URLSearchParams(rawBody);
			name = formData.get('name') || '';
			email = formData.get('email') || '';
			message = formData.get('message') || '';
		}

		if (!name || !email || !message) {
			return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			});
		}

		if (!resendApiKey) {
			return new Response(JSON.stringify({ error: 'Email delivery is not configured.' }), {
				status: 500,
				headers: { 'content-type': 'application/json' }
			});
		}

		const subject = `DMRI inquiry from ${name}`;
		const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

		await resend.emails.send({
			from: 'DMRI Contact <onboarding@resend.dev>',
			to: [recipientEmail],
			subject,
			text
		});

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	} catch (error) {
		console.error('Inquiry send failed:', error);
		const message = error instanceof Error ? error.message : 'Unable to send message right now.';

		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'content-type': 'application/json' }
		});
	}
};

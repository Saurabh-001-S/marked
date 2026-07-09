// Minimal email abstraction. Swap the Resend call for Postmark/SES/whatever
// without touching any controller code — they only ever call sendEmail().
export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    // No provider configured — this is the expected state in local dev.
    // Print the email so you can click the link manually instead of it
    // silently vanishing.
    console.log(`\n--- EMAIL (no provider configured, printing instead) ---`);
    console.log(`To: ${to}\nSubject: ${subject}\n${html}`);
    console.log(`--- END EMAIL ---\n`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Marked <noreply@marked.trade>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Failed to send email via Resend:', res.status, body);
  }
}

export function verificationEmailHtml(link) {
  return `<p>Confirm your email to finish setting up Marked.</p><p><a href="${link}">${link}</a></p>`;
}

export function passwordResetEmailHtml(link) {
  return `<p>Reset your Marked password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`;
}

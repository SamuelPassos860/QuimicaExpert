import '../config.js';
import { isEmailDeliveryConfigured, sendMail } from '../utils/email.js';

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const to = getArgValue('--to') || process.argv[2];

  if (!to) {
    console.log('Usage: npm run email:test -- --to you@example.com');
    process.exitCode = 1;
    return;
  }

  if (!isEmailDeliveryConfigured()) {
    throw new Error('SMTP_HOST is not configured. Add SMTP settings to .env before sending real email.');
  }

  await sendMail({
    to,
    subject: 'Expert Chemistry email test',
    text: [
      'This is a test email from Expert Chemistry.',
      '',
      'If you received this message, SMTP delivery is configured correctly.'
    ].join('\n')
  });

  console.log(`Test email sent to ${to}.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

// In development this just logs to the console so you can test without a
// real email provider. Swap the body of sendEmail() for Resend/Nodemailer
// later — nothing else in the app needs to change.
const env = require('../config/env');

async function sendEmail({ to, subject, text }) {
  if (env.nodeEnv === 'development') {
    console.log('\n📧  EMAIL (dev mode, not actually sent)');
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    ${text}\n`);
    return;
  }

  // TODO: replace with a real provider, e.g. Resend:
  // await resend.emails.send({ from: env.emailFrom, to, subject, text });
  throw new Error('Email provider not configured');
}

async function sendOtpEmail(to, otp) {
  await sendEmail({
    to,
    subject: 'Your Campus Lost & Found verification code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
  });
}

module.exports = { sendEmail, sendOtpEmail };

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SES_REGION || process.env.SMTP_HOST) {
    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      const { SESClient } = require('@aws-sdk/client-ses');
      const ses = new SESClient({ region: process.env.SES_REGION || 'us-east-1' });
      transporter = nodemailer.createTransport({ SES: { ses, aws: require('@aws-sdk/client-ses') } });
    }
  } else {
    transporter = {
      sendMail: async (opts) => {
        console.log('--- EMAIL (dev, no SMTP/SES configured) ---');
        console.log(`To: ${opts.to}`);
        console.log(`Subject: ${opts.subject}`);
        console.log(`Body: ${opts.text || ''}`);
        console.log('-------------------------------------------');
        return { messageId: 'dev-' + Date.now() };
      },
    };
  }

  return transporter;
}

async function send({ to, subject, text, html }) {
  const t = getTransporter();
  return t.sendMail({
    from: config.email.from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { send };

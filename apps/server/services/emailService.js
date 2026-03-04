const config = require('../config');

async function send({ to, subject, text, html }) {
  if (process.env.SES_REGION) {
    const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
    const client = new SESv2Client({ region: process.env.SES_REGION });
    const command = new SendEmailCommand({
      FromEmailAddress: config.email.from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
            ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
          },
        },
      },
    });
    return client.send(command);
  }

  if (process.env.SMTP_HOST) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return transporter.sendMail({ from: config.email.from, to, subject, text, html });
  }

  console.log('--- EMAIL (dev, no SMTP/SES configured) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text || ''}`);
  console.log('-------------------------------------------');
  return { messageId: 'dev-' + Date.now() };
}

module.exports = { send };

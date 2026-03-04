const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const config = require('../config');

function buildSesClient() {
  const region = process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1';
  const opts = { region };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    opts.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
  return new SESClient(opts);
}

async function send({ to, subject, text, html }) {
  const from = config.email.from;

  if (process.env.SES_REGION || process.env.AWS_ACCESS_KEY_ID) {
    const client = buildSesClient();
    const command = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
          ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
        },
      },
    });

    try {
      console.log(`[EMAIL SENDING] To: ${to} | Subject: ${subject} | From: ${from}`);
      const result = await client.send(command);
      console.log(`[EMAIL SENT] To: ${to} | MessageId: ${result.MessageId}`);
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error(`[EMAIL FAILED] To: ${to} | Error: ${error.message} | Code: ${error.code || 'Unknown'}`);
      throw error;
    }
  }

  if (process.env.SMTP_HOST) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    console.log(`[EMAIL SENDING via SMTP] To: ${to} | Subject: ${subject}`);
    const result = await transporter.sendMail({ from, to, subject, text, html });
    console.log(`[EMAIL SENT via SMTP] To: ${to} | MessageId: ${result.messageId}`);
    return result;
  }

  console.log('--- EMAIL (dev, no SMTP/SES configured) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text || ''}`);
  console.log('-------------------------------------------');
  return { messageId: 'dev-' + Date.now() };
}

module.exports = { send };

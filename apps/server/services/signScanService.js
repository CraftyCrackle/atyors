const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const fs = require('fs');
const path = require('path');

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-haiku-20240307-v1:0';

function buildClient() {
  const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
  const opts = { region };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    opts.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
  return new BedrockRuntimeClient(opts);
}

const PROMPT = `You are analyzing a photo of a street cleaning sign. Extract the schedule information and return ONLY valid JSON with no other text.

Return a JSON array where each element represents one schedule rule on the sign. Each element must have these fields:
- "side": the side of the street (e.g. "Even side", "Odd side", or null if not specified)
- "dayOfWeek": the day of week as a full name (e.g. "Monday", "Tuesday")
- "weekPattern": one of "every", "1st", "2nd", "3rd", "4th", "1st_and_3rd", "2nd_and_4th"
- "startTime": start time in 24h format "HH:MM" (e.g. "08:00")
- "endTime": end time in 24h format "HH:MM" (e.g. "12:00")
- "seasonStart": start of season as "MM-DD" (e.g. "04-01") or null if year-round
- "seasonEnd": end of season as "MM-DD" (e.g. "11-30") or null if year-round
- "rawText": the raw text you read from the sign

Examples:
- "1st & 3rd Monday of each month April 1 to November 30, 8am-12noon" =>
  [{"side":null,"dayOfWeek":"Monday","weekPattern":"1st_and_3rd","startTime":"08:00","endTime":"12:00","seasonStart":"04-01","seasonEnd":"11-30","rawText":"1st & 3rd Monday of each month April 1 to November 30 8am-12noon"}]

- "Every Tuesday 7am-11am" =>
  [{"side":null,"dayOfWeek":"Tuesday","weekPattern":"every","startTime":"07:00","endTime":"11:00","seasonStart":null,"seasonEnd":null,"rawText":"Every Tuesday 7am-11am"}]

Return ONLY the JSON array.`;

function mimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic' };
  return map[ext] || 'image/jpeg';
}

async function scanSign(imagePath) {
  const client = buildClient();
  const imageBytes = fs.readFileSync(imagePath);
  const base64 = imageBytes.toString('base64');
  const mediaType = mimeFromPath(imagePath);

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: PROMPT },
      ],
    }],
  });

  const command = new InvokeModelCommand({ modelId: MODEL_ID, contentType: 'application/json', accept: 'application/json', body });
  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  const text = result.content?.[0]?.text || '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse sign — please enter the details manually');
  }

  const schedules = JSON.parse(jsonMatch[0]);

  const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const VALID_PATTERNS = ['every', '1st', '2nd', '3rd', '4th', '1st_and_3rd', '2nd_and_4th'];

  return schedules.map((s) => ({
    side: s.side || null,
    dayOfWeek: VALID_DAYS.includes(s.dayOfWeek) ? s.dayOfWeek : null,
    weekPattern: VALID_PATTERNS.includes(s.weekPattern) ? s.weekPattern : 'every',
    startTime: s.startTime || null,
    endTime: s.endTime || null,
    seasonStart: s.seasonStart || null,
    seasonEnd: s.seasonEnd || null,
    rawSignText: s.rawText || text,
  }));
}

function isConfigured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

module.exports = { scanSign, isConfigured };

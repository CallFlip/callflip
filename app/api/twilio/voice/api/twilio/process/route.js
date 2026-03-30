import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult') || '';

  let reply = 'I apologize, I am having trouble. Please call back shortly.';

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are a helpful receptionist for a trade business. A caller said: "${speechResult}". Respond briefly in 1-2 sentences to help them.`
        }
      ]
    });
    reply = message.content[0].text;
  } catch (error) {
    console.error('Anthropic error:', error);
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/twilio/process" method="POST" speechTimeout="auto">
    <Say voice="Polly.Joanna">${reply}</Say>
  </Gather>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

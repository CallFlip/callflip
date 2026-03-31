import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const speechResult = formData.get('SpeechResult') || '';
    const callSid = formData.get('CallSid') || '';

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: process.env.SYSTEM_PROMPT || 'You are a helpful phone assistant. Keep responses brief and conversational — under 3 sentences.',
        messages: [{ role: 'user', content: speechResult }],
      }),
    });

    const aiData = await aiResponse.json();
    const reply = aiData?.content?.[0]?.text​​​​​​​​​​​​​​​​

 import { NextResponse } from 'next/server';

// In-memory conversation store per call
const conversations = new Map();

export async function POST(req) {
  try {
    const formData = await req.formData();
    const speechResult = formData.get('SpeechResult') || '';
    const callSid = formData.get('CallSid') || '';
    const callerNumber = formData.get('From') || '';

    // Transfer to human if requested
    if (/speak to (a )?(human|person|agent|representative|someone)/i.test(speechResult) ||
        /transfer|operator/i.test(speechResult)) {
      const transferTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">One moment, I am transferring you now.</Say>
  <Dial>${process.env.TRANSFER_NUMBER || '+15555555555'}</Dial>
</Response>`;
      conversations.delete(callSid);
      return new NextResponse(transferTwiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Get or create conversation history
    if (!conversations.has(callSid)) {
      conversations.set(callSid, []);
    }
    const history = conversations.get(callSid);

    // Add caller message
    history.push({ role: 'user', content: speechResult });

    // Call Claude with full history
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: `You are a professional dispatcher for a home services company. 
Your job is to collect: caller name, address, job type (plumbing, HVAC, electrical, etc), and preferred appointment time.
Ask for one piece of info at a time. Be friendly and brief.
When you have all 4 pieces of info, confirm them back and say "We will get someone out to you. Is there anything else?"
If the caller wants a human, say you will transfer them.
Keep all responses under 2 sentences.`,
        messages: history,
      }),
    });

    const aiData = await aiResponse.json();
    const reply = aiData?.content?.[0]?.text || 'Sorry, I did not catch that. Could you repeat?';

    // Save assistant reply to history
    history.push({ role: 'assistant', content: reply });
    conversations.set(callSid, history);

    // Check if info collection is complete and log it
    const fullConvo = history.map(m => `${m.role}: ${m.content}`).join('\n');
    if (/we will get someone out/i.test(reply)) {
      console.log(`LEAD CAPTURED - ${callerNumber}:\n${fullConvo}`);
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(reply)}</Say>
  <Gather input="speech" action="/api/twilio/process" speechTimeout="auto" timeout="8">
  </Gather>
  <Say voice="Polly.Joanna">Are you still there?</Say>
  <Gather input="speech" action="/api/twilio/process" speechTimeout="auto" timeout="5">
  </Gather>
  <Say voice="Polly.Joanna">Thank you for calling. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (err) {
    console.error('Process route error:', err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, I encountered an error. Please try again.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(fallback, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

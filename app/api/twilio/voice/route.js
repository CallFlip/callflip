import { NextResponse } from 'next/server';

export async function POST(request) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/twilio/process" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">Thank you for calling. How can I help you today?</Say>
  </Gather>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

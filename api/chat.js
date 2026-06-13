// Vercel serverless function to proxy Gemini requests
// Save as: api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, chatHistory } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Missing message' });

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: GEMINI_API_KEY not set' });

    const systemPrompt = `You are Bible Manna, a compassionate and wise Bible assistant. Your purpose is to help people understand Scripture, find answers to their spiritual questions, and deepen their faith.\n\nGuidelines:\n- Answer questions about the Bible with accuracy and depth\n- Reference specific verses when relevant (e.g., "John 3:16")\n- Be compassionate and encouraging\n- If you don't know something, admit it honestly\n- Keep responses concise but meaningful (150-300 words)\n- Help people apply Scripture to their lives`;

    // Build contents array: use provided chatHistory if present, and append the new user message
    const contents = Array.isArray(chatHistory) ? [...chatHistory] : [];
    contents.push({ role: 'user', parts: [{ text: message }] });

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500
      }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('Gemini API error', data);
      return res.status(502).json({ error: data.error?.message || 'Gemini API error', details: data });
    }

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || (data?.output?.[0]?.content?.text) || '';

    return res.status(200).json({ success: true, response: text, raw: data });
  } catch (err) {
    console.error('Server error in /api/chat', err);
    return res.status(500).json({ error: err.message });
  }
}

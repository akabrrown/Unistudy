async function testKey(provider, key, fn) {
  try {
    const res = await fn();
    console.log(`[OK] ${provider}:`, res);
  } catch(e) {
    console.log(`[ERR] ${provider}:`, e.message?.slice(0, 120));
  }
}

async function run() {
  const env = require('dotenv').config({ path: 'C:/Users/Dell/Desktop/PROjects/Unistudy/backend/.env.local' }).parsed || {};

  // Groq
  await testKey('Groq', env.GROQ_API_KEY, async () => {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'hi' }] })
    });
    const d = await r.json();
    return r.ok ? d.choices?.[0]?.message?.content?.slice(0, 50) : Promise.reject(new Error(JSON.stringify(d)));
  });

  // OpenRouter
  await testKey('OpenRouter', env.OPENROUTER_API_KEY, async () => {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages: [{ role: 'user', content: 'hi' }] })
    });
    const d = await r.json();
    return r.ok ? d.choices?.[0]?.message?.content?.slice(0, 50) : Promise.reject(new Error(JSON.stringify(d)));
  });

  // Mistral
  await testKey('Mistral', env.MISTRAL_API_KEY, async () => {
    const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mistral-tiny', messages: [{ role: 'user', content: 'hi' }] })
    });
    const d = await r.json();
    return r.ok ? d.choices?.[0]?.message?.content?.slice(0, 50) : Promise.reject(new Error(JSON.stringify(d)));
  });
}

run();

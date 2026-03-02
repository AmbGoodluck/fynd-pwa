const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
let CURRENT_MODEL = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';

app.get('/admin/model', (req, res) => {
  res.json({ model: CURRENT_MODEL });
});

app.post('/admin/model', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'model required' });
  CURRENT_MODEL = model;
  res.json({ model: CURRENT_MODEL });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on proxy' });
    const body = req.body || {};
    // allow client to override model, otherwise use CURRENT_MODEL
    const outgoing = Object.assign({}, body, { model: body.model || CURRENT_MODEL });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(outgoing),
    });

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    console.error('proxy error', e);
    res.status(500).json({ error: 'proxy error', detail: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`OpenAI proxy listening on ${PORT}, model=${CURRENT_MODEL}`));

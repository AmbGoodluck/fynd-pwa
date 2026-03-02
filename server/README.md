# Fynd OpenAI Proxy

This small server forwards chat requests to the OpenAI API and keeps the API key on the server.
It also exposes an admin endpoint to change the model in memory.

Environment:
- `OPENAI_API_KEY` - required. Your OpenAI API key.
- `OPENAI_DEFAULT_MODEL` - optional default model (e.g. `gpt-5-mini`).

Run locally:

```bash
cd server
npm install
OPENAI_API_KEY=sk-... npm start
```

Admin:
- GET `/admin/model` -> returns currently selected model
- POST `/admin/model` { "model": "gpt-5-mini" } -> set model

Proxy:
- POST `/api/chat` -> forwards request body to OpenAI Chat Completions, returns OpenAI response.

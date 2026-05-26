// Single source of truth for client-side feature toggles.
//
// Flip a flag here to hide an in-progress feature from the production UI
// without removing the underlying code. The corresponding routes in
// App.jsx are left active so direct URLs / bookmarks still resolve.

// Scout AI chat in the Predictions section.
// Hidden while the Feature 6 LLM proxy
// (POST /api/v1/predictions/scout-ai/chat) is still on mock responses.
// Flip to `true` once the server endpoint is deployed and streaming.
export const SHOW_SCOUT_AI = false;

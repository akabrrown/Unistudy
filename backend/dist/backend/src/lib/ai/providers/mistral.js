"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMistralClient = getMistralClient;
exports.handleMistralRequest = handleMistralRequest;
const mistralai_1 = require("@mistralai/mistralai");
function getMistralClient() {
    if (!process.env.MISTRAL_API_KEY)
        throw new Error("MISTRAL_API_KEY is not set");
    return new mistralai_1.Mistral({ apiKey: process.env.MISTRAL_API_KEY });
}
async function handleMistralRequest(req) {
    const mistral = getMistralClient();
    const result = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: req.payload.prompt || 'Hello' }]
    });
    return result.choices?.[0]?.message?.content || '';
}

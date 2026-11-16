"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletionWithFallback = chatCompletionWithFallback;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const aiModels_1 = require("../../../../shared/constants/aiModels");
const CANDIDATE_MODELS = [...aiModels_1.GROQ_SMART_MODELS];
async function chatCompletionWithFallback(options) {
    const apiKey = process.env.GROQ_API_KEY;
    let lastError = null;
    if (apiKey) {
        const groq = new groq_sdk_1.default({ apiKey });
        for (const model of CANDIDATE_MODELS) {
            try {
                const res = await groq.chat.completions.create({
                    ...options,
                    model
                });
                const content = res.choices[0]?.message?.content;
                if (content)
                    return content;
            }
            catch (err) {
                lastError = err;
                console.warn(`Groq model ${model} failed, attempting next candidate:`, err.message);
            }
        }
    }
    // Fallback to OpenRouter candidate models
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        for (const model of aiModels_1.OPENROUTER_CANDIDATE_MODELS) {
            try {
                const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        messages: options.messages,
                        response_format: options.response_format,
                        ...(options.max_tokens ? { max_tokens: options.max_tokens } : {})
                    })
                });
                if (orRes.ok) {
                    const orData = await orRes.json();
                    const content = orData.choices?.[0]?.message?.content;
                    if (content)
                        return content;
                }
            }
            catch (orErr) {
                lastError = orErr;
                console.error(`OpenRouter fallback (${model}) failed:`, orErr.message);
            }
        }
    }
    throw lastError || new Error("Failed to complete request with all available models");
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCohereClient = getCohereClient;
exports.handleCohereRequest = handleCohereRequest;
const cohere_ai_1 = require("cohere-ai");
function getCohereClient() {
    if (!process.env.COHERE_API_KEY)
        throw new Error("COHERE_API_KEY is not set");
    return new cohere_ai_1.CohereClient({ token: process.env.COHERE_API_KEY });
}
async function handleCohereRequest(req) {
    const cohere = getCohereClient();
    if (req.feature === 'semantic_search_rerank') {
        const result = await cohere.rerank({
            model: 'rerank-english-v3.0',
            query: req.payload.query || '',
            documents: req.payload.documents || [],
            topN: 5
        });
        return result.results;
    }
    throw new Error(`Cohere does not support feature: ${req.feature}`);
}

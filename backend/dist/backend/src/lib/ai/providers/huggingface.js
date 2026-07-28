"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHfClient = getHfClient;
exports.handleHFRequest = handleHFRequest;
const inference_1 = require("@huggingface/inference");
function getHfClient() {
    const token = process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_KEY;
    if (!token)
        throw new Error("HUGGINGFACE_API_TOKEN or HUGGINGFACE_API_KEY is not set");
    return new inference_1.HfInference(token);
}
async function handleHFRequest(req) {
    const hf = getHfClient();
    if (req.feature.includes('embedding')) {
        const result = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: req.payload.texts || [req.payload.prompt || '']
        });
        return result;
    }
    throw new Error(`HuggingFace does not support feature: ${req.feature}`);
}

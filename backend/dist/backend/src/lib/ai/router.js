"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeRequest = routeRequest;
const quota_1 = require("../../../../shared/constants/quota");
// Router delegates to specific provider implementations
async function routeRequest(request) {
    const start = Date.now();
    let provider = quota_1.FEATURE_PROVIDER_MAP[request.feature] || 'gemini';
    let result = null;
    try {
        const { getProviderStatus } = await Promise.resolve().then(() => __importStar(require('./balance')));
        const status = await getProviderStatus(provider);
        // If the provider has fallback activated, route to groq_70b (Llama 3 70B)
        if (status && status.is_fallback_active) {
            console.warn(`[AI Router] Provider ${provider} is critically low. Falling back to groq_70b.`);
            provider = 'groq_70b';
        }
    }
    catch (err) {
        console.error(`[AI Router] Error checking fallback status for ${provider}:`, err);
    }
    try {
        switch (provider) {
            case 'gemini': {
                const { handleGeminiRequest } = await Promise.resolve().then(() => __importStar(require('./providers/gemini')));
                result = await handleGeminiRequest(request);
                break;
            }
            case 'groq_70b':
            case 'groq_8b': {
                const { handleGroqRequest } = await Promise.resolve().then(() => __importStar(require('./providers/groq')));
                result = await handleGroqRequest(request);
                break;
            }
            case 'huggingface': {
                const { handleHFRequest } = await Promise.resolve().then(() => __importStar(require('./providers/huggingface')));
                result = await handleHFRequest(request);
                break;
            }
            case 'mistral': {
                const { handleMistralRequest } = await Promise.resolve().then(() => __importStar(require('./providers/mistral')));
                result = await handleMistralRequest(request);
                break;
            }
            case 'cohere': {
                const { handleCohereRequest } = await Promise.resolve().then(() => __importStar(require('./providers/cohere')));
                result = await handleCohereRequest(request);
                break;
            }
            case 'openrouter':
            default: {
                const { handleOpenRouterRequest } = await Promise.resolve().then(() => __importStar(require('./providers/openrouter')));
                result = await handleOpenRouterRequest(request);
                break;
            }
        }
    }
    catch (error) {
        console.error(`[AI Router] Provider ${provider} failed:`, error);
        // Try Groq first since it has feature-specific prompt handling
        if (provider !== 'groq_70b' && provider !== 'groq_8b' && process.env.GROQ_API_KEY) {
            try {
                console.log(`[AI Router] Attempting Groq fallback for ${request.feature}`);
                provider = 'groq_70b';
                const { handleGroqRequest } = await Promise.resolve().then(() => __importStar(require('./providers/groq')));
                result = await handleGroqRequest(request);
            }
            catch (groqErr) {
                console.error('[AI Router] Groq fallback also failed, trying OpenRouter:', groqErr);
                provider = 'openrouter';
                const { handleOpenRouterRequest } = await Promise.resolve().then(() => __importStar(require('./providers/openrouter')));
                result = await handleOpenRouterRequest(request);
            }
        }
        else {
            provider = 'openrouter';
            const { handleOpenRouterRequest } = await Promise.resolve().then(() => __importStar(require('./providers/openrouter')));
            result = await handleOpenRouterRequest(request);
        }
    }
    return {
        result,
        provider,
        requestsConsumed: 1, // Let consumeUserQuota apply the correct feature multiplier later
        responseMs: Date.now() - start
    };
}

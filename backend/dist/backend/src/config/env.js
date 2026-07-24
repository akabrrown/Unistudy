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
exports.env = void 0;
const dotenv = __importStar(require("dotenv"));
const zod_1 = require("zod");
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env if needed
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('8000'),
    NODE_ENV: zod_1.z.string().default('development'),
    FRONTEND_URL: zod_1.z.string().url(),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    GEMINI_API_KEY: zod_1.z.string().min(1),
    GROQ_API_KEY: zod_1.z.string().min(1),
    MISTRAL_API_KEY: zod_1.z.string().optional(),
    HUGGINGFACE_API_KEY: zod_1.z.string().optional(),
    COHERE_API_KEY: zod_1.z.string().optional(),
    OPENROUTER_API_KEY: zod_1.z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: zod_1.z.string().optional(),
    CLOUDFLARE_AI_API_KEY: zod_1.z.string().optional(),
    PAYSTACK_SECRET_KEY: zod_1.z.string().min(1),
    PAYSTACK_WEBHOOK_SECRET: zod_1.z.string().min(1),
    UPSTASH_REDIS_REST_URL: zod_1.z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: zod_1.z.string().min(1),
    CONVERTER_URL: zod_1.z.string().url(),
    CONVERTER_SECRET: zod_1.z.string().optional(),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
});
// This will crash the server immediately if a required variable is missing.
exports.env = envSchema.parse(process.env);

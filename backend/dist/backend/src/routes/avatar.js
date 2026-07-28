"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const env_1 = require("../config/env");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME || 'dzglt3j2n',
    // Not strictly needing api_key/api_secret if we use unsigned uploads, but setting it if available
    api_key: env_1.env.CLOUDINARY_API_KEY,
    api_secret: env_1.env.CLOUDINARY_API_SECRET
});
const upload = (0, multer_1.default)({ dest: '/tmp/uploads/' });
const avatarRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many avatar uploads, please try again later.'
});
router.post('/avatar', auth_1.authenticateUser, avatarRateLimit, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        // Upload to Cloudinary using unsigned preset
        const uploadResult = await cloudinary_1.v2.uploader.unsigned_upload(file.path, 'unistudy_ai', {
            folder: 'avatars',
            public_id: `${userId}_${Date.now()}`
        });
        // Remove temp file
        fs_1.default.unlinkSync(file.path);
        const avatarUrl = uploadResult.secure_url;
        // Update profile in Supabase
        const { error: dbError } = await supabase_1.supabaseAdmin
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);
        if (dbError)
            throw dbError;
        res.json({ success: true, avatar_url: avatarUrl });
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        // Cleanup if exists
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
exports.default = router;

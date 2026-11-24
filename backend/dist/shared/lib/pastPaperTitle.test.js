"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pastPaperTitle_1 = require("./pastPaperTitle");
(0, node_test_1.default)('pastPaperTitle - base64 path decoding and humanization', async (t) => {
    await t.test('decodes base64 path from user report to human-readable title', () => {
        const raw = 'L0RpcExldmVsMTAwLzIwMDgtMjAwOS9QREJBIDExMSBQcmluY2lwbGVzIG9mIE1hcmtldGluZy1GSVJTVCBTRU1FU1RFUi5wZGY';
        const clean = (0, pastPaperTitle_1.normalizePastPaperTitle)(raw);
        strict_1.default.match(clean, /PDBA 111/i);
        strict_1.default.match(clean, /Principles of Marketing/i);
        strict_1.default.match(clean, /First Semester/i);
        strict_1.default.doesNotMatch(clean, /L0RpcExldmVsMTAw/);
        strict_1.default.doesNotMatch(clean, /\.pdf$/i);
    });
    await t.test('decodes base64 without padding or with url-safe chars', () => {
        // base64 for "/Level200/2020/BCPC 201 Commercial Law.pdf"
        const base64Str = Buffer.from('/Level200/2020/BCPC 201 Commercial Law.pdf').toString('base64');
        const clean = (0, pastPaperTitle_1.normalizePastPaperTitle)(base64Str);
        strict_1.default.match(clean, /BCPC 201 Commercial Law/);
        strict_1.default.doesNotMatch(clean, /\.pdf$/i);
    });
    await t.test('cleans raw file paths and normalizes hyphens/extensions', () => {
        const pathStr = '/Level100/2019-2020/BCPC 101 Introduction to Business-SECOND SEMESTER.pdf';
        const clean = (0, pastPaperTitle_1.normalizePastPaperTitle)(pathStr);
        strict_1.default.match(clean, /BCPC 101 Introduction to Business/);
        strict_1.default.match(clean, /Second Semester/i);
        strict_1.default.doesNotMatch(clean, /\.pdf$/i);
        strict_1.default.doesNotMatch(clean, /^\//);
    });
    await t.test('cleans URL-encoded titles and underscores', () => {
        const urlEncoded = 'BCPC%20207_Financial_Accounting-FIRST_SEMESTER.pdf';
        const clean = (0, pastPaperTitle_1.normalizePastPaperTitle)(urlEncoded);
        strict_1.default.equal(clean.includes('%20'), false);
        strict_1.default.match(clean, /BCPC 207 Financial Accounting/);
    });
    await t.test('handles already clean titles gracefully', () => {
        const normal = 'BCPC 207 Financial Accounting - First Semester (2022)';
        strict_1.default.equal((0, pastPaperTitle_1.normalizePastPaperTitle)(normal), normal);
    });
    await t.test('handles null, empty, and invalid inputs with safe default', () => {
        strict_1.default.equal((0, pastPaperTitle_1.normalizePastPaperTitle)(''), 'Past Examination Paper');
        strict_1.default.equal((0, pastPaperTitle_1.normalizePastPaperTitle)(null), 'Past Examination Paper');
        strict_1.default.equal((0, pastPaperTitle_1.normalizePastPaperTitle)(undefined), 'Past Examination Paper');
        strict_1.default.equal((0, pastPaperTitle_1.normalizePastPaperTitle)('   '), 'Past Examination Paper');
    });
    await t.test('isUidString identifies full and partial UUIDs', () => {
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)('d2f60494-b98f-4c3c-8b4e-890514f65b3e'), true);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)('d2f60494b98f4c3c8b4e890514f65b3e'), true);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)('d2f60494'), true);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)('BCPC 208'), false);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)('PBAC 301'), false);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)('BBA 101'), false);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)(''), false);
        strict_1.default.equal((0, pastPaperTitle_1.isUidString)(null), false);
    });
    await t.test('extractCourseCode parses various academic course code formats', () => {
        strict_1.default.equal((0, pastPaperTitle_1.extractCourseCode)('BCPC 208'), 'BCPC 208');
        strict_1.default.equal((0, pastPaperTitle_1.extractCourseCode)('BCPC208'), 'BCPC 208');
        strict_1.default.equal((0, pastPaperTitle_1.extractCourseCode)('pbac 301'), 'PBAC 301');
        strict_1.default.equal((0, pastPaperTitle_1.extractCourseCode)('BCPC_207_Financial_Accounting.pdf'), 'BCPC 207');
        strict_1.default.equal((0, pastPaperTitle_1.extractCourseCode)('PDBA 111 Principles of Marketing'), 'PDBA 111');
        strict_1.default.equal((0, pastPaperTitle_1.extractCourseCode)('d2f60494-b98f-4c3c-8b4e-890514f65b3e'), null);
    });
    await t.test('resolveDisplayCourseCode never returns a UUID and extracts real course code', () => {
        // When course_code is a raw UUID, extract from paperTitle
        const res1 = (0, pastPaperTitle_1.resolveDisplayCourseCode)({
            courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
            paperTitle: 'BCPC 208 - 2024 End of Semester Examination',
        });
        strict_1.default.equal(res1, 'BCPC 208');
        // When joinedCourseCode is valid
        const res2 = (0, pastPaperTitle_1.resolveDisplayCourseCode)({
            courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
            joinedCourseCode: 'PBAC 301',
        });
        strict_1.default.equal(res2, 'PBAC 301');
        // When normalizedCode is BCPC208
        const res3 = (0, pastPaperTitle_1.resolveDisplayCourseCode)({
            courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
            normalizedCode: 'BCPC208',
        });
        strict_1.default.equal(res3, 'BCPC 208');
        // When courseTitle contains code
        const res4 = (0, pastPaperTitle_1.resolveDisplayCourseCode)({
            courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
            courseTitle: 'Introduction to Business Administration BBA 101',
        });
        strict_1.default.equal(res4, 'BBA 101');
        // Fallback when completely unidentifiable (NEVER raw UUID)
        const res5 = (0, pastPaperTitle_1.resolveDisplayCourseCode)({
            courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
            paperTitle: 'General University Past Question',
        });
        strict_1.default.equal(res5, 'EXAM');
    });
});

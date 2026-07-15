"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.getTokenFromRequest = getTokenFromRequest;
exports.generateReferralCode = generateReferralCode;
exports.generateVerificationCode = generateVerificationCode;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, 12);
}
async function comparePassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function getTokenFromRequest(req) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
        return header.slice(7);
    }
    return null;
}
function generateReferralCode() {
    return `BT${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

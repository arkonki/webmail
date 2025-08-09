/// <reference types="node" />

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== KEY_LENGTH) {
    throw new Error('FATAL: ENCRYPTION_KEY environment variable is not set or is not a 32-byte (64-character) hex string.');
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

export const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Store iv, encrypted data, and auth tag together, separated by a colon.
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
};

export const decrypt = (hash: string): string => {
    try {
        const [ivHex, encryptedHex, authTagHex] = hash.split(':');
        if (!ivHex || !encryptedHex || !authTagHex) {
            throw new Error('Invalid hash format for decryption');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error("Decryption failed. The data may be corrupt or the key may be incorrect.");
    }
};

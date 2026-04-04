/**
 * License Service for SuperVet+
 * 
 * License key format: XXXX-XXXX-XXXX-XXXX
 * Keys are bound to a specific email address
 * 
 * Algorithm:
 * 1. Take email, normalize (lowercase, trim)
 * 2. Create hash from email
 * 3. Generate 16-char key from hash
 * 4. Last 4 chars are checksum of first 12
 */

// Secret salt - change this for production!
const LICENSE_SALT = 'SuperVet2024!Rx#';

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/**
 * Convert number to base36 string (A-Z, 0-9)
 */
function toBase36(num: number, length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    while (result.length < length) {
        result = chars[num % 36] + result;
        num = Math.floor(num / 36);
    }
    return result.slice(0, length);
}

/**
 * Generate a license key for a given email
 */
export function generateLicenseKey(email: string): string {
    const normalizedEmail = email.toLowerCase().trim();

    // Create multiple hashes from different parts for more entropy
    const hash1 = simpleHash(normalizedEmail + LICENSE_SALT);
    const hash2 = simpleHash(LICENSE_SALT + normalizedEmail);
    const hash3 = simpleHash(normalizedEmail.split('').reverse().join('') + LICENSE_SALT);

    // Generate first 12 characters (3 groups of 4)
    const part1 = toBase36(hash1, 4);
    const part2 = toBase36(hash2, 4);
    const part3 = toBase36(hash3, 4);

    // Generate checksum from first 12 chars
    const first12 = part1 + part2 + part3;
    const checksumHash = simpleHash(first12 + LICENSE_SALT);
    const checksum = toBase36(checksumHash, 4);

    return `${part1}-${part2}-${part3}-${checksum}`;
}

/**
 * Validate a license key against an email
 */
export function validateLicenseKey(key: string, email: string): boolean {
    if (!key || !email) return false;

    // Normalize the key (remove spaces, uppercase)
    const normalizedKey = key.toUpperCase().replace(/\s/g, '');

    // Check format: XXXX-XXXX-XXXX-XXXX
    const keyRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!keyRegex.test(normalizedKey)) {
        return false;
    }

    // Generate expected key for this email
    const expectedKey = generateLicenseKey(email);

    return normalizedKey === expectedKey;
}

/**
 * Format a key with dashes (user might enter without dashes)
 */
export function formatLicenseKey(key: string): string {
    const clean = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 16) return key;

    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

/**
 * Check if a string looks like it could be a license key
 */
export function looksLikeLicenseKey(str: string): boolean {
    const clean = str.replace(/[^A-Z0-9a-z]/g, '');
    return clean.length === 16;
}

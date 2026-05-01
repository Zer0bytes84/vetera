/**
 * License Generator Script
 * Usage: npx ts-node generate-license.ts <email>
 * Example: npx ts-node generate-license.ts user@example.com
 */

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function toBase36(num: number, length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    while (result.length < length) {
        result = chars[num % 36] + result;
        num = Math.floor(num / 36);
    }
    return result.slice(0, length);
}

function generateLicenseKey(email: string, salt: string = 'SuperVet2024!Rx#'): string {
    const normalizedEmail = email.toLowerCase().trim();
    const hash1 = simpleHash(normalizedEmail + salt);
    const hash2 = simpleHash(salt + normalizedEmail);
    const hash3 = simpleHash(normalizedEmail.split('').reverse().join('') + salt);
    const part1 = toBase36(hash1, 4);
    const part2 = toBase36(hash2, 4);
    const part3 = toBase36(hash3, 4);
    const first12 = part1 + part2 + part3;
    const checksumHash = simpleHash(first12 + salt);
    const checksum = toBase36(checksumHash, 4);
    return `${part1}-${part2}-${part3}-${checksum}`;
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.log('\n🎫 Générateur de licences Vetera\n');
    console.log('Usage: npx ts-node generate-license.ts <email>');
    console.log('Exemple: npx ts-node generate-license.ts clinique@example.com\n');
    process.exit(1);
}

const licenseKey = generateLicenseKey(email);

console.log('\n✅ Licence générée avec succès !\n');
console.log('📧 Email:', email);
console.log('🔑 Clé:', licenseKey);
console.log('\n');

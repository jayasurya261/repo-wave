
import { pool } from "./db";

export function isValidUsername(username: string): boolean {
    if (!username) return false;
    if (username.length > 39) return false;
    // Only letters, numbers, and hyphens
    if (!/^[a-z0-9-]+$/i.test(username)) return false;
    // Cannot start or end with a hyphen
    if (username.startsWith('-') || username.endsWith('-')) return false;
    // Cannot have consecutive hyphens (GitHub rule, optional but good)
    if (username.includes('--')) return false; 
    
    // Reserved words
    const reserved = ['login', 'signup', 'api', 'admin', 'dashboard', 'settings', 'profile', 'about', 'terms', 'privacy', 'guide', 'repo', 'issue', '404', '500', 'auth', 'oauth', 'callback'];
    if (reserved.includes(username.toLowerCase())) return false;

    return true;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
    if (!isValidUsername(username)) return false;
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT 1 FROM "user" WHERE username = $1', [username]);
        return res.rowCount === 0;
    } finally {
        client.release();
    }
}

export function generateBaseUsernames(name: string, email: string): string[] {
    const suggestions: string[] = [];
    
    // Clean name: remove special chars, spaces to hyphens or nothing
    const cleanName = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    if (cleanName) suggestions.push(cleanName);

    // Clean email prefix
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (emailPrefix && emailPrefix !== cleanName) suggestions.push(emailPrefix);

    return suggestions;
}

export async function generateUniqueUsername(name: string, email: string): Promise<string> {
    const bases = generateBaseUsernames(name, email);
    const suffixes = ['', '1', '123', '-dev', '-codes', '-tech', '-js'];
    
    // Try base + suffixes
    for (const base of bases) {
        for (const suffix of suffixes) {
            const candidate = `${base}${suffix}`;
            if (isValidUsername(candidate)) {
                if (await isUsernameAvailable(candidate)) {
                    return candidate;
                }
            }
        }
    }

    // If all fail, append random number
    const base = bases[0] || 'user';
    let counter = 1;
    while (true) {
        const candidate = `${base}${counter}`;
        if (isValidUsername(candidate)) {
            if (await isUsernameAvailable(candidate)) {
                return candidate;
            }
        }
        counter++;
        // Safety break
        if (counter > 1000) return `${base}-${Date.now()}`;
    }
}

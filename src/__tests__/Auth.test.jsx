import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../functions/_lib/crypto.js';

describe('Crypto Auth Flow', () => {
  it('should hash and verify passwords correctly', async () => {
    const password = "mySecurePassword123";
    const hashed = await hashPassword(password);
    
    expect(hashed).toContain('pbkdf2:10000:');
    
    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);
    
    const isInvalid = await verifyPassword("wrongpassword", hashed);
    expect(isInvalid).toBe(false);
  });
});

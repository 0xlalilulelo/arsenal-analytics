import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('correcthorsebatterystaple');
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
  });

  it('produces different hashes for the same plaintext (salt randomness)', async () => {
    const h1 = await hashPassword('password');
    const h2 = await hashPassword('password');
    expect(h1).not.toBe(h2);
  });

  it('hashes empty string without throwing', async () => {
    await expect(hashPassword('')).resolves.toMatch(/^\$2[ab]\$/);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('MyS3cretP@ss');
    expect(await verifyPassword('MyS3cretP@ss', hash)).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correctPassword');
    expect(await verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('returns false for empty string against non-empty hash', async () => {
    const hash = await hashPassword('notEmpty');
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('is case-sensitive', async () => {
    const hash = await hashPassword('CaseSensitive');
    expect(await verifyPassword('casesensitive', hash)).toBe(false);
    expect(await verifyPassword('CaseSensitive', hash)).toBe(true);
  });
});

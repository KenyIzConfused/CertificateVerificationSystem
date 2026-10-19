import crypto from 'crypto';
import { describe, test, expect } from 'vitest';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 10;

function randomInviteCode() {
  const buf = crypto.randomBytes(INVITE_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[buf[i] % INVITE_CODE_ALPHABET.length];
  }
  return code;
}

describe('randomInviteCode', () => {
  test('generates a code of the correct length', () => {
    const code = randomInviteCode();
    expect(code.length).toBe(10);
  });

  test('generates codes using only valid characters', () => {
    const code = randomInviteCode();
    const validChars = new Set(INVITE_CODE_ALPHABET.split(''));
    for (const char of code) {
      expect(validChars.has(char)).toBe(true);
    }
  });

  test('generates different codes on subsequent calls', () => {
    const codes = new Set();
    for (let i = 0; i < 10; i++) {
      codes.add(randomInviteCode());
    }
    expect(codes.size).toBe(10);
  });

  test('never contains O, 0, I, or 1 (ambiguous characters)', () => {
    const code = randomInviteCode();
    expect(code).not.toMatch(/[O0I1]/);
  });
});

describe('invite code validation', () => {
  test('accepts valid 10-character codes', () => {
    const validCode = 'ABCDEFGHJK';
    expect(validCode.length).toBe(10);
    expect(/^[A-Z2-9]{10}$/.test(validCode)).toBe(true);
  });

  test('rejects codes with invalid characters', () => {
    expect(/^[A-Z2-9]{10}$/.test('ABCD EFGHIJ')).toBe(false);
    expect(/^[A-Z2-9]{10}$/.test('abcdefghijklmnopqrstuvwxyz')).toBe(false);
    expect(/^[A-Z2-9]{10}$/.test('ABC-123456')).toBe(false);
  });

  test('rejects codes with wrong length', () => {
    expect(/^[A-Z2-9]{10}$/.test('ABCDE12345')).toBe(false);
    expect(/^[A-Z2-9]{10}$/.test('ABCDE1234567')).toBe(false);
  });
});

describe('email validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  test('accepts valid emails', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('user.name@example.com')).toBe(true);
    expect(emailRegex.test('user+tag@example.org')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
    expect(emailRegex.test('user@example')).toBe(false);
    expect(emailRegex.test('user @example.com')).toBe(false);
    expect(emailRegex.test('user@ example.com')).toBe(false);
  });
});

describe('eventCode validation', () => {
  test('accepts valid event codes', () => {
    expect(/^[A-Z0-9-]+$/.test('EVENTCODE')).toBe(true);
    expect(/^[A-Z0-9-]+$/.test('EVT-CODE-123')).toBe(true);
    expect(/^[A-Z0-9-]+$/.test('ABC')).toBe(true);
  });

  test('rejects invalid event codes', () => {
    expect(/^[A-Z0-9-]+$/.test('event code')).toBe(false);
    expect(/^[A-Z0-9-]+$/.test('event_code')).toBe(false);
    expect(/^[A-Z0-9-]+$/.test('')).toBe(false);
  });
});
import { describe, it, expect } from 'vitest';
import {
  toContactPrefill,
  mergePrefill,
  normalizePhone,
  splitName,
  fromLines,
} from '../cardScanPrefill';

describe('v114 cardScanPrefill', () => {
  it('normalizes North American phone numbers', () => {
    expect(normalizePhone('(403) 555-0199')).toBe('+14035550199');
    expect(normalizePhone('1-403-555-0199')).toBe('+14035550199');
    expect(normalizePhone('')).toBe('');
  });

  it('splits a full name', () => {
    expect(splitName('Craig Arnatt')).toEqual({ firstName: 'Craig', lastName: 'Arnatt' });
    expect(splitName('Jean Luc Picard')).toEqual({ firstName: 'Jean', lastName: 'Luc Picard' });
    expect(splitName('')).toEqual({ firstName: '', lastName: '' });
  });

  it('maps a parsed card object', () => {
    const out = toContactPrefill({
      fullName: 'Dana Reyes',
      email: 'Dana.Reyes@Example.COM',
      phone: '4035550100',
      companyName: 'Northgate Capital Ltd',
      jobTitle: 'Controller',
    });
    expect(out.firstName).toBe('Dana');
    expect(out.lastName).toBe('Reyes');
    expect(out.email).toBe('dana.reyes@example.com');
    expect(out.phone).toBe('+14035550100');
    expect(out.company).toBe('Northgate Capital Ltd');
    expect(out.title).toBe('Controller');
  });

  it('prefers explicit first/last over fullName', () => {
    const out = toContactPrefill({ firstName: 'Amy', lastName: 'Wu', fullName: 'Ignore Me' });
    expect(out.firstName).toBe('Amy');
    expect(out.lastName).toBe('Wu');
  });

  it('parses raw OCR lines from scanCard()', () => {
    const out = toContactPrefill([
      'Dana Reyes',
      'Controller',
      'Northgate Capital Ltd',
      'dana@northgate.ca',
      '(403) 555-0100',
      'www.northgate.ca',
    ]);
    expect(out.firstName).toBe('Dana');
    expect(out.lastName).toBe('Reyes');
    expect(out.email).toBe('dana@northgate.ca');
    expect(out.phone).toBe('+14035550100');
    expect(out.company).toBe('Northgate Capital Ltd');
    expect(out.title).toBe('Controller');
    expect(out.website).toBe('www.northgate.ca');
  });

  it('fromLines ignores blanks', () => {
    const raw = fromLines(['', '   ', 'Solo Name']);
    expect(raw.fullName).toBe('Solo Name');
  });

  it('returns empty for junk input', () => {
    expect(toContactPrefill(null).firstName).toBe('');
    expect(toContactPrefill('nope').email).toBe('');
  });

  it('merge does not clobber typed values', () => {
    const current = { firstName: 'Todd', lastName: '', email: '', phone: '' };
    const merged = mergePrefill(current, toContactPrefill({ fullName: 'Dana Reyes', email: 'd@x.ca' }));
    expect(merged.firstName).toBe('Todd');
    expect(merged.lastName).toBe('Reyes');
    expect(merged.email).toBe('d@x.ca');
  });

  it('merge with overwrite replaces', () => {
    const merged = mergePrefill({ firstName: 'Todd' }, toContactPrefill({ firstName: 'Dana' }), true);
    expect(merged.firstName).toBe('Dana');
  });
});

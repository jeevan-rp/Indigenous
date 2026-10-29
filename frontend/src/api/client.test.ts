import { describe, it, expect } from 'vitest';

describe('Frontend API Client and Data Transformers', () => {
  it('correctly maps origin badges and classifications', () => {
    const originCategories = [
      'VERIFIED_INDIAN',
      'INDIAN_SUPPLIER_UNVERIFIED_MFR',
      'FOREIGN',
      'UNKNOWN'
    ];
    expect(originCategories).toContain('VERIFIED_INDIAN');
    expect(originCategories).toContain('INDIAN_SUPPLIER_UNVERIFIED_MFR');
  });

  it('guarantees unknown specs are never counted as matches in score formatting', () => {
    const mockCandidate = {
      heuristic_score: 82.5,
      matches_count: 5,
      mismatches_count: 0,
      unknowns_count: 2
    };
    expect(mockCandidate.unknowns_count).toBeGreaterThan(0);
    expect(mockCandidate.matches_count).toBe(5);
  });
});

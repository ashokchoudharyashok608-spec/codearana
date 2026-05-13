import { mapVerdict, LANGUAGE_IDS } from '../submissions/judge0.client';

describe('Judge0 Client', () => {
  describe('mapVerdict', () => {
    it('maps status 3 to ACCEPTED', () => {
      expect(mapVerdict(3)).toBe('ACCEPTED');
    });
    it('maps status 4 to WRONG_ANSWER', () => {
      expect(mapVerdict(4)).toBe('WRONG_ANSWER');
    });
    it('maps status 5 to TIME_LIMIT_EXCEEDED', () => {
      expect(mapVerdict(5)).toBe('TIME_LIMIT_EXCEEDED');
    });
    it('maps status 6 to COMPILATION_ERROR', () => {
      expect(mapVerdict(6)).toBe('COMPILATION_ERROR');
    });
    it('maps status 7 to RUNTIME_ERROR', () => {
      expect(mapVerdict(7)).toBe('RUNTIME_ERROR');
    });
    it('maps status 14 to MEMORY_LIMIT_EXCEEDED', () => {
      expect(mapVerdict(14)).toBe('MEMORY_LIMIT_EXCEEDED');
    });
    it('maps unknown status to PENDING', () => {
      expect(mapVerdict(1)).toBe('PENDING');
      expect(mapVerdict(2)).toBe('PENDING');
    });
  });

  describe('LANGUAGE_IDS', () => {
    it('has all required languages', () => {
      const required = ['CPP', 'JAVA', 'PYTHON3', 'JAVASCRIPT', 'GO', 'RUST'];
      required.forEach(lang => {
        expect(LANGUAGE_IDS[lang]).toBeDefined();
        expect(typeof LANGUAGE_IDS[lang]).toBe('number');
      });
    });

    it('CPP maps to Judge0 ID 54', () => expect(LANGUAGE_IDS.CPP).toBe(54));
    it('Python3 maps to Judge0 ID 71', () => expect(LANGUAGE_IDS.PYTHON3).toBe(71));
    it('JavaScript maps to Judge0 ID 63', () => expect(LANGUAGE_IDS.JAVASCRIPT).toBe(63));
  });
});

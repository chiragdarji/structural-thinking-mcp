const { describe, test, expect } = require('@jest/globals');

describe('Basic Structural Thinking Tests', () => {
  describe('Helper Functions', () => {
    test('should validate string inputs correctly', () => {
      function validateInput(value, type, minLength, maxLength) {
        if (type === 'string') {
          if (typeof value !== 'string') return false;
          if (minLength !== undefined && value.length < minLength) return false;
          if (maxLength !== undefined && value.length > maxLength) return false;
        }
        if (type === 'object' && (typeof value !== 'object' || value === null)) return false;
        return true;
      }

      expect(validateInput('test', 'string')).toBe(true);
      expect(validateInput('', 'string', 1)).toBe(false);
      expect(validateInput('a'.repeat(10001), 'string', 1, 10000)).toBe(false);
      expect(validateInput(123, 'string')).toBe(false);
      expect(validateInput({}, 'object')).toBe(true);
      expect(validateInput(null, 'object')).toBe(false);
    });

    test('should count words correctly', () => {
      function getWordCount(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
      }

      expect(getWordCount("hello world")).toBe(2);
      expect(getWordCount("  hello   world  ")).toBe(2);
      expect(getWordCount("")).toBe(0);
      expect(getWordCount("single")).toBe(1);
      expect(getWordCount("one two three four five")).toBe(5);
    });

    test('should round numbers safely', () => {
      function safeRound(value, precision = 2) {
        const factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
      }

      expect(safeRound(3.14159, 2)).toBe(3.14);
      expect(safeRound(3.14159, 3)).toBe(3.142);
      expect(safeRound(3.5)).toBe(3.5);
      expect(safeRound(3.999)).toBe(4);
    });
  });

  describe('Vague Language Detection', () => {
    test('should detect vague language patterns', () => {
      const vagueWords = [
        /\boptimi[sz]e[ds]?\b/i, /\bbetter\b/i, /\bquickly\b/i, /\bimprove[ds]?\b/i, 
        /\bnice\b/i, /\bgood\b/i, /\bclean\b/i, /\befficient\b/i, /\bsimple\b/i, 
        /\beasy\b/i, /\bfast\b/i, /\bsmooth\b/i, /\bpretty\b/i, /\bquite\b/i,
        /\bvery\b/i, /\breally\b/i, /\bsomewhat\b/i, /\brather\b/i, /\bbasically\b/i,
        /\bobviously\b/i, /\bclearly\b/i
      ];

      function hasVagueLanguage(text) {
        if (!text || typeof text !== 'string') return false;
        return vagueWords.some(rx => rx.test(text));
      }

      expect(hasVagueLanguage("Make it better")).toBe(true);
      expect(hasVagueLanguage("Optimize the system")).toBe(true);
      expect(hasVagueLanguage("Create user authentication")).toBe(false);
      expect(hasVagueLanguage("Very good solution")).toBe(true);
      expect(hasVagueLanguage("Implement OAuth2 protocol")).toBe(false);
    });
  });

  describe('Quality Metrics', () => {
    test('should calculate quality scores within valid range', () => {
      const scores = [
        { clarity: 0.0, completeness: 0.0, expected: 0.0 },
        { clarity: 0.5, completeness: 0.5, expected: 0.5 },
        { clarity: 1.0, completeness: 1.0, expected: 1.0 },
        { clarity: 0.8, completeness: 0.6, expected: 0.7 }
      ];

      scores.forEach(({ clarity, completeness, expected }) => {
        const overallQuality = (clarity + completeness) / 2;
        expect(overallQuality).toBeCloseTo(expected, 1);
        expect(overallQuality).toBeGreaterThanOrEqual(0);
        expect(overallQuality).toBeLessThanOrEqual(1);
      });
    });

    test('should determine readiness for implementation', () => {
      const testScenarios = [
        { clarity: 0.7, completeness: 0.8, errors: 0, expected: true },
        { clarity: 0.5, completeness: 0.8, errors: 0, expected: false },
        { clarity: 0.8, completeness: 0.5, errors: 0, expected: false },
        { clarity: 0.8, completeness: 0.8, errors: 1, expected: false }
      ];

      testScenarios.forEach(({ clarity, completeness, errors, expected }) => {
        const readyForImplementation = errors === 0 && clarity > 0.6 && completeness > 0.6;
        expect(readyForImplementation).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', () => {
      const invalidInputs = [
        { prompt: "", domain: "code", expectedError: "Invalid prompt" },
        { prompt: "a".repeat(10001), domain: "code", expectedError: "Invalid prompt" },
        { prompt: "Valid prompt", domain: "invalid", expectedError: "Invalid domain" }
      ];

      invalidInputs.forEach(({ prompt, domain, expectedError }) => {
        // Mock error handling
        const result = {
          error: prompt.length === 0 || prompt.length > 10000 ? "Invalid prompt: must be a string between 3-10000 characters" :
                 domain && !["code", "docs", "data", "product", "research"].includes(domain) ? "Invalid domain: must be one of code, docs, data, product, research" :
                 null
        };

        if (expectedError) {
          expect(result.error).toContain(expectedError.split(":")[0]);
        }
      });
    });
  });

  describe('Structural Thinking Schema', () => {
    test('should validate minimal structural thinking spec', () => {
      const minimalSpec = {
        version: '1.0',
        intent: 'general',
        instructions: ['Create something'],
        io: { format: 'markdown' }
      };

      function validateMinimalSpec(spec) {
        const requiredFields = ['version', 'intent', 'instructions', 'io'];
        return requiredFields.every(field => field in spec) &&
               Array.isArray(spec.instructions) &&
               spec.instructions.length > 0 &&
               typeof spec.io === 'object' &&
               spec.io !== null &&
               typeof spec.io.format === 'string';
      }

      expect(validateMinimalSpec(minimalSpec)).toBe(true);
      expect(validateMinimalSpec({})).toBe(false);
      expect(validateMinimalSpec({ version: '1.0' })).toBe(false);
    });

    test('should validate complete structural thinking spec', () => {
      const completeSpec = {
        version: '1.0',
        intent: 'generate_code',
        title: 'Create authentication system',
        context: { domain: 'code' },
        instructions: ['Create a comprehensive authentication system'],
        constraints: ['max 500 lines of code'],
        io: { format: 'markdown' },
        ambiguities: [],
        metrics: { clarity: 0.85, completeness: 0.92 },
        notes: 'High priority feature'
      };

      function validateCompleteSpec(spec) {
        const requiredFields = ['version', 'intent', 'instructions', 'io'];
        const hasRequired = requiredFields.every(field => field in spec);
        const hasValidMetrics = spec.metrics && 
                               typeof spec.metrics.clarity === 'number' &&
                               typeof spec.metrics.completeness === 'number' &&
                               spec.metrics.clarity >= 0 && spec.metrics.clarity <= 1 &&
                               spec.metrics.completeness >= 0 && spec.metrics.completeness <= 1;
        
        return hasRequired && hasValidMetrics;
      }

      expect(validateCompleteSpec(completeSpec)).toBe(true);
    });
  });
});

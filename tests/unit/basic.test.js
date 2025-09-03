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

  describe('JSON Conversion Functionality', () => {
    test('should convert simple prompt to JSON structure', () => {
      function convertPromptToJson(prompt, domain = 'general', originalPrompt = '') {
        const words = prompt.split(/\s+/);
        let task = '', subject = '';
        
        // Extract task (first few words that look like actions)
        const actionWords = ['create', 'add', 'implement', 'build', 'design', 'develop', 'test', 'fix', 'update'];
        const firstWords = words.slice(0, 3).join(' ').toLowerCase();
        
        for (const action of actionWords) {
          if (firstWords.includes(action)) {
            const actionIndex = words.findIndex(w => w.toLowerCase().includes(action));
            task = words.slice(0, actionIndex + 1).join(' ');
            subject = words.slice(actionIndex + 1).join(' ');
            break;
          }
        }
        
        if (!task) {
          task = words.slice(0, 2).join(' ');
          subject = words.slice(2).join(' ');
        }

        return {
          task: task || prompt.split('.')[0],
          subject: subject || 'functionality',
          constraints: [],
          requirements: [
            'Provide comprehensive response',
            'Include specific examples and actionable details',
            'Structure response with clear sections',
            'Include measurable outcomes'
          ],
          outputFormat: {
            structure: ['Overview', 'Details', 'Next Steps'],
            type: 'structured response',
            includeExamples: true,
            includeMeasurableOutcomes: true
          },
          domain: domain,
          originalPrompt: originalPrompt || prompt,
          refinedPrompt: prompt
        };
      }

      const result = convertPromptToJson('create user authentication', 'code', 'create user auth');
      
      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('outputFormat');
      expect(result.domain).toBe('code');
      expect(result.originalPrompt).toBe('create user auth');
      expect(result.refinedPrompt).toBe('create user authentication');
      expect(Array.isArray(result.requirements)).toBe(true);
      expect(result.requirements.length).toBeGreaterThan(0);
    });

    test('should handle complex prompts with requirements', () => {
      function convertPromptToJson(prompt, domain = 'general', originalPrompt = '') {
        const baseStructure = {
          task: 'implement',
          subject: 'complex functionality',
          constraints: [],
          requirements: [],
          outputFormat: {
            structure: ['Overview', 'Details', 'Next Steps'],
            type: 'structured response',
            includeExamples: true,
            includeMeasurableOutcomes: true
          },
          domain: domain,
          originalPrompt: originalPrompt || prompt,
          refinedPrompt: prompt
        };

        // Extract requirements from prompt
        if (prompt.includes('Requirements:')) {
          const requirementsPart = prompt.split('Requirements:')[1];
          if (requirementsPart) {
            baseStructure.requirements = [
              'Provide comprehensive response',
              'Include specific examples and actionable details',
              'Structure response with clear sections',
              'Include measurable outcomes'
            ];
          }
        }

        return baseStructure;
      }

      const complexPrompt = 'implement user dashboard. Requirements: Provide comprehensive response with specific examples and actionable details. Structure the response with clear sections: Overview, Details, and Next Steps.';
      const result = convertPromptToJson(complexPrompt, 'product', 'implement dashboard');

      expect(result.domain).toBe('product');
      expect(result.requirements).toContain('Provide comprehensive response');
      expect(result.requirements).toContain('Include specific examples and actionable details');
      expect(result.outputFormat.structure).toEqual(['Overview', 'Details', 'Next Steps']);
    });

    test('should validate JSON structure properties', () => {
      const requiredProperties = [
        'task', 'subject', 'constraints', 'requirements', 
        'outputFormat', 'domain', 'originalPrompt', 'refinedPrompt'
      ];

      function mockConvertPromptToJson() {
        return {
          task: 'test task',
          subject: 'test subject', 
          constraints: [],
          requirements: ['test requirement'],
          outputFormat: {
            structure: ['Overview', 'Details', 'Next Steps'],
            type: 'structured response',
            includeExamples: true,
            includeMeasurableOutcomes: true
          },
          domain: 'general',
          originalPrompt: 'test original',
          refinedPrompt: 'test refined'
        };
      }

      const result = mockConvertPromptToJson();
      
      requiredProperties.forEach(prop => {
        expect(result).toHaveProperty(prop);
      });

      expect(Array.isArray(result.constraints)).toBe(true);
      expect(Array.isArray(result.requirements)).toBe(true);
      expect(Array.isArray(result.outputFormat.structure)).toBe(true);
      expect(typeof result.outputFormat.type).toBe('string');
      expect(typeof result.outputFormat.includeExamples).toBe('boolean');
      expect(typeof result.outputFormat.includeMeasurableOutcomes).toBe('boolean');
    });
  });

  describe('Parameter Validation', () => {
    test('should validate json parameter type', () => {
      function validateJsonParameter(value) {
        if (value === undefined) return true; // optional parameter
        return typeof value === 'boolean';
      }

      expect(validateJsonParameter(true)).toBe(true);
      expect(validateJsonParameter(false)).toBe(true);
      expect(validateJsonParameter(undefined)).toBe(true);
      expect(validateJsonParameter('true')).toBe(false);
      expect(validateJsonParameter(1)).toBe(false);
      expect(validateJsonParameter(null)).toBe(false);
      expect(validateJsonParameter({})).toBe(false);
    });

    test('should validate st_refine input parameters', () => {
      function validateStRefineInputs(prompt, domain, includeValidation, includeImprovements, json) {
        const errors = [];
        
        // Validate prompt
        if (!prompt || typeof prompt !== 'string') {
          errors.push('prompt must be a non-empty string');
        } else if (prompt.length < 3) {
          errors.push('prompt must be at least 3 characters');
        } else if (prompt.length > 10000) {
          errors.push('prompt must be less than 10000 characters');
        }

        // Validate domain
        const validDomains = ['code', 'docs', 'data', 'product', 'research'];
        if (domain && !validDomains.includes(domain)) {
          errors.push(`domain must be one of: ${validDomains.join(', ')}`);
        }

        // Validate boolean parameters
        if (includeValidation !== undefined && typeof includeValidation !== 'boolean') {
          errors.push('includeValidation must be a boolean');
        }
        if (includeImprovements !== undefined && typeof includeImprovements !== 'boolean') {
          errors.push('includeImprovements must be a boolean');
        }
        if (json !== undefined && typeof json !== 'boolean') {
          errors.push('json must be a boolean');
        }

        return { isValid: errors.length === 0, errors };
      }

      // Valid inputs
      expect(validateStRefineInputs('test prompt', 'code', true, true, true)).toEqual({
        isValid: true,
        errors: []
      });

      // Invalid prompt
      expect(validateStRefineInputs('', 'code', true, true, false)).toEqual({
        isValid: false,
        errors: ['prompt must be a non-empty string']
      });

      // Invalid domain
      expect(validateStRefineInputs('test prompt', 'invalid', true, true, false)).toEqual({
        isValid: false,
        errors: ['domain must be one of: code, docs, data, product, research']
      });

      // Invalid json parameter
      expect(validateStRefineInputs('test prompt', 'code', true, true, 'true')).toEqual({
        isValid: false,
        errors: ['json must be a boolean']
      });
    });
  });

  describe('st_refine Tool Registration', () => {
    test('should have correct tool metadata', () => {
      const mockStRefineToolMeta = {
        name: 'st_refine',
        description: 'Converts free-text prompts into structured Structural Thinking JSON with comprehensive analysis including transformation, gap detection, validation, improvement suggestions, and optional JSON conversion for structured prompt engineering',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            domain: { 
              type: 'string', 
              enum: ['code', 'docs', 'data', 'product', 'research'] 
            },
            includeValidation: { 
              type: 'boolean', 
              default: true 
            },
            includeImprovements: { 
              type: 'boolean', 
              default: true 
            },
            json: { 
              type: 'boolean', 
              default: false 
            }
          },
          required: ['prompt'],
          additionalProperties: false
        }
      };

      expect(mockStRefineToolMeta.name).toBe('st_refine');
      expect(mockStRefineToolMeta.description).toContain('JSON conversion');
      expect(mockStRefineToolMeta.inputSchema.properties).toHaveProperty('json');
      expect(mockStRefineToolMeta.inputSchema.properties.json.type).toBe('boolean');
      expect(mockStRefineToolMeta.inputSchema.properties.json.default).toBe(false);
      expect(mockStRefineToolMeta.inputSchema.required).toContain('prompt');
      expect(mockStRefineToolMeta.inputSchema.additionalProperties).toBe(false);
    });

    test('should validate tool input schema structure', () => {
      function validateToolSchema(schema) {
        const requiredProps = ['type', 'properties', 'required'];
        const hasRequiredProps = requiredProps.every(prop => prop in schema);
        
        const hasPromptProperty = 'prompt' in schema.properties;
        const hasJsonProperty = 'json' in schema.properties;
        const promptIsRequired = schema.required.includes('prompt');
        
        return {
          isValid: hasRequiredProps && hasPromptProperty && hasJsonProperty && promptIsRequired,
          hasRequiredProps,
          hasPromptProperty,
          hasJsonProperty,
          promptIsRequired
        };
      }

      const mockSchema = {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          json: { type: 'boolean', default: false }
        },
        required: ['prompt']
      };

      const result = validateToolSchema(mockSchema);
      expect(result.isValid).toBe(true);
      expect(result.hasPromptProperty).toBe(true);
      expect(result.hasJsonProperty).toBe(true);
      expect(result.promptIsRequired).toBe(true);
    });
  });
});

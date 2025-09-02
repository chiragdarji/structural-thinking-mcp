/**
 * Validation Utilities
 * 
 * This module provides input validation functions with detailed
 * error reporting and type checking capabilities.
 */

/**
 * Detailed validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Enhanced input validation with detailed error reporting
 */
export function validateInputDetailed(value: any, type: string, minLength?: number, maxLength?: number): ValidationResult {
  if (type === 'string') {
    if (typeof value !== 'string') {
      return { 
        valid: false, 
        error: `Expected string but received ${typeof value}`, 
        code: 'INVALID_TYPE' 
      };
    }
    if (minLength !== undefined && value.length < minLength) {
      return { 
        valid: false, 
        error: `String too short: ${value.length} chars (min: ${minLength})`, 
        code: 'TOO_SHORT' 
      };
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return { 
        valid: false, 
        error: `String too long: ${value.length} chars (max: ${maxLength})`, 
        code: 'TOO_LONG' 
      };
    }
  }
  
  if (type === 'object' && (typeof value !== 'object' || value === null)) {
    return { 
      valid: false, 
      error: `Expected object but received ${value === null ? 'null' : typeof value}`, 
      code: 'INVALID_TYPE' 
    };
  }
  
  if (type === 'array' && !Array.isArray(value)) {
    return { 
      valid: false, 
      error: `Expected array but received ${typeof value}`, 
      code: 'INVALID_TYPE' 
    };
  }
  
  if (type === 'number' && typeof value !== 'number') {
    return { 
      valid: false, 
      error: `Expected number but received ${typeof value}`, 
      code: 'INVALID_TYPE' 
    };
  }
  
  if (type === 'boolean' && typeof value !== 'boolean') {
    return { 
      valid: false, 
      error: `Expected boolean but received ${typeof value}`, 
      code: 'INVALID_TYPE' 
    };
  }
  
  return { valid: true };
}

/**
 * Legacy wrapper for backward compatibility
 */
export function validateInput(value: any, type: string, minLength?: number, maxLength?: number): boolean {
  return validateInputDetailed(value, type, minLength, maxLength).valid;
}

/**
 * Validate domain parameter
 */
export function validateDomain(domain: string): ValidationResult {
  const validDomains = ["code", "docs", "data", "product", "research"];
  
  const typeValidation = validateInputDetailed(domain, 'string');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  if (!validDomains.includes(domain)) {
    return {
      valid: false,
      error: `Domain '${domain}' is not supported. Valid options: ${validDomains.join(', ')}`,
      code: 'INVALID_DOMAIN'
    };
  }
  
  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const typeValidation = validateInputDetailed(email, 'string');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Invalid email format',
      code: 'INVALID_EMAIL'
    };
  }
  
  return { valid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  const typeValidation = validateInputDetailed(url, 'string');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format',
      code: 'INVALID_URL'
    };
  }
}

/**
 * Validate JSON string
 */
export function validateJsonString(jsonString: string): ValidationResult {
  const typeValidation = validateInputDetailed(jsonString, 'string');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  try {
    JSON.parse(jsonString);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'INVALID_JSON'
    };
  }
}

/**
 * Validate numeric range
 */
export function validateRange(value: number, min?: number, max?: number): ValidationResult {
  const typeValidation = validateInputDetailed(value, 'number');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  if (min !== undefined && value < min) {
    return {
      valid: false,
      error: `Value ${value} is below minimum ${min}`,
      code: 'BELOW_MINIMUM'
    };
  }
  
  if (max !== undefined && value > max) {
    return {
      valid: false,
      error: `Value ${value} is above maximum ${max}`,
      code: 'ABOVE_MAXIMUM'
    };
  }
  
  return { valid: true };
}

/**
 * Validate array length
 */
export function validateArrayLength(array: any[], minLength?: number, maxLength?: number): ValidationResult {
  const typeValidation = validateInputDetailed(array, 'array');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  if (minLength !== undefined && array.length < minLength) {
    return {
      valid: false,
      error: `Array too short: ${array.length} items (min: ${minLength})`,
      code: 'ARRAY_TOO_SHORT'
    };
  }
  
  if (maxLength !== undefined && array.length > maxLength) {
    return {
      valid: false,
      error: `Array too long: ${array.length} items (max: ${maxLength})`,
      code: 'ARRAY_TOO_LONG'
    };
  }
  
  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): ValidationResult {
  const typeValidation = validateInputDetailed(filename, 'string');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) {
    return {
      valid: false,
      error: 'File has no extension',
      code: 'NO_EXTENSION'
    };
  }
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension '${extension}' not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      code: 'INVALID_EXTENSION'
    };
  }
  
  return { valid: true };
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(obj: any, requiredFields: string[]): ValidationResult {
  const typeValidation = validateInputDetailed(obj, 'object');
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const missingFields = requiredFields.filter(field => !(field in obj));
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
      code: 'MISSING_FIELDS'
    };
  }
  
  return { valid: true };
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize(input: string, maxLength: number = 10000): ValidationResult & { sanitized?: string } {
  const validation = validateInputDetailed(input, 'string', 1, maxLength);
  if (!validation.valid) {
    return validation;
  }
  
  const sanitized = sanitizeString(input);
  
  return {
    valid: true,
    sanitized
  };
}

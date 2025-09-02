/**
 * Core Analysis Engine for Structural Thinking
 * 
 * This module contains the main analysis logic for converting prompts
 * into structured thinking specifications and calculating quality metrics.
 */

import { getScoringConfig, type ScoringConfig } from '../config/scoring.config.js';
import { 
  VAGUE_WORDS, 
  CLARITY_INDICATORS, 
  COMPLETENESS_INDICATORS, 
  CONCRETE_VERBS,
  MEASUREMENT_PATTERNS,
  STRUCTURE_PATTERNS,
  QUESTION_WORDS,
  getDomainPatterns,
  getVagueSuggestions
} from '../config/patterns.config.js';
import { safeRound, getWordCount } from '../utils/formatting.js';
import { validateInputDetailed, type ValidationResult } from '../utils/validation.js';

/**
 * Structural Thinking specification interface
 */
export interface StructuralThinking {
  version: string;
  intent: string;
  title?: string;
  context?: {
    domain?: string;
    inputs?: Array<{ type: string; ref: string }>;
  };
  instructions: string[];
  constraints?: string[];
  io: {
    format: string;
    contract?: {
      sections?: string[];
      schemaRef?: string;
    };
  };
  ambiguities?: string[];
  metrics?: {
    clarity: number;
    completeness: number;
  };
  notes?: string;
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  transformation: {
    spec: StructuralThinking;
    schemaValid: boolean;
    schemaErrors: string[];
    processingInfo: {
      promptLength: number;
      wordCount: number;
      domain?: string;
    };
  };
  gapDetection: {
    issues: Array<{
      path: string;
      message: string;
      severity: 'error' | 'warn' | 'info';
    }>;
    score: {
      clarity: number;
      completeness: number;
    };
  };
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: Array<{ path: string; message: string }>;
  };
  improvements?: {
    patches: Array<{
      op: 'add' | 'replace' | 'remove';
      path: string;
      value?: any;
    }>;
    improvementCount: number;
  };
  summary: {
    overallQuality: number;
    primaryIssues: number;
    warnings: number;
    suggestions: number;
    readyForImplementation: boolean;
  };
}

/**
 * Vague language analysis result
 */
export interface VagueLanguageAnalysis {
  hasVague: boolean;
  vagueTerms: string[];
  suggestions: string[];
}

/**
 * Analyze vague language in text with detailed feedback
 */
export function analyzeVagueLanguage(text: string): VagueLanguageAnalysis {
  const validation = validateInputDetailed(text, 'string');
  if (!validation.valid) {
    return { hasVague: false, vagueTerms: [], suggestions: [] };
  }
  
  const vagueTerms: string[] = [];
  
  VAGUE_WORDS.forEach(rx => {
    const matches = text.match(rx);
    if (matches) {
      vagueTerms.push(...matches);
    }
  });
  
  const uniqueTerms = [...new Set(vagueTerms)];
  const suggestions = getVagueSuggestions(uniqueTerms);
  
  return { 
    hasVague: uniqueTerms.length > 0, 
    vagueTerms: uniqueTerms, 
    suggestions 
  };
}

/**
 * Calculate clarity score for a given text
 */
export function calculateClarity(text: string, hasConstraints: boolean, domain?: string): number {
  try {
    const validation = validateInputDetailed(text, 'string', 3);
    if (!validation.valid) return 0;

    const config = getScoringConfig(domain).clarity;
    let clarityScore = config.baseScore;
    const totalWords = getWordCount(text);
    
    // Proportional vague language penalty
    const vagueCount = VAGUE_WORDS.filter(rx => rx.test(text)).length;
    if (config.proportionalScoring && totalWords > 0) {
      const vagueRatio = vagueCount / totalWords;
      clarityScore -= Math.min(vagueRatio * totalWords * config.vagueWordPenalty, config.maxVagueWordPenalty);
    } else {
      clarityScore -= Math.min(vagueCount * config.vagueWordPenalty, config.maxVagueWordPenalty);
    }
    
    // Reward clarity indicators
    const clarityCount = CLARITY_INDICATORS.filter(rx => rx.test(text)).length;
    clarityScore += Math.min(clarityCount * config.clarityIndicatorBonus, config.maxClarityIndicatorBonus);
    
    // Reward specific numbers/measurements
    const numberMatches = MEASUREMENT_PATTERNS.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    clarityScore += Math.min(numberMatches * config.measurementBonus, config.maxMeasurementBonus);
    
    // Reward concrete verbs
    const verbCount = CONCRETE_VERBS.filter(rx => rx.test(text)).length;
    clarityScore += Math.min(verbCount * config.verbBonus, config.maxVerbBonus);
    
    // Penalize overly long sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > config.minSentenceLength);
    if (sentences.length > 0) {
      const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
      if (avgSentenceLength > config.sentenceLengthThreshold1) {
        clarityScore -= config.longSentencePenalty1;
      }
      if (avgSentenceLength > config.sentenceLengthThreshold2) {
        clarityScore -= config.longSentencePenalty2;
      }
    }
    
    // Reward structured language (bullets, numbered lists)
    const hasStructure = STRUCTURE_PATTERNS.some(pattern => pattern.test(text));
    if (hasStructure) {
      clarityScore += config.structureBonus;
    }
    
    // Bonus for question words that indicate clear intent
    const questionMatches = (text.match(QUESTION_WORDS) || []).length;
    if (questionMatches > 0) {
      clarityScore += Math.min(questionMatches * 0.02, 0.08);
    }
    
    // Domain-specific bonuses
    const domainPatterns = getDomainPatterns(domain);
    const domainMatches = domainPatterns.reduce((count, pattern) => {
      return count + (text.match(pattern) || []).length;
    }, 0);
    if (domainMatches > 0) {
      clarityScore += Math.min(domainMatches * 0.01, 0.05);
    }
    
    return safeRound(Math.max(0, Math.min(1, clarityScore)));
  } catch (error) {
    console.error('Error calculating clarity:', error);
    return getScoringConfig(domain).clarity.baseScore;
  }
}

/**
 * Calculate completeness score for a specification
 */
export function calculateCompleteness(text: string, spec: StructuralThinking, domain?: string): number {
  try {
    const textValidation = validateInputDetailed(text, 'string');
    const specValidation = validateInputDetailed(spec, 'object');
    
    if (!textValidation.valid || !specValidation.valid) {
      return 0;
    }

    const config = getScoringConfig(domain).completeness;
    let completenessScore = config.baseScore;

    // Title quality
    if (spec.title && spec.title.length >= config.titleMinLength) {
      completenessScore += config.titleBonus;
    }

    // Instructions depth and quality
    if (spec.instructions && spec.instructions.length > 0) {
      completenessScore += config.instructionsBonus;
      
      const instructionText = spec.instructions.join(' ');
      const instructionWordCount = getWordCount(instructionText);
      
      if (instructionWordCount > config.depthThreshold1) {
        completenessScore += config.depthBonus1;
      }
      if (instructionWordCount > config.depthThreshold2) {
        completenessScore += config.depthBonus2;
      }
      if (instructionWordCount > config.depthThreshold3) {
        completenessScore += config.depthBonus3;
      }
      
      // Penalty for very short instructions
      if (instructionWordCount < config.shortInstructionThreshold) {
        completenessScore -= config.shortInstructionPenalty;
      }
    }

    // Constraints presence
    if (spec.constraints && spec.constraints.length > 0) {
      completenessScore += config.constraintsBonus;
    }

    // Domain context
    if (spec.context?.domain) {
      completenessScore += config.domainBonus;
    }

    // Output format specification
    if (spec.io?.format) {
      completenessScore += config.formatBonus;
    }

    // Output contract sections
    if (spec.io?.contract?.sections && spec.io.contract.sections.length > 0) {
      const sectionBonus = Math.min(
        spec.io.contract.sections.length * config.sectionsBonus,
        config.maxSectionsBonus
      );
      completenessScore += sectionBonus;
    }

    // Completeness indicators in text
    const completenessCount = COMPLETENESS_INDICATORS.filter(rx => rx.test(text)).length;
    const indicatorBonus = Math.min(
      completenessCount * config.completenessIndicatorBonus,
      config.maxCompletenessIndicatorBonus
    );
    completenessScore += indicatorBonus;

    // Examples and concrete details
    const hasExamples = /\b(example|instance|such as|like|including)\b/gi.test(text);
    if (hasExamples) {
      completenessScore += config.exampleBonus;
    }

    return safeRound(Math.max(0, Math.min(1, completenessScore)));
  } catch (error) {
    console.error('Error calculating completeness:', error);
    return getScoringConfig(domain).completeness.baseScore;
  }
}

/**
 * Draft a structural thinking specification from text
 */
export function draftFromText(prompt: string, domain?: string): StructuralThinking {
  const lines = prompt.split('\n').filter(line => line.trim());
  const joined = lines.join(' ').trim();
  
  // Determine intent based on content analysis
  let intent = 'general';
  if (/\b(create|build|implement|develop|generate)\b/i.test(joined)) {
    intent = 'generate_code';
  } else if (/\b(analyze|review|evaluate|assess)\b/i.test(joined)) {
    intent = 'analyze';
  } else if (/\b(explain|describe|document|outline)\b/i.test(joined)) {
    intent = 'explain';
  }

  const spec: StructuralThinking = {
    version: '1.0',
    intent,
    title: lines[0] || joined.slice(0, 100),
    context: domain ? { domain } : {},
    instructions: [joined],
    constraints: [],
    io: {
      format: 'markdown',
      contract: {}
    },
    ambiguities: [],
    metrics: {
      clarity: calculateClarity(joined, false, domain),
      completeness: 0 // Will be calculated after spec is complete
    },
    notes: ''
  };

  // Extract word limit constraints
  const wordLimitMatch = joined.match(/(\d{2,4})\s*words?/i);
  if (wordLimitMatch) {
    spec.constraints?.push(`max ${wordLimitMatch[1]} words`);
  }

  // Detect common section hints
  const sections: string[] = [];
  if (/\b(overview|summary|introduction)\b/i.test(joined)) sections.push('Overview');
  if (/\b(details?|implementation|steps?)\b/i.test(joined)) sections.push('Details');
  if (/\b(next steps?|conclusion|follow[- ]?up)\b/i.test(joined)) sections.push('NextSteps');
  if (/\b(examples?|samples?)\b/i.test(joined)) sections.push('Examples');

  if (sections.length > 0) {
    spec.io.contract = { sections };
  }

  // Calculate final completeness score
  spec.metrics!.completeness = calculateCompleteness(joined, spec, domain);

  return spec;
}

/**
 * Detect gaps and issues in a specification
 */
export function detectGaps(spec: StructuralThinking): AnalysisResult['gapDetection'] {
  const issues: Array<{ path: string; message: string; severity: 'error' | 'warn' | 'info' }> = [];

  // Check for missing sections
  if (spec.io?.format === 'markdown' && !spec.io?.contract?.sections?.length) {
    issues.push({
      path: '/io/contract/sections',
      message: 'Missing markdown sections for output contract',
      severity: 'warn'
    });
  }

  // Check for vague language
  const instructionText = spec.instructions?.join(' ') || '';
  const vagueAnalysis = analyzeVagueLanguage(instructionText);
  if (vagueAnalysis.hasVague) {
    issues.push({
      path: '/instructions',
      message: 'Vague language detected (optimize/better/quickly/etc.)',
      severity: 'warn'
    });
  }

  // Check for missing constraints
  if (!spec.constraints || spec.constraints.length === 0) {
    issues.push({
      path: '/constraints',
      message: 'Consider adding constraints (word limit, style, tone)',
      severity: 'info'
    });
  }

  // Check for missing inputs
  if (!spec.context?.inputs || spec.context.inputs.length === 0) {
    issues.push({
      path: '/context/inputs',
      message: 'No inputs linked (file/url/text). Add at least one if applicable.',
      severity: 'info'
    });
  }

  return {
    issues,
    score: {
      clarity: spec.metrics?.clarity || 0,
      completeness: spec.metrics?.completeness || 0
    }
  };
}

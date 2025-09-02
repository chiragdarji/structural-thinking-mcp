/**
 * Scoring Configuration for Structural Thinking Analysis
 * 
 * This file centralizes all scoring parameters and thresholds for the
 * structural thinking analysis engine. Values can be adjusted based on
 * domain requirements and empirical testing.
 */

export interface ClarityConfig {
  baseScore: number;
  proportionalScoring: boolean;
  vagueWordPenalty: number;
  maxVagueWordPenalty: number;
  clarityIndicatorBonus: number;
  maxClarityIndicatorBonus: number;
  measurementBonus: number;
  maxMeasurementBonus: number;
  verbBonus: number;
  maxVerbBonus: number;
  minSentenceLength: number;
  sentenceLengthThreshold1: number;
  sentenceLengthThreshold2: number;
  longSentencePenalty1: number;
  longSentencePenalty2: number;
  structureBonus: number;
}

export interface CompletenessConfig {
  baseScore: number;
  titleBonus: number;
  titleMinLength: number;
  instructionsBonus: number;
  constraintsBonus: number;
  domainBonus: number;
  formatBonus: number;
  sectionsBonus: number;
  maxSectionsBonus: number;
  completenessIndicatorBonus: number;
  maxCompletenessIndicatorBonus: number;
  exampleBonus: number;
  depthBonus1: number;
  depthBonus2: number;
  depthBonus3: number;
  depthThreshold1: number;
  depthThreshold2: number;
  depthThreshold3: number;
  shortInstructionPenalty: number;
  shortInstructionThreshold: number;
}

export interface ValidationConfig {
  minPromptLength: number;
  maxPromptLength: number;
  roundingPrecision: number;
}

export interface ScoringConfig {
  clarity: ClarityConfig;
  completeness: CompletenessConfig;
  validation: ValidationConfig;
}

/**
 * Default scoring configuration optimized for general use cases
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  clarity: {
    baseScore: 0.5,
    proportionalScoring: true,
    vagueWordPenalty: 0.05,
    maxVagueWordPenalty: 0.25,
    clarityIndicatorBonus: 0.03,
    maxClarityIndicatorBonus: 0.15,
    measurementBonus: 0.02,
    maxMeasurementBonus: 0.1,
    verbBonus: 0.02,
    maxVerbBonus: 0.1,
    minSentenceLength: 5,
    sentenceLengthThreshold1: 150,
    sentenceLengthThreshold2: 250,
    longSentencePenalty1: 0.05,
    longSentencePenalty2: 0.1,
    structureBonus: 0.05
  },
  completeness: {
    baseScore: 0.35,
    titleBonus: 0.08,
    titleMinLength: 5,
    instructionsBonus: 0.18,
    constraintsBonus: 0.12,
    domainBonus: 0.08,
    formatBonus: 0.08,
    sectionsBonus: 0.04,
    maxSectionsBonus: 0.16,
    completenessIndicatorBonus: 0.025,
    maxCompletenessIndicatorBonus: 0.1,
    exampleBonus: 0.08,
    depthBonus1: 0.04, // >50 words
    depthBonus2: 0.04, // >100 words  
    depthBonus3: 0.04, // >200 words
    depthThreshold1: 50,
    depthThreshold2: 100,
    depthThreshold3: 200,
    shortInstructionPenalty: 0.1,
    shortInstructionThreshold: 50
  },
  validation: {
    minPromptLength: 3,
    maxPromptLength: 10000,
    roundingPrecision: 2
  }
};

/**
 * Domain-specific configurations can override defaults
 */
export const DOMAIN_CONFIGS: Record<string, {
  clarity?: Partial<ClarityConfig>;
  completeness?: Partial<CompletenessConfig>;
  validation?: Partial<ValidationConfig>;
}> = {
  code: {
    clarity: {
      verbBonus: 0.03, // Higher bonus for technical verbs
      maxVerbBonus: 0.15
    },
    completeness: {
      constraintsBonus: 0.15, // Technical constraints more important
      exampleBonus: 0.1 // Code examples highly valued
    }
  },
  
  docs: {
    clarity: {
      structureBonus: 0.08, // Documentation structure critical
      clarityIndicatorBonus: 0.04
    },
    completeness: {
      sectionsBonus: 0.06, // Well-structured sections important
      maxSectionsBonus: 0.2
    }
  },
  
  product: {
    completeness: {
      exampleBonus: 0.12, // User stories and examples crucial
      depthBonus1: 0.06,
      depthBonus2: 0.06,
      depthBonus3: 0.06
    }
  },
  
  research: {
    clarity: {
      measurementBonus: 0.04, // Quantitative data important
      maxMeasurementBonus: 0.15
    },
    completeness: {
      depthThreshold1: 75, // Research needs more depth
      depthThreshold2: 150,
      depthThreshold3: 300
    }
  }
};

/**
 * Get configuration for a specific domain, merging with defaults
 */
export function getScoringConfig(domain?: string): ScoringConfig {
  if (!domain || !DOMAIN_CONFIGS[domain]) {
    return DEFAULT_SCORING_CONFIG;
  }
  
  const domainConfig = DOMAIN_CONFIGS[domain];
  return {
    clarity: { ...DEFAULT_SCORING_CONFIG.clarity, ...domainConfig.clarity },
    completeness: { ...DEFAULT_SCORING_CONFIG.completeness, ...domainConfig.completeness },
    validation: { ...DEFAULT_SCORING_CONFIG.validation, ...domainConfig.validation }
  };
}

/**
 * Load configuration from environment variables if available
 */
export function loadConfigFromEnv(): {
  clarity?: Partial<ClarityConfig>;
  completeness?: Partial<CompletenessConfig>;
  validation?: Partial<ValidationConfig>;
} {
  const config: {
    clarity?: Partial<ClarityConfig>;
    completeness?: Partial<CompletenessConfig>;
    validation?: Partial<ValidationConfig>;
  } = {};
  
  // Example environment variable overrides
  if (process.env.ST_CLARITY_BASE_SCORE) {
    config.clarity = {
      baseScore: parseFloat(process.env.ST_CLARITY_BASE_SCORE)
    };
  }
  
  if (process.env.ST_MAX_PROMPT_LENGTH) {
    config.validation = {
      maxPromptLength: parseInt(process.env.ST_MAX_PROMPT_LENGTH)
    };
  }
  
  return config;
}

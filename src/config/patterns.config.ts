/**
 * Language Patterns Configuration
 * 
 * This file contains all regex patterns and word lists used for
 * analyzing prompt quality and language clarity.
 */

/**
 * Vague language patterns that reduce clarity scores
 */
export const VAGUE_WORDS: RegExp[] = [
  /\boptimi[sz]e[ds]?\b/i, 
  /\bbetter\b/i, 
  /\bquickly\b/i, 
  /\bimprove[ds]?\b/i, 
  /\bnice\b/i, 
  /\bgood\b/i, 
  /\bclean\b/i, 
  /\befficient\b/i, 
  /\bsimple\b/i, 
  /\beasy\b/i, 
  /\bfast\b/i, 
  /\bsmooth\b/i, 
  /\bpretty\b/i, 
  /\bquite\b/i,
  /\bvery\b/i, 
  /\breally\b/i, 
  /\bsomewhat\b/i, 
  /\brather\b/i, 
  /\bbasically\b/i,
  /\bobviously\b/i, 
  /\bclearly\b/i
];

/**
 * Language patterns that indicate clarity and specificity
 */
export const CLARITY_INDICATORS: RegExp[] = [
  /\bspecifically\b/i, 
  /\bexactly\b/i, 
  /\bmust\b/i, 
  /\bshall\b/i, 
  /\brequired\b/i, 
  /\bmandatory\b/i, 
  /\bwill\b/i, 
  /\bshould\b/i,
  /\bprecisely\b/i, 
  /\bexplicitly\b/i, 
  /\bdefined as\b/i, 
  /\bmeasured by\b/i,
  /\bstrictly\b/i, 
  /\bcompulsory\b/i
];

/**
 * Patterns that indicate completeness and thoroughness
 */
export const COMPLETENESS_INDICATORS: RegExp[] = [
  /\binput\b/i, 
  /\boutput\b/i, 
  /\bformat\b/i, 
  /\bconstraints?\b/i, 
  /\blimits?\b/i, 
  /\bsteps?\b/i, 
  /\bprocess\b/i, 
  /\bmethods?\b/i,
  /\bworkflows?\b/i, 
  /\bpipelines?\b/i, 
  /\brequirements?\b/i, 
  /\bspecifications?\b/i, 
  /\bparameters?\b/i, 
  /\bcriteria\b/i
];

/**
 * Concrete action verbs that improve clarity
 */
export const CONCRETE_VERBS: RegExp[] = [
  /\bcreate[ds]?\b/i, 
  /\bgenerate[ds]?\b/i, 
  /\bwrite[ns]?\b/i, 
  /\banalyze[ds]?\b/i, 
  /\bcompare[ds]?\b/i, 
  /\blist[s]?\b/i, 
  /\bsummari[sz]e[ds]?\b/i, 
  /\bextract[s]?\b/i,
  /\bidentify\b/i, 
  /\bcalculate[ds]?\b/i, 
  /\bimplement[s]?\b/i, 
  /\bdesign[s]?\b/i
];

/**
 * Patterns for detecting measurements and quantitative data
 */
export const MEASUREMENT_PATTERNS: RegExp[] = [
  /\b\d+\s*(words?|characters?|minutes?|hours?|days?|%|percent|items?|steps?)\b/gi,
  /\b(approximately|about|roughly)\s+\d+/gi,
  /\b\d+[-–]\d+\s*(words?|items?|steps?)/gi,
  /\b(less than|more than|at least|up to)\s+\d+/gi
];

/**
 * Patterns for structured content (lists, sections)
 */
export const STRUCTURE_PATTERNS: RegExp[] = [
  /[-•*]\s+/g,      // Bullet points
  /\d+\.\s+/g,      // Numbered lists
  /#{1,6}\s+/g,     // Markdown headers
  /\b(first|second|third|then|next|finally)\b/gi  // Sequential indicators
];

/**
 * Question words that indicate clear intent
 */
export const QUESTION_WORDS: RegExp = /\b(what|how|why|when|where|which|who)\b/gi;

/**
 * Domain-specific terminology patterns
 */
export const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  code: [
    /\b(function|class|method|variable|API|endpoint|database|framework)\b/gi,
    /\b(implement|deploy|debug|test|refactor|optimize)\b/gi,
    /\b(TypeScript|JavaScript|Python|React|Node\.js|SQL)\b/gi
  ],
  
  docs: [
    /\b(documentation|guide|tutorial|reference|manual|FAQ)\b/gi,
    /\b(section|chapter|appendix|glossary|index)\b/gi,
    /\b(explain|describe|outline|summarize)\b/gi
  ],
  
  product: [
    /\b(feature|requirement|user story|acceptance criteria|MVP)\b/gi,
    /\b(stakeholder|customer|user|persona|journey)\b/gi,
    /\b(prioritize|roadmap|milestone|release|sprint)\b/gi
  ],
  
  research: [
    /\b(hypothesis|methodology|analysis|findings|conclusion)\b/gi,
    /\b(data|sample|statistical|correlation|significance)\b/gi,
    /\b(study|experiment|survey|interview|observation)\b/gi
  ]
};

/**
 * Vague language mappings to specific suggestions
 */
export const VAGUE_LANGUAGE_SUGGESTIONS: Record<string, string[]> = {
  'better': ['Specify measurable improvements', 'Define quality criteria'],
  'optimi': ['Define optimization criteria and metrics', 'Specify performance targets'],
  'improve': ['Quantify the improvement goals', 'Define success metrics'],
  'good|nice': ['Define quality criteria specifically', 'Use measurable standards'],
  'fast|quick': ['Specify performance requirements', 'Define time constraints'],
  'clean': ['Define code quality standards', 'Specify formatting rules'],
  'efficient': ['Define efficiency metrics', 'Specify resource constraints'],
  'simple': ['Define complexity constraints', 'Specify simplicity criteria'],
  'easy': ['Define usability requirements', 'Specify learning curve goals']
};

/**
 * Get domain-specific patterns for enhanced analysis
 */
export function getDomainPatterns(domain?: string): RegExp[] {
  if (!domain || !DOMAIN_PATTERNS[domain]) {
    return [];
  }
  return DOMAIN_PATTERNS[domain];
}

/**
 * Get suggestions for detected vague language
 */
export function getVagueSuggestions(vagueTerms: string[]): string[] {
  const suggestions: string[] = [];
  
  for (const term of vagueTerms) {
    const normalizedTerm = term.toLowerCase();
    
    for (const [pattern, termSuggestions] of Object.entries(VAGUE_LANGUAGE_SUGGESTIONS)) {
      if (normalizedTerm.includes(pattern) || new RegExp(pattern, 'i').test(normalizedTerm)) {
        suggestions.push(...termSuggestions);
      }
    }
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}

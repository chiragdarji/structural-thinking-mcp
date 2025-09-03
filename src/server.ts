#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Ajv from "ajv";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

// --- Types ---
type Ambiguity = { path: string; message: string; severity: "info"|"warn"|"error" };
type StructuralThinking = {
  version: "1.0";
  intent: string;
  title?: string;
  context?: { domain?: "code"|"docs"|"data"|"product"|"research"; inputs?: Array<{type:"file"|"text"|"url"; ref:string}> };
  instructions: string[];
  constraints?: string[];
  io: { format: "markdown"|"json"|"csv"|"text"; contract?: { sections?: string[]; schemaRef?: string } };
  ambiguities?: Ambiguity[];
  metrics?: { clarity?: number; completeness?: number };
  notes?: string;
};

// --- Schema ---
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema", "structural-thinking.v1.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const ajv = new (Ajv as any)({ allErrors: true, allowUnionTypes: true, validateSchema: false });
const validateStructuralThinking = ajv.compile(schema);

// --- Configuration ---
const SCORING_CONFIG = {
  clarity: {
    baseScore: 0.5,
    vagueWordPenalty: 0.08,
    maxVagueWordPenalty: 0.4,
    clarityIndicatorBonus: 0.12,
    maxClarityIndicatorBonus: 0.35,
    measurementBonus: 0.1,
    maxMeasurementBonus: 0.25,
    verbBonus: 0.06,
    maxVerbBonus: 0.18,
    longSentencePenalty1: 0.08,
    longSentencePenalty2: 0.12,
    structureBonus: 0.12,
    sentenceLengthThreshold1: 150,
    sentenceLengthThreshold2: 200,
    minSentenceLength: 10,
    proportionalScoring: true
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

// --- Word Lists ---
const vagueWords = [
  /\boptimi[sz]e[ds]?\b/i, /\bbetter\b/i, /\bquickly\b/i, /\bimprove[ds]?\b/i, 
  /\bnice\b/i, /\bgood\b/i, /\bclean\b/i, /\befficient\b/i, /\bsimple\b/i, 
  /\beasy\b/i, /\bfast\b/i, /\bsmooth\b/i, /\bpretty\b/i, /\bquite\b/i,
  /\bvery\b/i, /\breally\b/i, /\bsomewhat\b/i, /\brather\b/i, /\bbasically\b/i,
  /\bobviously\b/i, /\bclearly\b/i
];

const clarityIndicators = [
  /\bspecifically\b/i, /\bexactly\b/i, /\bmust\b/i, /\bshall\b/i, 
  /\brequired\b/i, /\bmandatory\b/i, /\bwill\b/i, /\bshould\b/i,
  /\bprecisely\b/i, /\bexplicitly\b/i, /\bdefined as\b/i, /\bmeasured by\b/i,
  /\bstrictly\b/i, /\bcompulsory\b/i
];

const completenessIndicators = [
  /\binput\b/i, /\boutput\b/i, /\bformat\b/i, /\bconstraints?\b/i, 
  /\blimits?\b/i, /\bsteps?\b/i, /\bprocess\b/i, /\bmethods?\b/i,
  /\bworkflows?\b/i, /\bpipelines?\b/i, /\brequirements?\b/i, 
  /\bspecifications?\b/i, /\bparameters?\b/i, /\bcriteria\b/i
];

const concreteVerbs = [
  /\bcreate[ds]?\b/i, /\bgenerate[ds]?\b/i, /\bwrite[ns]?\b/i, /\banalyze[ds]?\b/i, 
  /\bcompare[ds]?\b/i, /\blist[s]?\b/i, /\bsummari[sz]e[ds]?\b/i, /\bextract[s]?\b/i,
  /\bidentify\b/i, /\bcalculate[ds]?\b/i, /\bimplement[s]?\b/i, /\bdesign[s]?\b/i
];

// --- Helper Functions ---

// Enhanced input validation helpers
interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

function validateInputDetailed(value: any, type: string, minLength?: number, maxLength?: number): ValidationResult {
  if (type === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: `Expected string but received ${typeof value}`, code: 'INVALID_TYPE' };
    }
    if (minLength !== undefined && value.length < minLength) {
      return { valid: false, error: `String too short: ${value.length} chars (min: ${minLength})`, code: 'TOO_SHORT' };
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return { valid: false, error: `String too long: ${value.length} chars (max: ${maxLength})`, code: 'TOO_LONG' };
    }
  }
  if (type === 'object' && (typeof value !== 'object' || value === null)) {
    return { valid: false, error: `Expected object but received ${value === null ? 'null' : typeof value}`, code: 'INVALID_TYPE' };
  }
  return { valid: true };
}

// Legacy wrapper for backward compatibility
function validateInput(value: any, type: string, minLength?: number, maxLength?: number): boolean {
  return validateInputDetailed(value, type, minLength, maxLength).valid;
}

function safeRound(value: number, precision: number = SCORING_CONFIG.validation.roundingPrecision): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function hasVagueLanguage(text: string): boolean {
  if (!validateInput(text, 'string')) return false;
  return vagueWords.some(rx => rx.test(text));
}

// Enhanced vague language analysis with detailed feedback
function analyzeVagueLanguage(text: string): { hasVague: boolean; vagueTerms: string[]; suggestions: string[] } {
  if (!validateInput(text, 'string')) return { hasVague: false, vagueTerms: [], suggestions: [] };
  
  const vagueTerms: string[] = [];
  const suggestions: string[] = [];
  
  vagueWords.forEach(rx => {
    const matches = text.match(rx);
    if (matches) {
      vagueTerms.push(...matches);
      // Add specific suggestions for common vague terms
      if (rx.source.includes('better')) suggestions.push('Specify measurable improvements');
      if (rx.source.includes('optimi')) suggestions.push('Define optimization criteria and metrics');
      if (rx.source.includes('improve')) suggestions.push('Quantify the improvement goals');
      if (rx.source.includes('good|nice')) suggestions.push('Define quality criteria specifically');
      if (rx.source.includes('fast|quick')) suggestions.push('Specify performance requirements');
    }
  });
  
  return { hasVague: vagueTerms.length > 0, vagueTerms: [...new Set(vagueTerms)], suggestions: [...new Set(suggestions)] };
}

function getWordCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function calculateClarity(text: string, hasConstraints: boolean): number {
  try {
    if (!validateInput(text, 'string', SCORING_CONFIG.validation.minPromptLength)) {
      return 0;
    }

    const config = SCORING_CONFIG.clarity;
    let clarityScore = config.baseScore;
    const totalWords = getWordCount(text);
    
    // Proportional vague language penalty
    const vagueCount = vagueWords.filter(rx => rx.test(text)).length;
    if (config.proportionalScoring && totalWords > 0) {
      const vagueRatio = vagueCount / totalWords;
      clarityScore -= Math.min(vagueRatio * totalWords * config.vagueWordPenalty, config.maxVagueWordPenalty);
    } else {
      clarityScore -= Math.min(vagueCount * config.vagueWordPenalty, config.maxVagueWordPenalty);
    }
    
    // Reward clarity indicators
    const clarityCount = clarityIndicators.filter(rx => rx.test(text)).length;
    clarityScore += Math.min(clarityCount * config.clarityIndicatorBonus, config.maxClarityIndicatorBonus);
    
    // Reward specific numbers/measurements
    const numberMatches = text.match(/\b\d+\s*(words?|characters?|minutes?|hours?|days?|%|percent|items?|steps?)\b/gi) || [];
    clarityScore += Math.min(numberMatches.length * config.measurementBonus, config.maxMeasurementBonus);
    
    // Reward concrete verbs
    const verbCount = concreteVerbs.filter(rx => rx.test(text)).length;
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
    if (/[-•*]\s+/g.test(text) || /\d+\.\s+/g.test(text)) {
      clarityScore += config.structureBonus;
    }
    
    return Math.max(0, Math.min(1, clarityScore));
  } catch (error) {
    console.error('Error calculating clarity:', error);
    return SCORING_CONFIG.clarity.baseScore;
  }
}

function calculateCompleteness(text: string, spec: StructuralThinking): number {
  try {
    if (!validateInput(text, 'string') || !validateInput(spec, 'object')) {
      return 0;
    }

    const config = SCORING_CONFIG.completeness;
    let completenessScore = config.baseScore;
    
    // Check for key components
    if (spec.title && spec.title.length > config.titleMinLength) {
      completenessScore += config.titleBonus;
    }
    
    if (spec.instructions && spec.instructions.length > 0) {
      completenessScore += config.instructionsBonus;
    }
    
    if (spec.constraints && spec.constraints.length > 0) {
      completenessScore += config.constraintsBonus;
    }
    
    if (spec.context?.domain) {
      completenessScore += config.domainBonus;
    }
    
    if (spec.io?.format) {
      completenessScore += config.formatBonus;
    }
    
    // Reward specific format requirements
    if (spec.io?.contract?.sections && spec.io.contract.sections.length > 0) {
      completenessScore += Math.min(
        spec.io.contract.sections.length * config.sectionsBonus, 
        config.maxSectionsBonus
      );
    }
    
    // Check for completeness indicators in text
    const completenessCount = completenessIndicators.filter(rx => rx.test(text)).length;
    completenessScore += Math.min(
      completenessCount * config.completenessIndicatorBonus, 
      config.maxCompletenessIndicatorBonus
    );
    
    // Reward examples or concrete references
    if (/\bexamples?\b/i.test(text) || /\bfor instance\b/i.test(text) || /\bsuch as\b/i.test(text)) {
      completenessScore += config.exampleBonus;
    }
    
    // Check instruction depth using word count instead of character count
    const instructionText = spec.instructions ? spec.instructions.join(' ') : '';
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
    
    // Penalize overly brief instructions
    if (spec.instructions && spec.instructions.length === 1 && 
        getWordCount(spec.instructions[0]) < config.shortInstructionThreshold) {
      completenessScore -= config.shortInstructionPenalty;
    }
    
    return Math.max(0, Math.min(1, completenessScore));
  } catch (error) {
    console.error('Error calculating completeness:', error);
    return SCORING_CONFIG.completeness.baseScore;
  }
}

function toLines(text: string): string[] {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// Very lightweight parser (rule-based) to keep MVP vendor-neutral
function draftFromText(prompt: string, domain?: "code"|"docs"|"data"|"product"|"research"): StructuralThinking {
  const lines = toLines(prompt);
  const joined = lines.join(" ");
  const spec: StructuralThinking = {
    version: "1.0",
    intent: (/translate/i.test(joined) ? "translate" :
             /refactor|rewrite/i.test(joined) ? "refactor" :
             /classify/i.test(joined) ? "classify" :
             /explain/i.test(joined) ? "explain" :
             /plan/i.test(joined) ? "plan" :
             /compare/i.test(joined) ? "compare" :
             /summari[sz]e/i.test(joined) ? "summarize" :
             /generate|create|write/i.test(joined) ? "generate_code" :
             "general"),
    title: lines[0]?.slice(0, 80),
    context: { domain },
    instructions: lines,
    constraints: [],
    io: { format: "markdown", contract: {} },
    ambiguities: [],
    metrics: { clarity: 0.0, completeness: 0.0 },
    notes: ""
  };
  // Extract word limit like "in 200 words"
  const m = joined.match(/(\d{2,4})\s*words?/i);
  if (m) spec.constraints?.push(`max ${m[1]} words`);

  // Common section hints
  const sections: string[] = [];
  if (/risk/i.test(joined)) sections.push("Risks");
  if (/next\s*steps?/i.test(joined)) sections.push("NextSteps");
  if (/highlights?|summary/i.test(joined)) sections.push("Highlights");
  if (sections.length) spec.io.contract = { ...(spec.io.contract||{}), sections };

  // Dynamic clarity and completeness calculation
  const clarity = calculateClarity(joined, !!spec.constraints?.length);
  const completeness = calculateCompleteness(joined, spec);
  
  spec.metrics = {
    clarity: safeRound(clarity),
    completeness: safeRound(completeness)
  };
  return spec;
}

function detectGaps(spec: StructuralThinking): { issues: Ambiguity[]; score: { clarity: number; completeness: number } } {
  const issues: Ambiguity[] = [];

  if (!spec.io?.format) {
    issues.push({ path: "/io/format", message: "Missing output format", severity: "error" });
  }
  if (spec.io?.format === "markdown" && !spec.io?.contract?.sections?.length) {
    issues.push({ path: "/io/contract/sections", message: "Missing markdown sections for output contract", severity: "warn" });
  }
  if (!spec.instructions?.length) {
    issues.push({ path: "/instructions", message: "No instructions provided", severity: "error" });
  }
  const joined = (spec.instructions || []).join(" ");
  if (hasVagueLanguage(joined)) {
    issues.push({ path: "/instructions", message: "Vague language detected (optimize/better/quickly/etc.)", severity: "warn" });
  }
  if (!spec.constraints || spec.constraints.length === 0) {
    issues.push({ path: "/constraints", message: "Consider adding constraints (word limit, style, tone)", severity: "info" });
  }
  if (spec.context && !spec.context.inputs?.length) {
    issues.push({ path: "/context/inputs", message: "No inputs linked (file/url/text). Add at least one if applicable.", severity: "info" });
  }

  // Recalculate metrics if not present or seem outdated
  const recalculatedClarity = calculateClarity(joined, !!spec.constraints?.length);
  const recalculatedCompleteness = calculateCompleteness(joined, spec);
  
  const clarity = typeof spec.metrics?.clarity === "number" ? spec.metrics.clarity : recalculatedClarity;
  const completeness = typeof spec.metrics?.completeness === "number" ? spec.metrics.completeness : recalculatedCompleteness;

  return { issues, score: { clarity: safeRound(clarity), completeness: safeRound(completeness) } };
}

// JSON Conversion Helper
function convertPromptToJson(prompt: string, domain?: string): object {
  const words = prompt.split(/\s+/);
  
  // Extract main task/action verbs
  const actionVerbs = ['create', 'build', 'generate', 'design', 'implement', 'develop', 'write', 'make', 'add', 'fix', 'update', 'analyze', 'review', 'test', 'deploy'];
  const mainAction = words.find(word => actionVerbs.some(verb => word.toLowerCase().includes(verb))) || words[0];
  
  // Extract subject/entity (usually noun phrases after the action)
  const actionIndex = words.findIndex(word => actionVerbs.some(verb => word.toLowerCase().includes(verb)));
  const subjectWords = actionIndex >= 0 ? words.slice(actionIndex + 1, actionIndex + 4) : words.slice(1, 4);
  const subject = subjectWords.join(' ') || 'system';
  
  // Extract constraints/requirements
  const constraintKeywords = ['with', 'using', 'for', 'that', 'which', 'including', 'containing', 'having'];
  const constraints: string[] = [];
  
  // Look for constraint patterns
  constraintKeywords.forEach(keyword => {
    const keywordIndex = words.findIndex(word => word.toLowerCase() === keyword);
    if (keywordIndex >= 0 && keywordIndex < words.length - 1) {
      const constraintPhrase = words.slice(keywordIndex + 1, keywordIndex + 5).join(' ');
      if (constraintPhrase) constraints.push(constraintPhrase);
    }
  });
  
  // Extract numbers/quantities for requirements
  const numberPattern = /\d+/g;
  const numbers = prompt.match(numberPattern);
  if (numbers) {
    constraints.push(`Quantity specifications: ${numbers.join(', ')}`);
  }
  
  return {
    task: mainAction || 'process request',
    subject: subject || 'system',
    constraints: constraints.length > 0 ? constraints : ['No specific constraints identified'],
    requirements: [
      'Provide comprehensive response',
      'Include specific examples',
      'Structure output clearly',
      'Include actionable details'
    ],
    outputFormat: {
      structure: ['Overview', 'Details', 'Next Steps'],
      type: 'structured response',
      includeExamples: true,
      includeMeasurableOutcomes: true
    },
    domain: domain || 'general',
    originalPrompt: prompt
  };
}

// --- Server ---
const server = new McpServer({ name: "StructuralThinking", version: "0.2.0" });

// Tool: st_refine (Structural Thinking Analysis)
server.registerTool("st_refine", {
  title: "Prompt Refinement with Structural Analysis",
  description: "Converts free-text prompts into structured Structural Thinking JSON with comprehensive analysis including transformation, gap detection, validation, improvement suggestions, and optional JSON conversion for structured prompt engineering",
  inputSchema: {
    prompt: z.string(),
    domain: z.enum(["code","docs","data","product","research"]).optional(),
    includeValidation: z.boolean().optional().default(true),
    includeImprovements: z.boolean().optional().default(true),
    includeJsonConversion: z.boolean().optional().default(false)
  }
}, async ({ prompt, domain, includeValidation = true, includeImprovements = true, includeJsonConversion = false }) => {
  try {
    // Enhanced input validation with better error reporting
    const promptValidation = validateInputDetailed(prompt, 'string', SCORING_CONFIG.validation.minPromptLength, SCORING_CONFIG.validation.maxPromptLength);
    if (!promptValidation.valid) {
      return {
        content: [{ type: "text", text: `❌ **Input Validation Error**\n\n**Issue:** ${promptValidation.error}\n**Code:** ${promptValidation.code}\n\n**Expected:** String between ${SCORING_CONFIG.validation.minPromptLength}-${SCORING_CONFIG.validation.maxPromptLength} characters\n**Received:** ${typeof prompt} (${typeof prompt === 'string' ? prompt.length : 'N/A'} characters)\n\n**Fix:** Provide a valid prompt string within the specified length range.` }]
      };
    }

    const validDomains = ["code", "docs", "data", "product", "research"];
    if (domain && !validDomains.includes(domain)) {
      return {
        content: [{ type: "text", text: `❌ **Invalid Domain**\n\n**Issue:** Domain '${domain}' is not supported\n**Valid Options:** ${validDomains.join(', ')}\n\n**Fix:** Choose one of the supported domains above.` }]
      };
    }

    // Step 1: Transform prompt to structural thinking spec
    const spec = draftFromText(prompt, domain);
    const specValid = validateStructuralThinking(spec);
    const specErrors = specValid ? [] : (validateStructuralThinking.errors || []);

    // Step 2: Detect gaps and issues
    const gapAnalysis = detectGaps(spec);

    // Step 3: Validate (if requested)
    let validationResults = null;
    if (includeValidation) {
      const valid = validateStructuralThinking(spec);
      const errors = valid ? [] : (validateStructuralThinking.errors || []);
      const warnings: Array<{path:string; message:string}> = [];
      
      if (!spec?.constraints || spec.constraints.length === 0) {
        warnings.push({ path: "/constraints", message: "No constraints specified" });
      }
      if (!spec?.title || spec.title.length < SCORING_CONFIG.completeness.titleMinLength) {
        warnings.push({ path: "/title", message: "Title is missing or too short" });
      }
      if (!spec?.context?.domain) {
        warnings.push({ path: "/context/domain", message: "Domain not specified" });
      }
      if (spec?.instructions && getWordCount(spec.instructions.join(' ')) < SCORING_CONFIG.completeness.depthThreshold1) {
        warnings.push({ path: "/instructions", message: "Instructions may be too brief" });
      }
      
      validationResults = { valid, errors, warnings };
    }

    // Step 4: Generate improvements (if requested)
    let improvementSuggestions = null;
    if (includeImprovements) {
      const patches: Array<{op: "add"|"replace"|"remove", path: string, value?: any}> = [];
      
      // Suggest adding sections for markdown format
      if (spec?.io?.format === "markdown" && !(spec?.io?.contract?.sections?.length)) {
        patches.push({ 
          op: "add", 
          path: "/io/contract", 
          value: { sections: ["Highlights","Details","NextSteps"] } 
        });
      }
      

      
      // Suggest adding title if missing or too short
      if (!spec?.title || spec.title.length < SCORING_CONFIG.completeness.titleMinLength) {
        patches.push({ 
          op: spec?.title ? "replace" : "add", 
          path: "/title", 
          value: "Enhanced Structural Thinking Specification" 
        });
      }
      
      // Suggest adding domain if missing
      if (!spec?.context?.domain) {
        patches.push({ 
          op: "add", 
          path: "/context/domain", 
          value: domain || "general" 
        });
      }
      
      // Suggest adding more detailed instructions if too brief
      const instructionText = spec?.instructions ? spec.instructions.join(' ') : '';
      if (getWordCount(instructionText) < SCORING_CONFIG.completeness.depthThreshold1) {
        patches.push({
          op: "replace",
          path: "/instructions",
          value: spec?.instructions ? [
            ...spec.instructions,
            "Provide specific examples where applicable",
            "Include measurable criteria for success"
          ] : ["Define clear, actionable instructions", "Include specific requirements and constraints"]
        });
      }
      
      improvementSuggestions = { patches, improvementCount: patches.length };
    }

    // Generate improved prompt based on analysis
    let improvedPrompt = prompt;
    let improvementNotes: string[] = [];

    // Apply improvements to create better prompt
    if (improvementSuggestions && improvementSuggestions.patches.length > 0) {
      // Add constraints if missing
      const hasConstraints = spec?.constraints && spec.constraints.length > 0;
      if (!hasConstraints) {
        improvedPrompt = `${improvedPrompt}. Requirements: Provide a comprehensive response with specific examples and actionable details.`;
        improvementNotes.push("Added clarity requirements");
      }

      // Add output format if missing
      const hasSections = spec?.io?.contract?.sections && spec.io.contract.sections.length > 0;
      if (!hasSections) {
        improvedPrompt = `${improvedPrompt} Structure the response with clear sections: Overview, Details, and Next Steps.`;
        improvementNotes.push("Added output structure");
      }

      // Add success criteria if instructions are brief
      const instructionText = spec?.instructions ? spec.instructions.join(' ') : '';
      if (getWordCount(instructionText) < SCORING_CONFIG.completeness.depthThreshold1) {
        improvedPrompt = `${improvedPrompt} Include specific examples and measurable outcomes where applicable.`;
        improvementNotes.push("Added success criteria");
      }
    }

    // Create user-friendly response with analysis first, then improved prompt
    const qualityScore = safeRound((gapAnalysis.score.clarity + gapAnalysis.score.completeness) / 2);
    const isReady = gapAnalysis.issues.filter(issue => issue.severity === "error").length === 0 && 
                   gapAnalysis.score.clarity > 0.6 && 
                   gapAnalysis.score.completeness > 0.6;
    
    // Enhanced output formatting with better readability and icons
    const qualityLevel = qualityScore >= 0.8 ? '🟢 Excellent' : qualityScore >= 0.6 ? '🟡 Good' : '🔴 Needs Work';
    const readinessIcon = isReady ? '✅' : '⚠️';
    
    // Enhanced vague language analysis for user feedback
    const vagueAnalysis = analyzeVagueLanguage(prompt);
    const vagueSection = vagueAnalysis.hasVague ? 
      `\n\n### 🎯 **Vague Language Detected**\n${vagueAnalysis.vagueTerms.map(term => `- "${term}"`).join('\n')}\n\n**Suggestions:**\n${vagueAnalysis.suggestions.map(s => `- ${s}`).join('\n')}` : '';
    
    const userResponse = `## 📊 Analysis Summary

**Quality Score:** ${qualityLevel} (${qualityScore}/1.0)  
**Ready for Implementation:** ${readinessIcon} ${isReady ? 'Yes' : 'Needs refinement'}  
**Domain Context:** ${domain || 'General'}  
**Word Count:** ${getWordCount(prompt)} words  
**Improvements Applied:** ${improvementNotes.join(', ') || 'None needed'}

### 🔍 **Detailed Metrics**
- **Clarity Score:** ${safeRound(gapAnalysis.score.clarity)}/1.0
- **Completeness Score:** ${safeRound(gapAnalysis.score.completeness)}/1.0
- **Issues Found:** ${gapAnalysis.issues.length}
- **Suggestions Available:** ${improvementSuggestions?.improvementCount || 0}${vagueSection}

### ⚠️ **Issues Detected**
${gapAnalysis.issues.length > 0 ? gapAnalysis.issues.map(issue => {
  const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warn' ? '🟡' : '🔵';
  return `${icon} **${issue.severity.toUpperCase()}:** ${issue.message}\n   *Location:* \`${issue.path}\``;
}).join('\n\n') : '🎉 No issues found'}

### 💡 **Improvement Suggestions**
${improvementSuggestions?.patches && improvementSuggestions.patches.length > 0 ? 
  improvementSuggestions.patches.map((patch, i) => {
    const action = patch.op === 'add' ? '➕' : patch.op === 'replace' ? '🔄' : '➖';
    let valueStr;
    if (typeof patch.value === 'object') {
      // Format JSON with proper indentation and readable structure
      if (Array.isArray(patch.value)) {
        valueStr = '[\n' + patch.value.map(item => `  "${item}"`).join(',\n') + '\n]';
      } else {
        valueStr = JSON.stringify(patch.value, null, 2);
      }
    } else {
      valueStr = patch.value;
    }
    return `${action} **${patch.op.toUpperCase()}** at \`${patch.path}\`:\n\`\`\`json\n${valueStr}\n\`\`\``;
  }).join('\n\n') : '✨ No suggestions needed'}

---

## 🎯 IMPROVED PROMPT:

\`\`\`
${improvedPrompt}
\`\`\`${includeJsonConversion ? `

---

## 📋 JSON CONVERSION:

\`\`\`json
${JSON.stringify(convertPromptToJson(prompt, domain), null, 2)}
\`\`\`` : ''}`;
  
  return { 
    content: [{ 
      type: "text", 
        text: userResponse 
    }] 
  };
  } catch (error) {
    console.error('Error in st_refine:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    
    return {
      content: [{ type: "text", text: `🚨 **Internal Server Error**

**What happened:** An unexpected error occurred during structural thinking analysis

**Error Details:**
- **Message:** ${errorMessage}
- **Type:** ${error instanceof Error ? error.constructor.name : typeof error}

**Troubleshooting:**
1. Check if your prompt contains any special characters that might cause parsing issues
2. Ensure the prompt length is within acceptable limits (3-10,000 characters)
3. Try simplifying the prompt and running the analysis again
4. If the error persists, this may be a server-side issue

**For developers:**
\`\`\`
${errorStack}
\`\`\`

**Support:** Contact the system administrator if this error continues to occur.` }]
    };
  }
});



// Start server over stdio
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[StructuralThinking MCP] Server connected over stdio");

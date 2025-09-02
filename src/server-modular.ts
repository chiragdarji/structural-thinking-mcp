/**
 * Modular Structural Thinking MCP Server
 * 
 * This is the refactored main server file that uses the new modular architecture.
 * It provides a clean, maintainable structure while preserving all functionality.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Ajv from "ajv";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

// Import modular components
import { getScoringConfig, loadConfigFromEnv } from './config/scoring.config.js';
import { 
  draftFromText, 
  detectGaps, 
  analyzeVagueLanguage,
  type StructuralThinking,
  type AnalysisResult,
  type VagueLanguageAnalysis
} from './core/analyzer.js';
import { 
  validateInputDetailed, 
  validateDomain,
  type ValidationResult 
} from './utils/validation.js';
import { 
  formatQualityLevel,
  formatReadinessIcon,
  formatIssueSeverity,
  formatImprovementAction,
  formatValueForDisplay,
  getWordCount,
  safeRound
} from './utils/formatting.js';
import { 
  analysisCache, 
  generateCacheKey, 
  withCache,
  scheduleCleanup,
  type CacheStats
} from './utils/cache.js';

// --- Schema Setup ---
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema", "structural-thinking.v1.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
const ajv = new (Ajv as any)({ allErrors: true, allowUnionTypes: true, validateSchema: false });
const validateStructuralThinking = ajv.compile(schema);

// --- Server Configuration ---
const serverConfig = {
  name: "StructuralThinking",
  version: "0.2.0",
  description: "MCP server for converting free-text prompts into structured thinking frameworks with validation and gap detection."
};

// Load configuration overrides from environment
const configOverrides = loadConfigFromEnv();

// --- Server Setup ---
const server = new McpServer(serverConfig, { capabilities: { resources: {}, tools: {} } });

// --- Tool Registration ---

/**
 * Main structural thinking analysis tool with enhanced caching and error handling
 */
server.registerTool("st_refine", {
  title: "Prompt Refinement with Structural Analysis",
  description: "Convert free-text prompts into structured thinking frameworks with validation and gap detection",
  inputSchema: {
    prompt: z.string().min(3).max(10000),
    domain: z.enum(["code","docs","data","product","research"]).optional(),
    includeValidation: z.boolean().optional().default(true),
    includeImprovements: z.boolean().optional().default(true)
  }
}, async ({ prompt, domain, includeValidation = true, includeImprovements = true }) => {
  try {
    // Enhanced input validation with better error reporting
    const promptValidation = validateInputDetailed(prompt, 'string', 3, 10000);
    if (!promptValidation.valid) {
      return {
        content: [{ 
          type: "text", 
          text: `❌ **Input Validation Error**\n\n**Issue:** ${promptValidation.error}\n**Code:** ${promptValidation.code}\n\n**Expected:** String between 3-10000 characters\n**Received:** ${typeof prompt} (${typeof prompt === 'string' ? prompt.length : 'N/A'} characters)\n\n**Fix:** Provide a valid prompt string within the specified length range.` 
        }]
      };
    }

    // Validate domain if provided
    if (domain) {
      const domainValidation = validateDomain(domain);
      if (!domainValidation.valid) {
        return {
          content: [{ 
            type: "text", 
            text: `❌ **Domain Validation Error**\n\n**Issue:** ${domainValidation.error}\n**Code:** ${domainValidation.code}\n\n**Fix:** Choose a supported domain.` 
          }]
        };
      }
    }

    // Generate cache key and check cache first
    const cacheKey = generateCacheKey(prompt, domain, { includeValidation, includeImprovements });
    const cached = analysisCache.get(cacheKey);
    if (cached) {
      return { content: [{ type: "text", text: cached }] };
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
      if (!spec?.title || spec.title.length < 5) {
        warnings.push({ path: "/title", message: "Title is missing or too short" });
      }
      if (!spec?.context?.domain) {
        warnings.push({ path: "/context/domain", message: "Domain not specified" });
      }
      if (spec?.instructions && getWordCount(spec.instructions.join(' ')) < 50) {
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
      if (!spec?.title || spec.title.length < 5) {
        patches.push({ 
          op: spec?.title ? "replace" : "add", 
          path: "/title", 
          value: "Enhanced Structural Thinking Specification" 
        });
      }
      
      // Suggest enriching brief instructions
      if (spec?.instructions && getWordCount(spec.instructions.join(' ')) < 50) {
        patches.push({ 
          op: "replace", 
          path: "/instructions", 
          value: [
            ...spec.instructions,
            "Provide specific examples where applicable",
            "Include measurable criteria for success"
          ]
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
      if (getWordCount(instructionText) < 50) {
        improvedPrompt = `${improvedPrompt} Include specific examples and measurable outcomes where applicable.`;
        improvementNotes.push("Added success criteria");
      }
    }

    // Create user-friendly response with enhanced formatting
    const qualityScore = safeRound((gapAnalysis.score.clarity + gapAnalysis.score.completeness) / 2);
    const isReady = gapAnalysis.issues.filter(issue => issue.severity === "error").length === 0 && 
                   gapAnalysis.score.clarity > 0.6 && 
                   gapAnalysis.score.completeness > 0.6;
    
    // Enhanced output formatting with better readability and icons
    const qualityLevel = formatQualityLevel(qualityScore);
    const readinessIcon = formatReadinessIcon(isReady);
    
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
  const icon = formatIssueSeverity(issue.severity);
  return `${icon} **${issue.severity.toUpperCase()}:** ${issue.message}\n   *Location:* \`${issue.path}\``;
}).join('\n\n') : '🎉 No issues found'}

### 💡 **Improvement Suggestions**
${improvementSuggestions?.patches && improvementSuggestions.patches.length > 0 ? 
  improvementSuggestions.patches.map((patch, i) => {
    const action = formatImprovementAction(patch.op);
    const valueStr = formatValueForDisplay(patch.value);
    return `${action} **${patch.op.toUpperCase()}** at \`${patch.path}\`:\n   \`\`\`\n   ${valueStr}\n   \`\`\``;
  }).join('\n\n') : '✨ No suggestions needed'}

---

## 🎯 IMPROVED PROMPT:

\`\`\`
${improvedPrompt}
\`\`\``;

    // Cache the result
    analysisCache.set(cacheKey, userResponse);

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

/**
 * Cache management tool for monitoring and debugging
 */
server.registerTool("st_cache_stats", {
  title: "Cache Statistics",
  description: "Get cache performance statistics and metrics",
  inputSchema: {}
}, async () => {
  const stats = analysisCache.getStats();
  
  return {
    content: [{
      type: "text",
      text: `## 🗂️ Cache Statistics

**Performance:**
- **Hit Rate:** ${(stats.hitRate * 100).toFixed(1)}%
- **Total Hits:** ${stats.hits}
- **Total Misses:** ${stats.misses}

**Storage:**
- **Current Size:** ${stats.size} / ${stats.maxSize} entries
- **Memory Usage:** ${(stats.memoryUsage / 1024).toFixed(1)} KB

**Status:** ${stats.hitRate > 0.5 ? '✅ Healthy' : '⚠️ Low hit rate'}`
    }]
  };
});

/**
 * Cache cleanup tool
 */
server.registerTool("st_cache_cleanup", {
  title: "Cache Cleanup",
  description: "Clean up expired cache entries manually",
  inputSchema: {}
}, async () => {
  const cleaned = analysisCache.cleanup();
  
  return {
    content: [{
      type: "text", 
      text: `## 🧹 Cache Cleanup Complete

**Removed:** ${cleaned} expired entries
**Status:** ${cleaned > 0 ? '✅ Cleanup successful' : 'ℹ️ No expired entries found'}`
    }]
  };
});

// --- Startup ---

// Schedule periodic cache cleanup
const cleanupInterval = scheduleCleanup();

// Start server over stdio
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[${serverConfig.name} MCP] Server connected over stdio`);

// Graceful shutdown
process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  console.error(`[${serverConfig.name} MCP] Server shutting down gracefully`);
  process.exit(0);
});

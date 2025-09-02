/**
 * Formatting and Text Processing Utilities
 * 
 * This module provides utility functions for text processing,
 * number formatting, and output formatting.
 */

import { DEFAULT_SCORING_CONFIG } from '../config/scoring.config.js';

/**
 * Safely rounds a number to specified precision
 */
export function safeRound(value: number, precision: number = DEFAULT_SCORING_CONFIG.validation.roundingPrecision): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Counts words in a text string
 */
export function getWordCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if text contains vague language (legacy function for backward compatibility)
 */
export function hasVagueLanguage(text: string, vagueWords: RegExp[]): boolean {
  if (!text || typeof text !== 'string') return false;
  return vagueWords.some(rx => rx.test(text));
}

/**
 * Format quality score with appropriate level indicator
 */
export function formatQualityLevel(score: number): string {
  if (score >= 0.8) return '🟢 Excellent';
  if (score >= 0.6) return '🟡 Good';
  return '🔴 Needs Work';
}

/**
 * Format readiness indicator with appropriate icon
 */
export function formatReadinessIcon(isReady: boolean): string {
  return isReady ? '✅' : '⚠️';
}

/**
 * Format issue severity with appropriate icon
 */
export function formatIssueSeverity(severity: 'error' | 'warn' | 'info'): string {
  switch (severity) {
    case 'error': return '🔴';
    case 'warn': return '🟡';
    case 'info': return '🔵';
    default: return '⚪';
  }
}

/**
 * Format improvement operation with appropriate icon
 */
export function formatImprovementAction(action: 'add' | 'replace' | 'remove'): string {
  switch (action) {
    case 'add': return '➕';
    case 'replace': return '🔄';
    case 'remove': return '➖';
    default: return '🔄';
  }
}

/**
 * Format JSON value for display with proper indentation
 */
export function formatValueForDisplay(value: any): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

/**
 * Create a progress bar string
 */
export function createProgressBar(progress: number, width: number = 20): string {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format array of strings as a bulleted list
 */
export function formatBulletList(items: string[], bullet: string = '-'): string {
  if (!items || items.length === 0) return '';
  return items.map(item => `${bullet} ${item}`).join('\n');
}

/**
 * Format array of strings as a numbered list
 */
export function formatNumberedList(items: string[]): string {
  if (!items || items.length === 0) return '';
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/**
 * Escape special characters for markdown
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[*_`~\[\]()]/g, '\\$&');
}

/**
 * Clean and normalize whitespace in text
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();                   // Remove leading/trailing whitespace
}

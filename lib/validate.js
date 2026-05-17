'use strict';

const qs = require('qs');

/**
 * Validates a query string.
 * Returns { valid: true } or { valid: false, error: string }
 *
 * @param {string} input
 * @param {object} qsOptions
 */
function validateQueryString(input, qsOptions = {}) {
  try {
    // Detect obviously malformed patterns
    const decoded = decodeURIComponent(input.replace(/\+/g, ' '));

    // Check for unclosed brackets
    const opens = (decoded.match(/\[/g) || []).length;
    const closes = (decoded.match(/\]/g) || []).length;
    if (opens !== closes) {
      return {
        valid: false,
        error: `Mismatched brackets: ${opens} opening '[' vs ${closes} closing ']'`,
      };
    }

    // Attempt parse — qs is lenient but will throw on truly bad input
    qs.parse(input, {
      ...qsOptions,
      allowPrototypes: false,
      depth: qsOptions.depth ?? 10,
    });

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Validates a JSON string.
 * Returns { valid: true, parsed: object } or { valid: false, error: string }
 *
 * @param {string} input
 */
function validateJSON(input) {
  try {
    const parsed = JSON.parse(input);
    return { valid: true, parsed };
  } catch (err) {
    // Provide friendlier error messages
    const msg = err.message
      .replace('JSON.parse: ', '')
      .replace('SyntaxError: ', '');
    return { valid: false, error: `Invalid JSON — ${msg}` };
  }
}

module.exports = { validateQueryString, validateJSON };

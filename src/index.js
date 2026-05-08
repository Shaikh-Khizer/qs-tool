'use strict';

const qs = require('qs');

/**
 * Default qs parse options — permissive and handles all the edge cases.
 */
const DEFAULT_PARSE_OPTIONS = {
  depth: 20,
  allowDots: true,
  allowPrototypes: false,
  parseArrays: true,
  decoder(str, defaultDecoder, charset, type) {
    // Auto-coerce types: booleans, nulls, numbers
    if (type === 'value') {
      if (str === 'true')  return true;
      if (str === 'false') return false;
      if (str === 'null')  return null;
      if (str === 'undefined') return undefined;
      // Numbers: integer or float, no leading zeros (except "0" itself)
      if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(str)) {
        const n = Number(str);
        if (!Number.isNaN(n)) return n;
      }
    }
    return defaultDecoder(str, defaultDecoder, charset);
  },
};

/**
 * Default qs stringify options.
 */
const DEFAULT_STRINGIFY_OPTIONS = {
  encode: true,
  encodeValuesOnly: true,   // keeps keys readable; encodes values
  allowDots: false,
  arrayFormat: 'brackets',  // a[]=1&a[]=2
  encoder(str, defaultEncoder, charset, type) {
    // Pass booleans / numbers through as their string representations
    if (typeof str === 'boolean' || typeof str === 'number') return String(str);
    if (str === null) return 'null';
    return typeof defaultEncoder === "function" ? defaultEncoder(str, defaultEncoder, charset) : encodeURIComponent(String(str));
  },
};

/**
 * Parse a query string (or form-encoded body) into a plain JS object.
 *
 * @param {string} input  Raw query string (leading "?" stripped automatically)
 * @param {object} [opts] Override  options
 * @returns {object}
 */
function parseQueryString(input, opts = {}) {
  if (typeof input !== 'string') {
    throw new TypeError(`Expected a string, got ${typeof input}`);
  }

  // Strip a leading "?" if present
  const clean = input.trim().replace(/^\?/, '');

  try {
    return qs.parse(clean, { ...DEFAULT_PARSE_OPTIONS, ...opts });
  } catch (err) {
    throw new Error(`Failed to parse query string: ${err.message}`);
  }
}

/**
 * Serialize a plain JS object into a query string.
 *
 * @param {object|string} input  Object, or a JSON string that will be parsed first
 * @param {object} [opts]        Override qs options
 * @returns {string}
 */
function stringifyToQuery(input, opts = {}) {
  let obj = input;

  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      throw new SyntaxError('Input is not valid JSON. Provide an object or a valid JSON string.');
    }
  }

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new TypeError('Top-level value must be a JSON object (not an array or primitive).');
  }

  try {
    return qs.stringify(obj, { ...DEFAULT_STRINGIFY_OPTIONS, ...opts });
  } catch (err) {
    throw new Error(`Failed to stringify object: ${err.message}`);
  }
}

/**
 * Pretty-print a value as JSON.
 */
function prettyJSON(value, indent = 2) {
  return JSON.stringify(value, null, indent);
}

/**
 * Detect whether a string looks like a query string or JSON.
 */
function detectFormat(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'querystring';
}

module.exports = {
  parseQueryString,
  stringifyToQuery,
  prettyJSON,
  detectFormat,
  DEFAULT_PARSE_OPTIONS,
  DEFAULT_STRINGIFY_OPTIONS,
};

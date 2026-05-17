'use strict';

const qs = require('qs');

/**
 * Coerce leaf string values to their natural JS types:
 * numbers, booleans, null, undefined stay as-is.
 *
 * @param {*} value
 * @returns {*}
 */
function coerce(value) {
  if (Array.isArray(value)) return value.map(coerce);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = coerce(v);
    return out;
  }
  if (typeof value !== 'string') return value;

  // Booleans
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Null / undefined
  if (value === 'null') return null;
  if (value === '') return '';

  // Numbers (integer or float, no leading zeros except "0" itself)
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }

  return value;
}

/**
 * Parses a query string into a plain object.
 *
 * @param {string} input - Raw query string (may include leading `?`)
 * @param {object} opts
 * @param {boolean} opts.allowDots
 * @param {number}  opts.depth
 * @param {boolean} opts.raw          - If true, skip type coercion
 * @param {boolean} opts.decode       - URL-decode values
 * @returns {object}
 */
function parseQueryString(input, opts = {}) {
  const { allowDots = false, depth = 10, raw = false, decode = true } = opts;

  // Strip optional leading `?`
  const src = input.startsWith('?') ? input.slice(1) : input;

  const parsed = qs.parse(src, {
    allowDots,
    depth,
    allowPrototypes: false,
    decoder: decode
      ? undefined // use qs default (decodes %xx and +)
      : (str) => str, // identity — keep encoded
    parseArrays: true,
  });

  return raw ? parsed : coerce(parsed);
}

module.exports = { parseQueryString, coerce };

'use strict';

const qs = require('qs');

const VALID_ARRAY_FORMATS = ['brackets', 'indices', 'repeat', 'comma', 'none'];

/**
 * Serializes a plain object to a query string.
 *
 * @param {object} obj
 * @param {object} opts
 * @param {string}  opts.arrayFormat  - 'brackets' | 'indices' | 'repeat' | 'comma' | 'none'
 * @param {boolean} opts.allowDots    - Use dot notation
 * @param {boolean} opts.encode       - URL-encode the output
 * @param {boolean} opts.sort         - Sort keys
 * @returns {string}
 */
function stringifyToQuery(obj, opts = {}) {
  const {
    arrayFormat = 'brackets',
    allowDots = false,
    encode = true,
    sort = false,
  } = opts;

  if (!VALID_ARRAY_FORMATS.includes(arrayFormat)) {
    throw new Error(
      `Invalid array format "${arrayFormat}". Must be one of: ${VALID_ARRAY_FORMATS.join(', ')}`
    );
  }

  return qs.stringify(obj, {
    arrayFormat,
    allowDots,
    encode,
    encodeValuesOnly: true, // keep brackets readable by default
    sort: sort ? (a, b) => a.localeCompare(b) : undefined,
    allowPrototypes: false,
  });
}

module.exports = { stringifyToQuery, VALID_ARRAY_FORMATS };

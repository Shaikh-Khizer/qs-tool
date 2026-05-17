'use strict';

/**
 * Detects the format of the input string.
 * Returns 'json' if the input looks like JSON, 'querystring' otherwise.
 *
 * @param {string} input - Raw input string
 * @returns {'json' | 'querystring'}
 */
function detectFormat(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json';
  }
  return 'querystring';
}

module.exports = { detectFormat };

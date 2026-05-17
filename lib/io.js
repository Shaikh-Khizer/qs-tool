'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Reads all of stdin as a string.
 * Resolves with the collected text (trimmed).
 *
 * @returns {Promise<string>}
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      // Nothing piped in and user didn't ask for stdin
      resolve('');
      return;
    }

    const chunks = [];
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('').trim()));
    process.stdin.on('error', reject);
  });
}

/**
 * Reads a file and returns its contents as a trimmed string.
 *
 * @param {string} filePath
 * @returns {string}
 */
function readFile(filePath) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  // Guard against absurdly large files (>10 MB)
  const MAX_BYTES = 10 * 1024 * 1024;
  if (stat.size > MAX_BYTES) {
    throw new Error(`File is too large (>${MAX_BYTES / 1024 / 1024} MB): ${filePath}`);
  }

  return fs.readFileSync(resolved, 'utf8').trim();
}

module.exports = { readStdin, readFile };

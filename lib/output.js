'use strict';

const chalk = require('chalk');

/** Whether colors should be used (disabled when piping) */
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const c = {
  success: (s) => (useColor ? chalk.green(s) : s),
  error: (s) => (useColor ? chalk.red(s) : s),
  warn: (s) => (useColor ? chalk.yellow(s) : s),
  dim: (s) => (useColor ? chalk.dim(s) : s),
  bold: (s) => (useColor ? chalk.bold(s) : s),
  cyan: (s) => (useColor ? chalk.cyan(s) : s),
  key: (s) => (useColor ? chalk.cyan(s) : s),
  string: (s) => (useColor ? chalk.green(s) : s),
  number: (s) => (useColor ? chalk.yellow(s) : s),
  bool: (s) => (useColor ? chalk.magenta(s) : s),
  nil: (s) => (useColor ? chalk.dim(s) : s),
};

/**
 * Colorize a pretty-printed JSON string token by token.
 *
 * @param {string} jsonStr - Already-formatted JSON
 * @returns {string}
 */
function colorizeJSON(jsonStr) {
  if (!useColor) return jsonStr;

  return jsonStr.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // JSON key
          return c.key(match);
        }
        // JSON string value
        return c.string(match);
      }
      if (/true|false/.test(match)) return c.bool(match);
      if (/null/.test(match)) return c.nil(match);
      return c.number(match);
    }
  );
}

/**
 * Format an object as JSON, optionally pretty or minified and colorized.
 *
 * @param {object} obj
 * @param {object} opts
 * @param {boolean} opts.pretty   - Pretty print (default: true when TTY)
 * @param {boolean} opts.minify   - Force minified
 * @param {boolean} opts.color    - Colorize output
 * @returns {string}
 */
function formatJSON(obj, opts = {}) {
  const pretty = opts.minify ? false : (opts.pretty ?? process.stdout.isTTY);
  const raw = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  return opts.color !== false && pretty ? colorizeJSON(raw) : raw;
}

/**
 * Print an error and (optionally) exit.
 */
function printError(msg, { exit = true, code = 1 } = {}) {
  process.stderr.write(c.error('✖ Error: ') + msg + '\n');
  if (exit) process.exit(code);
}

/**
 * Print a validation success message.
 */
function printValid(format) {
  process.stdout.write(c.success('✔ Valid ') + c.bold(format) + '\n');
}

/**
 * Print a validation failure message.
 */
function printInvalid(format, reason) {
  process.stderr.write(
    c.error('✖ Invalid ') + c.bold(format) + ': ' + reason + '\n'
  );
}

module.exports = {
  formatJSON,
  printError,
  printValid,
  printInvalid,
  colorizeJSON,
  c,
  useColor,
};

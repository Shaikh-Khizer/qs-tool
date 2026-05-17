#!/usr/bin/env node
'use strict';

const { Command, Option } = require('commander');
const { detectFormat } = require('../lib/detect');
const { parseQueryString } = require('../lib/parse');
const { stringifyToQuery, VALID_ARRAY_FORMATS } = require('../lib/stringify');
const { validateQueryString, validateJSON } = require('../lib/validate');
const { readStdin, readFile } = require('../lib/io');
const { formatJSON, printError, printValid, printInvalid, c } = require('../lib/output');

const pkg = require('../package.json');

// ─── Program definition ──────────────────────────────────────────────────────

const program = new Command();

program
  .name('qsj')
  .version(pkg.version, '-V, --version', 'Output the current version')
  .argument('[input]', 'Input string (alternative to -c/--content)')
  .description(
    `${c.bold('qsj')} — Convert between query strings and JSON\n\n` +
    `  ${c.dim('Query string → JSON')}\n` +
    `    ${c.cyan('qsj -c \'a[b][c]=1&a[b][d][]=2\'')}\n\n` +
    `  ${c.dim('JSON → Query string')}\n` +
    `    ${c.cyan('qsj -c \'{"a":{"b":{"c":1}}}\'')}\n\n` +
    `  ${c.dim('Pipe support')}\n` +
    `    ${c.cyan('echo \'a[b]=1\' | qsj')}\n` +
    `    ${c.cyan('cat data.json | qsj --to-query')}\n\n` +
    `  ${c.dim('File input')}\n` +
    `    ${c.cyan('qsj -f payload.txt')}\n` +
    `    ${c.cyan('qsj -f body.json --to-query')}`
  )
  // ── Input sources ──
  .addOption(
    new Option('-c, --content <string>', 'Inline input string')
  )
  .addOption(
    new Option('-f, --file <path>', 'Read input from a file')
  )
  .addOption(
    new Option('--stdin', 'Force reading from stdin')
  )
  // ── Direction overrides ──
  .addOption(
    new Option('--to-json', 'Force parse as query string → JSON')
  )
  .addOption(
    new Option('--to-query', 'Force parse as JSON → query string')
  )
  // ── Modes ──
  .addOption(
    new Option('-v, --validate', 'Validate input only; no output')
  )
  // ── Output formatting ──
  .addOption(
    new Option('-p, --pretty', 'Pretty-print JSON output (default when TTY)')
  )
  .addOption(
    new Option('-m, --minify', 'Output minified / compact JSON')
  )
  // ── Encoding ──
  .addOption(
    new Option('-d, --decode', 'URL-decode values before parsing')
  )
  .addOption(
    new Option('-e, --encode', 'URL-encode query string output')
  )
  // ── Parser options ──
  .addOption(
    new Option('--allow-dots', 'Enable dot notation parsing (e.g. a.b.c=1)')
  )
  .addOption(
    new Option('--depth <n>', 'Maximum nested object depth (default: 10)')
      .argParser((v) => {
        const n = parseInt(v, 10);
        if (Number.isNaN(n) || n < 0) throw new Error('--depth must be a non-negative integer');
        return n;
      })
      .default(10)
  )
  .addOption(
    new Option('--raw', 'Disable type coercion (keep all values as strings)')
  )
  // ── Array format ──
  .addOption(
    new Option('-a, --array-format <type>', 'Array serialization format')
      .choices(VALID_ARRAY_FORMATS)
      .default('brackets')
  )
  .helpOption('-h, --help', 'Display help for command')
  .addHelpText('after', `
${c.bold('Array formats:')}
  brackets   ${c.dim('(default)')}  tags[]=a&tags[]=b
  indices               tags[0]=a&tags[1]=b
  repeat                tags=a&tags=b
  comma                 tags=a,b
  none                  tags=a&tags=b (no suffix)

${c.bold('Exit codes:')}
  0  Success
  1  General error
  2  Validation failure
  3  Input/parse error

${c.bold('Security:')}
  • Prototype pollution protection is always enabled
  • Parser depth is capped at --depth (default 10)
  • File size is limited to 10 MB
`);

// ─── Main logic ───────────────────────────────────────────────────────────────

async function main() {
  program.parse(process.argv);
  const opts = program.opts();
  const [positionalInput] = program.args;

  // ── 1. Read input ──────────────────────────────────────────────────────────
  let input = '';

  if (positionalInput) {
    input = positionalInput.trim();
  } else if (opts.content) {
    input = opts.content.trim();
  } else if (opts.file) {
    try {
      input = readFile(opts.file);
    } catch (err) {
      printError(err.message);
    }
  } else if (opts.stdin || !process.stdin.isTTY) {
    try {
      input = await readStdin();
    } catch (err) {
      printError(`Failed to read stdin: ${err.message}`);
    }
  } else {
    // No input provided — print help
    program.help();
  }

  if (!input) {
    printError('No input provided. Use -c, -f, --stdin, or pipe data in.');
  }

  // ── 2. Detect format ───────────────────────────────────────────────────────
  let format; // 'json' | 'querystring'

  if (opts.toJson) {
    format = 'querystring'; // --to-json means "input is qs, output is json"
  } else if (opts.toQuery) {
    format = 'json'; // --to-query means "input is json, output is qs"
  } else {
    format = detectFormat(input);
  }

  // ── 3. Validate mode ───────────────────────────────────────────────────────
  if (opts.validate) {
    if (format === 'json') {
      const result = validateJSON(input);
      if (result.valid) {
        printValid('JSON');
        process.exit(0);
      } else {
        printInvalid('JSON', result.error);
        process.exit(2);
      }
    } else {
      const qsOpts = { allowDots: opts.allowDots, depth: opts.depth };
      const result = validateQueryString(input, qsOpts);
      if (result.valid) {
        printValid('query string');
        process.exit(0);
      } else {
        printInvalid('query string', result.error);
        process.exit(2);
      }
    }
  }

  // ── 4. Convert ─────────────────────────────────────────────────────────────
  try {
    if (format === 'querystring') {
      // Query string → JSON
      const parsed = parseQueryString(input, {
        allowDots: opts.allowDots,
        depth: opts.depth,
        raw: opts.raw,
        decode: opts.decode !== false,
      });

      const output = formatJSON(parsed, {
        pretty: opts.pretty,
        minify: opts.minify,
        color: true,
      });

      process.stdout.write(output + '\n');
    } else {
      // JSON → Query string
      let obj;
      try {
        obj = JSON.parse(input);
      } catch (err) {
        printError(`Invalid JSON input — ${err.message}`, { exit: false });
        process.exit(3);
      }

      if (obj === null || typeof obj !== 'object') {
        printError('JSON input must be an object or array to convert to a query string.', { exit: false });
        process.exit(3);
      }

      const output = stringifyToQuery(obj, {
        arrayFormat: opts.arrayFormat,
        allowDots: opts.allowDots,
        encode: opts.encode ?? false,
      });

      process.stdout.write(output + '\n');
    }
  } catch (err) {
    printError(err.message, { exit: false });
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Unexpected error: ${err.message}\n`);
  process.exit(1);
});

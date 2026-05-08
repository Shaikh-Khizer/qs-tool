#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { Command } = require('commander');
const { parseQueryString, stringifyToQuery, detectFormat } = require('./index');

// ─── helpers ─────────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data',  chunk => chunks.push(chunk));
    process.stdin.on('end',   ()    => resolve(chunks.join('')));
    process.stdin.on('error', err   => reject(err));
  });
}

function readFile(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) die(`File not found: ${filePath}`);
  return fs.readFileSync(abs, 'utf8');
}

function die(message, code = 1) {
  process.stderr.write(`\x1b[31merror\x1b[0m  ${message}\n`);
  process.exit(code);
}

function success(output) {
  process.stdout.write(output + '\n');
}

function hasStdinData() {
  return !process.stdin.isTTY;
}

// ─── shared input resolver ────────────────────────────────────────────────────

async function resolveInput(input, opts) {
  if (opts.file)       return readFile(opts.file);
  if (input)           return input;
  if (hasStdinData())  return readStdin();
  die('No input provided. Pass a value directly, use -f <file>, or pipe via stdin.');
}

// ─── shared parse action ──────────────────────────────────────────────────────

async function runParse(input, opts) {
  try {
    let raw = (await resolveInput(input, opts)).trim();

    if (opts.decode) raw = decodeURIComponent(raw.replace(/\+/g, ' '));

    const parseOpts = {
      depth:     parseInt(opts.depth, 10) || 20,
      allowDots: opts.allowDots || false,
    };
    if (opts.noCoerce) parseOpts.decoder = undefined;

    const obj = parseQueryString(raw, parseOpts);

    // -c / --compact  =>  no indent; otherwise pretty (default)
    const indent = (opts.compact || opts.raw) ? undefined : 2;
    success(JSON.stringify(obj, null, indent));
  } catch (err) {
    die(err.message);
  }
}

// ─── shared stringify action ──────────────────────────────────────────────────

async function runStringify(input, opts) {
  try {
    const raw = (await resolveInput(input, opts)).trim();

    const stringifyOpts = {
      arrayFormat:      opts.arrayFormat || 'brackets',
      allowDots:        opts.allowDots   || false,
      encode:           opts.noEncodeValues ? false : true,
      encodeValuesOnly: opts.encode ? false : true,
    };

    const result = stringifyToQuery(raw, stringifyOpts);
    success(result);
  } catch (err) {
    die(err.message);
  }
}

// ─── program ─────────────────────────────────────────────────────────────────

const pkg     = require('../package.json');
const program = new Command();

program
  .name('qst')
  .description('Convert between query strings and JSON.\nShorthands: -p parse  -s stringify  -c compact output  -a array-format')
  .version(pkg.version, '-v, --version');

// ─── top-level shorthand flags (-p / -s / -c / -a) ───────────────────────────
// These let you skip the sub-command entirely:
//   qst -p 'foo=bar'
//   qst -s '{"x":1}'
//   qst -p -c 'foo=bar'
//   qst -s -a repeat '{"t":["a","b"]}'

program
  .option('-p, --parse-flag',              'Shorthand: parse (query string → JSON)')
  .option('-s, --stringify-flag',          'Shorthand: stringify (JSON → query string)')
  .option('-c, --compact',                 'Compact / minified JSON output (no pretty-print)')
  .option('-a, --array-format <fmt>',      'Array format: brackets (default), indices, repeat, comma', 'brackets')
  .option('-f, --file <path>',             'Read input from a file')
  .option('-d, --decode',                  'URL-decode input before parsing')
  .option('--no-coerce',                   'Keep all values as strings (no type coercion)')
  .option('--depth <n>',                   'Max nesting depth (default: 20)', '20')
  .option('--allow-dots',                  'Parse/stringify dot-notation keys')
  .option('-e, --encode',                  'Encode ALL characters including keys (stringify)')
  .option('--no-encode-values',            'Disable URL-encoding of values (stringify)')
  .argument('[input]',                     'Input string (query string or JSON)')
  .action(async (input, opts) => {
    if (opts.parseFlag) {
      await runParse(input, opts);
    } else if (opts.stringifyFlag) {
      await runStringify(input, opts);
    } else if (input || hasStdinData() || opts.file) {
      // No flag and no sub-command: auto-detect direction
      try {
        const raw = (await resolveInput(input, opts)).trim();
        const fmt = detectFormat(raw);
        if (fmt === 'json') {
          await runStringify(raw, opts);
        } else {
          await runParse(raw, opts);
        }
      } catch (err) {
        die(err.message);
      }
    } else {
      program.help();
    }
  });

// ─── parse sub-command ────────────────────────────────────────────────────────

program
  .command('parse [input]')
  .description('Convert a query string → JSON')
  .option('-f, --file <path>',    'Read query string from a file')
  .option('-c, --compact',        'Compact output (no pretty-print)')
  .option('-r, --raw',            'Alias for --compact')
  .option('-d, --decode',         'URL-decode input before parsing')
  .option('--no-coerce',          'Keep all values as strings')
  .option('--depth <n>',          'Max nesting depth', '20')
  .option('--allow-dots',         'Parse dot-notation keys')
  .action(runParse);

// ─── stringify sub-command ───────────────────────────────────────────────────

program
  .command('stringify [input]')
  .description('Convert JSON → query string')
  .option('-f, --file <path>',        'Read JSON from a file')
  .option('-a, --array-format <fmt>', 'Array format: brackets, indices, repeat, comma', 'brackets')
  .option('-e, --encode',             'Encode ALL characters including keys')
  .option('--allow-dots',             'Use dot-notation for nested keys')
  .option('--no-encode-values',       'Disable value URL-encoding')
  .action(runStringify);

// ─── convert sub-command (explicit auto-detect) ───────────────────────────────

program
  .command('convert [input]')
  .description('Auto-detect format and convert in the right direction')
  .option('-f, --file <path>', 'Read from a file')
  .option('-c, --compact',     'Compact JSON output')
  .option('-r, --raw',         'Alias for --compact')
  .action(async (input, opts) => {
    try {
      const raw = (await resolveInput(input, opts)).trim();
      const fmt = detectFormat(raw);
      if (fmt === 'json') {
        await runStringify(raw, opts);
      } else {
        await runParse(raw, opts);
      }
    } catch (err) {
      die(err.message);
    }
  });

// ─── encode / decode helpers ─────────────────────────────────────────────────

program
  .command('encode [input]')
  .description('URL-encode a string')
  .option('-f, --file <path>', 'Read from a file')
  .action(async (input, opts) => {
    try {
      const raw = await resolveInput(input, opts);
      success(encodeURIComponent(raw.trim()));
    } catch (err) { die(err.message); }
  });

program
  .command('decode [input]')
  .description('URL-decode a string')
  .option('-f, --file <path>', 'Read from a file')
  .action(async (input, opts) => {
    try {
      const raw = await resolveInput(input, opts);
      success(decodeURIComponent(raw.trim().replace(/\+/g, ' ')));
    } catch (err) { die(`Failed to decode: ${err.message}`); }
  });

// ─── extended help ────────────────────────────────────────────────────────────

program.addHelpText('after', `
Shorthand flags (no sub-command needed):
  qst -p 'a[b]=1'                       parse  (query string → JSON)
  qst -s '{"a":{"b":1}}'                stringify (JSON → query string)
  qst -p -c 'a=1&b=2'                   compact JSON output
  qst -s -a repeat '{"t":["x","y"]}'    array as repeated keys (t=x&t=y)
  qst -p -f req.txt                     parse from file
  cat data.txt  | qst -p                parse from stdin
  cat body.json | qst -s                stringify from stdin
  cat body.json | qst -s -a indices     stringify with indexed arrays

Sub-commands (explicit):
  qst parse 'a[b][c]=1&a[b][d][]=2'
  qst stringify '{"email":{"user":"khizer@gmail.com"}}'
  qst convert 'foo=bar'                 auto-detect direction
  qst encode 'hello world'
  qst decode 'hello%20world'

Array format options (-a / --array-format):
  brackets  →  tags[]=a&tags[]=b            (default)
  indices   →  tags[0]=a&tags[1]=b
  repeat    →  tags=a&tags=b
  comma     →  tags=a,b

`);

program.parse(process.argv);

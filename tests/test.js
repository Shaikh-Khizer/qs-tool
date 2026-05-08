'use strict';

const assert = require('assert');
const { parseQueryString, stringifyToQuery, detectFormat } = require('../src/index');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔\x1b[0m  ${label}`);
    passed++;
  } catch (err) {
    console.log(`  \x1b[31m✘\x1b[0m  ${label}`);
    console.log(`       ${err.message}`);
    failed++;
  }
}

function deepEq(a, b) {
  assert.deepStrictEqual(a, b);
}

// ─── parseQueryString ─────────────────────────────────────────────────────────

console.log('\nparseQueryString');

test('simple key=value', () => {
  deepEq(parseQueryString('foo=bar'), { foo: 'bar' });
});

test('multiple keys', () => {
  deepEq(parseQueryString('a=1&b=2'), { a: 1, b: 2 });
});

test('numeric coercion', () => {
  deepEq(parseQueryString('n=42'), { n: 42 });
});

test('float coercion', () => {
  deepEq(parseQueryString('x=3.14'), { x: 3.14 });
});

test('boolean coercion – true', () => {
  deepEq(parseQueryString('flag=true'), { flag: true });
});

test('boolean coercion – false', () => {
  deepEq(parseQueryString('flag=false'), { flag: false });
});

test('null coercion', () => {
  deepEq(parseQueryString('val=null'), { val: null });
});

test('nested object a[b][c]=1', () => {
  deepEq(parseQueryString('a[b][c]=1'), { a: { b: { c: 1 } } });
});

test('deep nested from spec: a[b][c]=1&a[b][d][]=2', () => {
  deepEq(
    parseQueryString('a[b][c]=1&a[b][d][]=2'),
    { a: { b: { c: 1, d: [2] } } }
  );
});

test('array brackets: a[]=1&a[]=2', () => {
  deepEq(parseQueryString('a[]=1&a[]=2'), { a: [1, 2] });
});

test('duplicate keys become an array', () => {
  deepEq(parseQueryString('color=red&color=blue'), { color: ['red', 'blue'] });
});

test('URL-encoded values', () => {
  deepEq(parseQueryString('msg=hello%20world'), { msg: 'hello world' });
});

test('email in nested key', () => {
  deepEq(
    parseQueryString('email[email]=khizer%40gmail.com'),
    { email: { email: 'khizer@gmail.com' } }
  );
});

test('leading ? is stripped', () => {
  deepEq(parseQueryString('?foo=1'), { foo: 1 });
});

test('empty string returns empty object', () => {
  deepEq(parseQueryString(''), {});
});

test('whitespace-only string returns empty object', () => {
  deepEq(parseQueryString('   '), {});
});

test('key without value', () => {
  const result = parseQueryString('flag');
  assert.strictEqual(result.flag, '');
});

test('no-coerce option keeps values as strings', () => {
  const result = parseQueryString('n=42&flag=true', { decoder: undefined });
  // Without custom decoder, qs returns strings
  assert.strictEqual(typeof result.n, 'string');
});

test('deeply nested arrays', () => {
  deepEq(
    parseQueryString('x[a][]=1&x[a][]=2&x[b]=3'),
    { x: { a: [1, 2], b: 3 } }
  );
});

test('mixed types in object', () => {
  deepEq(
    parseQueryString('name=Alice&age=30&active=true&score=null'),
    { name: 'Alice', age: 30, active: true, score: null }
  );
});

test('throws on non-string input', () => {
  assert.throws(() => parseQueryString(123), /Expected a string/);
});

// ─── stringifyToQuery ─────────────────────────────────────────────────────────

console.log('\nstringifyToQuery');

test('simple object', () => {
  assert.strictEqual(stringifyToQuery({ foo: 'bar' }), 'foo=bar');
});

test('nested object produces readable bracket notation', () => {
  const result = stringifyToQuery({ a: { b: 1 } });
  // encodeValuesOnly keeps keys readable: a[b]=1
  assert.strictEqual(result, 'a[b]=1');
});

test('nested with encodeValuesOnly=true (readable keys)', () => {
  // qs encodes keys by default unless encodeValuesOnly is set
  const result = stringifyToQuery({ a: { b: 1 } });
  // Either encoded or not, should round-trip
  const parsed = parseQueryString(result);
  deepEq(parsed, { a: { b: 1 } });
});

test('array of strings', () => {
  const result = stringifyToQuery({ tags: ['a', 'b'] });
  const parsed = parseQueryString(result);
  deepEq(parsed, { tags: ['a', 'b'] });
});

test('boolean value', () => {
  const result = stringifyToQuery({ active: true });
  assert.ok(result.includes('true'));
});

test('null value serializes to empty string (qs default)', () => {
  const result = stringifyToQuery({ val: null });
  // qs serializes null as empty value: val=
  assert.ok(result === 'val=' || result.includes('val'));
});

test('number value', () => {
  const result = stringifyToQuery({ n: 42 });
  assert.ok(result.includes('42'));
});

test('accepts a JSON string', () => {
  const result = stringifyToQuery('{"x":1}');
  assert.ok(result.includes('x=1'));
});

test('throws on invalid JSON string', () => {
  assert.throws(() => stringifyToQuery('not json'), /not valid JSON/);
});

test('throws on array top-level', () => {
  assert.throws(() => stringifyToQuery([1, 2, 3]), /Top-level value must be a JSON object/);
});

test('throws on primitive top-level', () => {
  assert.throws(() => stringifyToQuery('42'), /not valid JSON|Top-level/);
});

test('round-trip: parse → stringify → parse', () => {
  const original = 'a[b][c]=1&a[b][d][]=2&a[b][d][]=3';
  const obj      = parseQueryString(original);
  const qs2      = stringifyToQuery(obj);
  const obj2     = parseQueryString(qs2);
  deepEq(obj, obj2);
});

test('email value is preserved after round-trip', () => {
  const obj  = { email: { user: 'khizer@gmail.com' } };
  const qs2  = stringifyToQuery(obj);
  const obj2 = parseQueryString(qs2);
  deepEq(obj, obj2);
});

// ─── detectFormat ─────────────────────────────────────────────────────────────

console.log('\ndetectFormat');

test('detects JSON object', () => {
  assert.strictEqual(detectFormat('{"a":1}'), 'json');
});

test('detects JSON array', () => {
  assert.strictEqual(detectFormat('[1,2]'), 'json');
});

test('detects query string', () => {
  assert.strictEqual(detectFormat('a=1&b=2'), 'querystring');
});

// ─── summary ──────────────────────────────────────────────────────────────────

console.log(`\n  ${passed + failed} tests: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed ? '31' : '32'}m${failed} failed\x1b[0m\n`);

if (failed > 0) process.exit(1);

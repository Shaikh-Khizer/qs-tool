# qsj

> Convert between query strings and JSON with automatic format detection.

`qsj` is a fast, secure CLI tool for developers and security engineers that converts between URL query strings and JSON — with automatic format detection, type coercion, and rich output options. Think of it as `jq` for query strings.

---

## Installation

```bash
# Global install (recommended)
npm install -g .

# Or run directly
node bin/qsj.js
```

---

## Quick Start

### Query string → JSON (auto-detected)

```bash
qsj -c 'a[b][c]=1&a[b][d][]=2'
```
```json
{
  "a": {
    "b": {
      "c": 1,
      "d": [
        2
      ]
    }
  }
}
```

### JSON → Query string (auto-detected)

```bash
qsj -c '{"a":{"b":{"c":1,"d":[2]}}}'
```
```
a[b][c]=1&a[b][d][]=2
```

---

## Usage

```
qsj [options]
```

### Input Options

| Flag | Description |
|------|-------------|
| `-c, --content <string>` | Inline input string |
| `-f, --file <path>` | Read input from a file |
| `--stdin` | Force reading from stdin |

### Direction Overrides

| Flag | Description |
|------|-------------|
| `--to-json` | Force parse as query string → JSON |
| `--to-query` | Force parse as JSON → query string |

### Output Formatting

| Flag | Description |
|------|-------------|
| `-p, --pretty` | Pretty-print JSON output |
| `-m, --minify` | Minified/compact JSON output |
| `-d, --decode` | URL-decode values before parsing |
| `-e, --encode` | URL-encode query string output |

### Parser Options

| Flag | Description |
|------|-------------|
| `--allow-dots` | Enable dot notation parsing (`a.b.c=1`) |
| `--depth <n>` | Maximum nested object depth (default: 10) |
| `--raw` | Disable type coercion (all values stay as strings) |

### Validation

| Flag | Description |
|------|-------------|
| `-v, --validate` | Validate input only (no output) |

### Array Formats (`-a, --array-format`)

| Format | Example |
|--------|---------|
| `brackets` *(default)* | `tags[]=a&tags[]=b` |
| `indices` | `tags[0]=a&tags[1]=b` |
| `repeat` | `tags=a&tags=b` |
| `comma` | `tags=a,b` |
| `none` | `tags=a&tags=b` |

---

## Examples

### Pipe from echo or cat

```bash
echo 'a[b]=1&a[c]=2' | qsj

cat data.json | qsj --to-query

cat payload.txt | qsj --to-json
```

### File input

```bash
qsj -f payload.txt
qsj -f body.json --to-query
qsj -f form.txt --allow-dots
```

### Array format control

```bash
qsj -c '{"tags":["a","b"]}' -a indices
# tags[0]=a&tags[1]=b

qsj -c '{"tags":["a","b"]}' -a repeat
# tags=a&tags=b

qsj -c '{"tags":["a","b"]}' -a comma
# tags=a,b
```

### Dot notation

```bash
qsj -c 'a.b.c=1&a.b.d=2' --allow-dots --to-json
# {"a":{"b":{"c":1,"d":2}}}

qsj -c '{"a":{"b":1}}' --allow-dots
# a.b=1
```

### Validation

```bash
qsj -v 'a[b][c]=1'
# ✔ Valid query string

qsj -v '{"a":}'
# ✖ Invalid JSON: Unexpected token } in JSON at position 5

qsj -v 'a[b[=1'
# ✖ Invalid query string: Mismatched brackets: 2 opening '[' vs 1 closing ']'
```

### Raw mode (no type coercion)

```bash
qsj -c 'active=true&count=42' --raw
# {"active":"true","count":"42"}

qsj -c 'active=true&count=42'
# {"active":true,"count":42}
```

### Minified output

```bash
qsj -c 'a[b]=1' -m
# {"a":{"b":1}}
```

---

## Auto-Detection Rules

| Input starts with | Detected format |
|-------------------|----------------|
| `{` or `[` | JSON → converted to query string |
| Anything else | Query string → converted to JSON |

Override with `--to-json` or `--to-query`.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Validation failure |
| `3` | Input/parse error |

---

## Security

- **Prototype pollution protection** is always enabled (`allowPrototypes: false`)
- **Parser depth** is capped (default: 10, configurable with `--depth`)
- **File size** is limited to 10 MB
- Type coercion is opt-out (`--raw` to disable)

---

## License

MIT

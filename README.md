# qs-tool

CLI tool to convert between **query strings** and **JSON**. Supports nesting, arrays, type coercion, and UNIX pipes.

## Install

```bash
npm install && npm link
```

Requires Node.js >= 16.

## Usage

```bash
# Shorthands
qs-tool -p 'a[b]=1&c=true'           # parse  (query string → JSON)
qs-tool -s '{"a":{"b":1}}'           # stringify (JSON → query string)
qs-tool -p -c 'a=1&b=2'             # -c = compact output
qs-tool -s -a repeat '{"t":["x","y"]}'  # -a = array format

# Sub-commands
qs-tool parse 'a[b][c]=1&a[b][d][]=2'
qs-tool stringify '{"email":"k@gmail.com"}'
qs-tool convert 'foo=bar'            # auto-detect direction
qs-tool encode 'hello world'
qs-tool decode 'hello%20world'

# File & stdin
qs-tool -p -f req.txt
cat data.txt  | qs-tool -p
cat body.json | qs-tool -s
```

## Flags

| Flag | Description |
|------|-------------|
| `-p` | Parse shorthand (query string → JSON) |
| `-s` | Stringify shorthand (JSON → query string) |
| `-c, --compact` | Compact JSON output |
| `-a, --array-format` | `brackets` (default) · `indices` · `repeat` · `comma` |
| `-f, --file` | Read input from file |
| `-d, --decode` | URL-decode input before parsing |
| `-e, --encode` | Encode all characters including keys |
| `--no-coerce` | Keep all values as strings |
| `--allow-dots` | Parse/stringify dot-notation keys |
| `--depth <n>` | Max nesting depth (default: 20) |

## Examples

```bash
qs-tool -p 'a[b][c]=1&a[b][d][]=2'
# { "a": { "b": { "c": 1, "d": [2] } } }

qs-tool -s -a repeat '{"tags":["x","y"]}'
# tags=x&tags=y

qs-tool -p 'color=red&color=blue'
# { "color": ["red", "blue"] }

# Pipe with curl + jq
curl -s 'https://httpbin.org/get?a=1&b=2' \
  | jq -r '.args | to_entries | map("\(.key)=\(.value)") | join("&")' \
  | qs-tool -p
```

## Test

```bash
npm test   # 37 tests
```

## License

MIT
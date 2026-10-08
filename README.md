# dotenv-key-set

Set, update, or add a single key in a `.env` (dotenv) file — from the command line or from Node.js.
If the key exists, only its value is replaced in place; if not, the key is appended to the end of the file.
Comments, line order, and every other key are left untouched, and values are quoted safely so dotenv
parsers read them back exactly. Zero runtime dependencies.

A safer alternative to `sed -i 's/^KEY=.*/KEY=value/' .env` for CI pipelines, setup scripts,
and version bumps.

```sh
npx --package dotenv-key-set set-env APP_URL http://localhost:3000
```

> **The package name (`dotenv-key-set`) and the command name (`set-env`) differ.**
> `npx dotenv-key-set …` does not work — name the command explicitly as shown above.

## Install

```sh
npm install --save-dev dotenv-key-set
# or
pnpm add -D dotenv-key-set
```

## Usage

```
set-env <KEY> <value>
set-env <KEY>=<value>

  -f, --file <path>  target file (default: .env in the current directory)
  -h, --help         show help
```

`KEY=value` is split on the first `=` only, so values may contain `=`.
Keys must be valid shell variable names (`[A-Za-z_][A-Za-z0-9_]*`).

### Examples

```sh
# Update (or add) a key in ./.env
set-env APP_URL http://localhost:3000

# Target another file
set-env -f .env.production API_URL https://api.example.com

# Keep VERSION in .env in sync with package.json (npm script)
#   "version": "set-env VERSION $npm_package_version"

# Values with spaces or special characters are quoted for you
set-env GREETING "hello world"   # → GREETING='hello world'
```

Only exact `KEY=` lines are matched — commented-out lines (`#KEY=`) and keys that share a prefix
(`KEY_SUFFIX=`) are never changed.

## API

```ts
import { setEnv } from "dotenv-key-set";

const { action } = setEnv(".env", { key: "APP_URL", value: "http://localhost:3000" });
// action: "updated" | "added"
```

The file is created if it does not exist.

## Value quoting

Dotenv parsers (including Node's `util.parseEnv`) do not honor `\"` escapes inside quotes — they cut
the value at the first matching quote. So instead of escaping, dotenv-key-set wraps the value in a quote
character that does not appear in it, trying `'` → `` ` `` → `"` in that order. Double quotes come
last because they expand `\n` into a newline, which would corrupt values like `C:\new`.

Values that need no quoting (letters, digits, and `_ . - / : @ , + =`) are written as-is.
If a value contains all three quote characters, it cannot be represented in a `.env` file and
dotenv-key-set exits with an error.

## Development

```sh
pnpm install
pnpm test
pnpm build:dist
```

`prepare` runs `obuild --stub`, so `dist` only re-exports `src/*.mts` and the sources run directly
via Node's type stripping. Because `pnpm publish` runs `prepare` after packing scripts, the stub would
overwrite a real build — publish with `pnpm release` (builds, then publishes with `--ignore-scripts`).

## License

MIT

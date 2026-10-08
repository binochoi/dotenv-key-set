#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { setEnv } from "./index.mts";

const USAGE = `사용법: set-env <KEY> <value>
       set-env <KEY>=<value>

옵션:
  -f, --file <path>  대상 파일 (기본: 현재 디렉터리의 .env)
  -h, --help         이 도움말`;

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  options: {
    file: { type: "string", short: "f", default: ".env" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}

const [rawKey, rawValue] = positionals;
// KEY=value 한 덩어리로 넘어온 경우 첫 `=` 에서만 쪼갠다 — 값에 `=` 가 들어갈 수 있다.
const [key, value] = rawValue === undefined ? (rawKey ?? "").split(/=(.*)/s) : [rawKey, rawValue];

const isUsageInvalid = !key || value === undefined;
if (isUsageInvalid) {
  fail(USAGE);
}

const isKeyInvalid = !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
if (isKeyInvalid) {
  fail(`셸 환경변수로 쓸 수 없는 키입니다: "${key}"`);
}

const envPath = resolve(values.file);

try {
  const { action } = setEnv(envPath, { key, value });
  process.stdout.write(`[set-env] ${key} ${action === "updated" ? "갱신" : "추가"} (${envPath})\n`);
} catch (error) {
  fail(`[set-env] ${error instanceof Error ? error.message : String(error)}`);
}

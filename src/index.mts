// dotenv 파일의 키 하나를 갱신한다. 있으면 값만 바꾸고, 없으면 파일 끝에 추가한다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface SetEnvResult {
  /** 기존 줄을 바꿨으면 "updated", 새로 붙였으면 "added". */
  action: "updated" | "added";
}

export function setEnv(envPath: string, entry: { key: string; value: string }): SetEnvResult {
  const { key, value } = entry;
  const original = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const line = `${key}=${formatValue(value)}`;
  // 주석(#KEY=) 이나 KEY_SUFFIX= 를 건드리지 않도록 줄 시작 + 정확한 키만 매칭한다.
  const keyPattern = new RegExp(`^${escapeRegExp(key)}=.*$`, "m");

  const hasKey = keyPattern.test(original);
  if (hasKey) {
    // replace 콜백을 쓰는 이유: 값 안의 `$&`·`$1` 이 치환 패턴으로 해석되는 걸 막는다.
    writeFileSync(envPath, original.replace(keyPattern, () => line));
    return { action: "updated" };
  }

  const needsNewline = original.length > 0 && !original.endsWith("\n");
  writeFileSync(envPath, `${original}${needsNewline ? "\n" : ""}${line}\n`);
  return { action: "added" };
}

// 따옴표를 쓰지 않아도 파서가 원문 그대로 읽는 문자들.
const SAFE_UNQUOTED_PATTERN = /^[\w.\-/:@,+=]*$/;

// dotenv 파서(node:util parseEnv 포함)는 따옴표 안의 `\"` 이스케이프를 인정하지 않고
// 첫 동일 따옴표에서 값을 끊는다. 그래서 이스케이프 대신 값에 없는 따옴표를 골라 감싼다.
// 큰따옴표는 `\n` 을 개행으로 확장해 백슬래시를 망가뜨리므로 마지막 후보다.
const QUOTE_CANDIDATES = ["'", "`", '"'] as const;

function formatValue(value: string): string {
  const isSafeUnquoted = SAFE_UNQUOTED_PATTERN.test(value);
  if (isSafeUnquoted) {
    return value;
  }

  const quote = QUOTE_CANDIDATES.find((candidate) => !value.includes(candidate));

  const hasEveryQuote = quote === undefined;
  if (hasEveryQuote) {
    throw new Error("값에 ' ` \" 가 모두 들어 있어 .env 로 표현할 수 없습니다");
  }

  const isBackslashMangled = quote === '"' && value.includes("\\");
  if (isBackslashMangled) {
    throw new Error('값에 백슬래시와 \' ` 가 함께 들어 있어 .env 로 표현할 수 없습니다');
  }

  return `${quote}${value}${quote}`;
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

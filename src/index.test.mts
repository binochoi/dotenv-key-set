import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setEnv } from "./index.mts";

let dir: string;

beforeEach(() => {
  dir = join(tmpdir(), `env-set-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
});

afterEach(() => {
  // 임시 디렉터리는 OS가 정리하도록 둔다
});

function envPath(name = ".env"): string {
  return join(dir, name);
}

function write(content: string): string {
  const path = envPath();
  writeFileSync(path, content);
  return path;
}

function read(): string {
  return readFileSync(envPath(), "utf8");
}

describe("없는 키 추가", () => {
  it("빈 파일에 추가한다", () => {
    const path = write("");
    const result = setEnv(path, { key: "FOO", value: "bar" });
    expect(result.action).toBe("added");
    expect(read()).toBe("FOO=bar\n");
  });

  it("파일이 없으면 새로 만든다", () => {
    const path = envPath("new.env");
    const result = setEnv(path, { key: "FOO", value: "bar" });
    expect(result.action).toBe("added");
    expect(readFileSync(path, "utf8")).toBe("FOO=bar\n");
  });

  it("줄 끝 개행이 있는 파일에는 개행 하나만 더 붙인다", () => {
    const path = write("EXISTING=1\n");
    setEnv(path, { key: "FOO", value: "bar" });
    expect(read()).toBe("EXISTING=1\nFOO=bar\n");
  });

  it("줄 끝 개행이 없는 파일에는 개행을 붙이고 추가한다", () => {
    const path = write("EXISTING=1");
    setEnv(path, { key: "FOO", value: "bar" });
    expect(read()).toBe("EXISTING=1\nFOO=bar\n");
  });
});

describe("있는 키 갱신", () => {
  it("해당 줄의 값만 바꾼다", () => {
    const path = write("FOO=old\nBAR=keep\n");
    const result = setEnv(path, { key: "FOO", value: "new" });
    expect(result.action).toBe("updated");
    expect(read()).toBe("FOO=new\nBAR=keep\n");
  });

  it("값에 $& 같은 replace 패턴 문자가 있어도 그대로 쓴다", () => {
    const path = write("SECRET=old\n");
    setEnv(path, { key: "SECRET", value: "a$&b$1c" });
    expect(read()).toBe("SECRET='a$&b$1c'\n");
  });
});

describe("주석·빈 줄 보존", () => {
  it("주석 줄을 건드리지 않는다", () => {
    const path = write("# 설명\nFOO=bar\n# 또 다른 설명\n");
    setEnv(path, { key: "FOO", value: "baz" });
    expect(read()).toBe("# 설명\nFOO=baz\n# 또 다른 설명\n");
  });

  it("주석처럼 생긴 #FOO= 줄을 키로 인식하지 않는다", () => {
    const path = write("#FOO=commented\nFOO=real\n");
    setEnv(path, { key: "FOO", value: "new" });
    expect(read()).toBe("#FOO=commented\nFOO=new\n");
  });

  it("FOO_SUFFIX= 같은 다른 키를 건드리지 않는다", () => {
    const path = write("FOO=1\nFOO_SUFFIX=2\n");
    setEnv(path, { key: "FOO", value: "updated" });
    expect(read()).toBe("FOO=updated\nFOO_SUFFIX=2\n");
  });

  it("빈 줄을 그대로 둔다", () => {
    const path = write("A=1\n\nB=2\n\n");
    setEnv(path, { key: "A", value: "x" });
    expect(read()).toBe("A=x\n\nB=2\n\n");
  });
});

describe("값 인용 처리", () => {
  it("안전한 문자는 따옴표 없이 쓴다", () => {
    const path = write("");
    setEnv(path, { key: "URL", value: "http://example.com:8080/path" });
    expect(read()).toBe("URL=http://example.com:8080/path\n");
  });

  it("공백이 있으면 단따옴표로 감싼다", () => {
    const path = write("");
    setEnv(path, { key: "MSG", value: "hello world" });
    expect(read()).toBe("MSG='hello world'\n");
  });

  it("단따옴표가 있으면 백틱으로 감싼다", () => {
    const path = write("");
    setEnv(path, { key: "VAL", value: "it's" });
    expect(read()).toBe("VAL=`it's`\n");
  });

  it("단따옴표·백틱이 있으면 큰따옴표로 감싼다", () => {
    const path = write("");
    setEnv(path, { key: "VAL", value: "it's a `test`" });
    expect(read()).toBe('VAL="it\'s a `test`"\n');
  });

  it("백슬래시와 단따옴표+백틱이 함께 있으면 에러를 던진다", () => {
    const path = write("");
    expect(() => setEnv(path, { key: "VAL", value: "it's a `test` with \\" })).toThrow();
  });

  it("세 따옴표가 모두 있으면 에러를 던진다", () => {
    const path = write("");
    expect(() => setEnv(path, { key: "VAL", value: `it's a \`test\` and "quoted"` })).toThrow();
  });
});

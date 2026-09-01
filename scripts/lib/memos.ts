// 원천 메모의 창구. 메모 집사가 ~/Relay/memo 아래 쌓아 둔 마크다운 파일을 읽어
// 구조화된 메모로 돌려준다. 파일 형식은 메모 집사와 같다: 맨 위 프론트매터
// (title·tags·created·updated) + 그 아래 본문. 프론트매터가 없는 파일(사용자가
// 맨손으로 넣은 것)은 전체를 본문으로 본다. 여기서는 읽기만 한다 — 원천은 건드리지 않는다.
import fs from "node:fs";
import path from "node:path";

export interface Ctx {
  dir(name: string): string;
}

export interface Memo {
  id: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  text: string;
}

const SOURCE = "memos"; // dir 서비스 이름 = ~/Relay/memo

function root(ctx: Ctx): string {
  return ctx.dir(SOURCE);
}

export function normalizeTags(input: unknown): string[] {
  let arr: string[] = [];
  if (Array.isArray(input)) arr = input.map((x) => String(x));
  else if (typeof input === "string") arr = input.split(",");
  return [...new Set(arr.map((t) => t.trim()).filter(Boolean))];
}

export function firstLineTitle(text: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.replace(/^#+\s*/, "").slice(0, 60);
}

// 파일 하나를 메모로 파싱. 프론트매터가 없으면 전체를 본문으로 본다.
export function parse(id: string, content: string): Memo {
  let title = "";
  let tags: string[] = [];
  let created = "";
  let updated = "";
  let text = content;

  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  if (fm) {
    text = content.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const at = line.indexOf(":");
      if (at < 0) continue;
      const key = line.slice(0, at).trim();
      const val = line.slice(at + 1).trim();
      if (key === "title") title = val;
      else if (key === "tags") tags = normalizeTags(val);
      else if (key === "created") created = val;
      else if (key === "updated") updated = val;
    }
  }
  text = text.replace(/^\n+/, "");
  if (!title) title = firstLineTitle(text) || id;
  // created 가 비어 있으면 파일 이름 앞의 날짜(YYYY-MM-DD)로 보완한다.
  if (!created) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(id);
    if (m) created = m[1];
  }
  return { id, title, tags, created, updated, text };
}

// 날짜 문자열(ISO 또는 YYYY-MM-DD…)에서 앞 10자(YYYY-MM-DD)만 취해 날짜 키로 쓴다.
export function dayKey(s: string): string {
  return (s || "").slice(0, 10);
}

export function readAll(ctx: Ctx): Memo[] {
  const dirPath = root(ctx);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dirPath);
  } catch {
    return []; // 폴더가 아직 없다 — 메모가 하나도 없는 상태
  }
  const out: Memo[] = [];
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    try {
      out.push(parse(f.slice(0, -3), fs.readFileSync(path.join(dirPath, f), "utf8")));
    } catch {
      // 못 읽는 파일은 건너뛴다 — 원천은 지우지 않는다
    }
  }
  // 오래된 것부터 — 정리 담당이 시간 순으로 읽기 좋게
  out.sort((a, b) => (a.created || a.id).localeCompare(b.created || b.id));
  return out;
}

// since·until 은 YYYY-MM-DD(포함). 메모의 작성 날짜 키로 거른다.
export function readRange(ctx: Ctx, since: string, until: string): Memo[] {
  return readAll(ctx).filter((m) => {
    const k = dayKey(m.created) || dayKey(m.id);
    if (!k) return false;
    if (since && k < since) return false;
    if (until && k > until) return false;
    return true;
  });
}

// 입력이 JSON 문자열로 넘어오는 경로(일부 도구 경계)를 대비해 객체로 되살린다.
export function asObject<T extends object>(input: unknown): T {
  if (typeof input === "string") {
    try {
      const v = JSON.parse(input);
      return (v && typeof v === "object" ? v : {}) as T;
    } catch {
      return {} as T;
    }
  }
  return (input && typeof input === "object" ? input : {}) as T;
}

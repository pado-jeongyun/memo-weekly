// 주간 정리의 거처. digests 폴더(~/Relay/memo-weekly) 아래 사람이 읽을 수 있는
// 마크다운 파일로 한 편씩. 파일 하나 = 정리 하나. 파일 이름이 곧 id 다(기간으로 지어
// 폴더에서 알아보게). 맨 위 프론트매터에 제목·기간·메모 수·시각을 담고 그 아래가 정리 본문이다.
import fs from "node:fs";
import path from "node:path";

export interface Ctx {
  dir(name: string): string;
}

export interface Digest {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  memo_count: number;
  created: string;
  body: string;
}

const STORE = "digests"; // dir 서비스 이름 = ~/Relay/memo-weekly

function root(ctx: Ctx): string {
  const d = ctx.dir(STORE);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// id 는 파일 이름이다 — 경로가 섞이면 폴더 밖으로 샐 수 있으므로 파일명 한 조각만 허용한다.
function resolveFile(ctx: Ctx, id: string): string | null {
  if (!id || id.includes("..") || path.basename(id) !== id) return null;
  return path.join(root(ctx), id + ".md");
}

export function serialize(d: Digest): string {
  const head = [
    "---",
    `title: ${d.title.replace(/\r?\n/g, " ").trim()}`,
    `period_start: ${d.period_start}`,
    `period_end: ${d.period_end}`,
    `memo_count: ${d.memo_count}`,
    `created: ${d.created}`,
    "---",
  ].join("\n");
  const body = d.body.endsWith("\n") ? d.body : d.body + "\n";
  return head + "\n\n" + body;
}

export function parse(id: string, content: string): Digest {
  let title = "";
  let period_start = "";
  let period_end = "";
  let created = "";
  let memo_count = 0;
  let body = content;

  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  if (fm) {
    body = content.slice(fm[0].length);
    for (const line of fm[1].split("\n")) {
      const at = line.indexOf(":");
      if (at < 0) continue;
      const key = line.slice(0, at).trim();
      const val = line.slice(at + 1).trim();
      if (key === "title") title = val;
      else if (key === "period_start") period_start = val;
      else if (key === "period_end") period_end = val;
      else if (key === "memo_count") memo_count = Number(val) || 0;
      else if (key === "created") created = val;
    }
  }
  body = body.replace(/^\n+/, "");
  if (!title) title = id;
  return { id, title, period_start, period_end, memo_count, created, body };
}

// 새 정리 id = 시작일_끝일. 같은 기간이 이미 있으면 -2, -3 … 을 붙여 겹치지 않게.
export function newId(ctx: Ctx, start: string, end: string): string {
  const base = `${start}_${end}`;
  const dirPath = root(ctx);
  let id = base;
  let n = 2;
  while (fs.existsSync(path.join(dirPath, id + ".md"))) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export function readAll(ctx: Ctx): Digest[] {
  const dirPath = root(ctx);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dirPath);
  } catch {
    return [];
  }
  const out: Digest[] = [];
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    try {
      out.push(parse(f.slice(0, -3), fs.readFileSync(path.join(dirPath, f), "utf8")));
    } catch {
      // 못 읽는 파일은 건너뛴다
    }
  }
  // 최신 정리부터
  out.sort((a, b) => (b.period_end || b.id).localeCompare(a.period_end || a.id));
  return out;
}

export function readOne(ctx: Ctx, id: string): Digest | null {
  const f = resolveFile(ctx, id);
  if (!f || !fs.existsSync(f)) return null;
  return parse(id, fs.readFileSync(f, "utf8"));
}

export function writeDigest(ctx: Ctx, d: Digest): void {
  const f = resolveFile(ctx, d.id);
  if (!f) throw new Error(`잘못된 정리 id: ${d.id}`);
  fs.writeFileSync(f, serialize(d));
}

export function removeDigest(ctx: Ctx, id: string): boolean {
  const f = resolveFile(ctx, id);
  if (!f || !fs.existsSync(f)) return false;
  fs.rmSync(f);
  return true;
}

export function preview(text: string, len = 200): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > len ? flat.slice(0, len) + "…" : flat;
}

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

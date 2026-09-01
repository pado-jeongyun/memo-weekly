import { asObject, newId, readOne, writeDigest } from "./lib/digest.ts";

interface Ctx {
  dir(name: string): string;
}

function nowIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const th = pad(Math.floor(Math.abs(tz) / 60));
  const tm = pad(Math.abs(tz) % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${th}:${tm}`
  );
}

export const meta = {
  description:
    "이번 주 메모 정리를 저장한다. period_start·period_end(YYYY-MM-DD)로 어느 기간인지, body 에 주제별로 묶은 정리 본문(마크다운)을 담는다. title 은 생략하면 기간으로 자동 생성한다. memo_count 로 몇 개를 정리했는지 남긴다. 같은 기간을 다시 저장하면 id 에 꼬리 번호가 붙어 겹치지 않는다. id 를 직접 주면 그 정리를 덮어쓴다.",
  input: {
    type: "object",
    required: ["period_start", "period_end", "body"],
    properties: {
      period_start: { type: "string", description: "정리 기간 시작 YYYY-MM-DD" },
      period_end: { type: "string", description: "정리 기간 끝 YYYY-MM-DD" },
      body: { type: "string", description: "주제별로 묶은 정리 본문(마크다운)" },
      title: { type: "string", description: "제목 — 생략하면 기간으로 자동" },
      memo_count: { type: "number", description: "정리한 메모 수" },
      id: { type: "string", description: "덮어쓸 정리 id — 생략하면 새로 만든다" },
    },
  },
};

export default async function (raw: unknown, ctx: Ctx) {
  const input = asObject<{
    period_start?: string;
    period_end?: string;
    body?: string;
    title?: string;
    memo_count?: number;
    id?: string;
  }>(raw);

  const start = (input.period_start || "").trim();
  const end = (input.period_end || "").trim();
  const body = (input.body || "").trim();
  if (!start || !end) return { ok: false, error: "정리 기간(period_start·period_end)이 필요하다." };
  if (!body) return { ok: false, error: "정리 본문(body)이 비어 있다." };

  const id = (input.id || "").trim() || newId(ctx, start, end);
  const existing = readOne(ctx, id);
  const title = (input.title || "").trim() || `${start} ~ ${end} 주간 메모 정리`;
  const memo_count = Number.isFinite(input.memo_count)
    ? Math.max(0, Math.floor(input.memo_count as number))
    : existing?.memo_count ?? 0;

  writeDigest(ctx, {
    id,
    title,
    period_start: start,
    period_end: end,
    memo_count,
    created: existing?.created || nowIso(),
    body,
  });

  return { ok: true, id, title, period_start: start, period_end: end, memo_count, updated: !!existing };
}

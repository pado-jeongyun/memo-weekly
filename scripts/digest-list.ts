import { asObject, preview, readAll } from "./lib/digest.ts";

interface Ctx {
  dir(name: string): string;
}

export const meta = {
  description:
    "저장된 주간 메모 정리 목록을 최신순으로 준다. 각 항목에 id·제목·기간·메모 수·미리보기가 실린다. limit 로 개수를 제한한다(기본 20).",
  input: {
    type: "object",
    properties: {
      limit: { type: "number", description: "최대 개수 — 생략하면 20" },
    },
  },
};

export default async function (raw: unknown, ctx: Ctx) {
  const input = asObject<{ limit?: number }>(raw);
  const all = readAll(ctx);
  const limit = Number.isFinite(input.limit) && (input.limit as number) > 0 ? Math.floor(input.limit as number) : 20;
  const rows = all.slice(0, limit);

  return {
    count: rows.length,
    total: all.length,
    digests: rows.map((d) => ({
      id: d.id,
      title: d.title,
      period_start: d.period_start,
      period_end: d.period_end,
      memo_count: d.memo_count,
      created: d.created || null,
      preview: preview(d.body),
    })),
    ...(all.length ? {} : { 안내: "아직 저장된 주간 정리가 없다." }),
  };
}

import { asObject, readRange } from "./lib/memos.ts";

interface Ctx {
  dir(name: string): string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM-DD 에 하루 단위로 delta 를 더한다(현지 날짜 기준, 시간대 안전).
function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + delta);
  return fmt(dt);
}

export const meta = {
  description:
    "메모 집사에 쌓인 메모 중 한 기간에 적은 것을 모아 준다. 아무 값도 주지 않으면 오늘까지 최근 7일이 기본이다. since·until(YYYY-MM-DD, 포함)로 기간을 직접 잡거나, days 로 '오늘까지 최근 며칠'을 정한다. 각 메모에 제목·태그·작성일·본문이 실린다 — 이걸 재료로 비슷한 것끼리 주제로 묶으면 된다.",
  input: {
    type: "object",
    properties: {
      since: { type: "string", description: "시작일 YYYY-MM-DD(포함)" },
      until: { type: "string", description: "끝일 YYYY-MM-DD(포함) — 생략하면 오늘" },
      days: { type: "number", description: "오늘까지 최근 며칠 — since 가 없을 때만, 기본 7" },
    },
  },
};

export default async function (raw: unknown, ctx: Ctx) {
  const input = asObject<{ since?: string; until?: string; days?: number }>(raw);
  const until = (input.until || "").trim() || fmt(new Date());
  let since = (input.since || "").trim();
  if (!since) {
    const days = Number.isFinite(input.days) && (input.days as number) > 0 ? Math.floor(input.days as number) : 7;
    since = addDays(until, -(days - 1));
  }

  const memos = readRange(ctx, since, until);
  return {
    since,
    until,
    count: memos.length,
    memos: memos.map((m) => ({
      id: m.id,
      title: m.title,
      tags: m.tags,
      created: m.created || null,
      text: m.text,
    })),
    ...(memos.length ? {} : { 안내: `${since} ~ ${until} 사이에 적어 둔 메모가 없다.` }),
  };
}

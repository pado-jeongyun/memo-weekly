import { asObject, readOne } from "./lib/digest.ts";

interface Ctx {
  dir(name: string): string;
}

export const meta = {
  description:
    "정리 id 하나의 전문을 준다. 제목·기간·메모 수와 주제별 정리 본문(마크다운)이 실린다.",
  input: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", description: "정리 id (digest-list 의 id)" },
    },
  },
};

export default async function (raw: unknown, ctx: Ctx) {
  const input = asObject<{ id?: string }>(raw);
  const id = (input.id || "").trim();
  if (!id) return { ok: false, error: "정리 id 가 필요하다." };
  const d = readOne(ctx, id);
  if (!d) return { ok: false, error: `그런 정리가 없다: ${id}` };
  return { ok: true, ...d };
}

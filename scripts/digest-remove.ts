import { asObject, readOne, removeDigest } from "./lib/digest.ts";

interface Ctx {
  dir(name: string): string;
}

export const meta = {
  description:
    "정리 id 하나를 지운다. 되돌릴 수 없으니 지우기 전에 무엇을 지우는지 확인하라.",
  input: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", description: "지울 정리 id" },
    },
  },
};

export default async function (raw: unknown, ctx: Ctx) {
  const input = asObject<{ id?: string }>(raw);
  const id = (input.id || "").trim();
  if (!id) return { ok: false, error: "정리 id 가 필요하다." };
  const before = readOne(ctx, id);
  if (!before) return { ok: false, error: `그런 정리가 없다: ${id}` };
  removeDigest(ctx, id);
  return { ok: true, id, title: before.title };
}

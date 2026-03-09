import { HttpError } from "wasp/server";
import type { GetLibraryItems } from "wasp/server/operations";

export const getLibraryItems: GetLibraryItems<void, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  const items = await context.entities.LibraryItem.findMany({
    include: { addedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return items.map((item: any) => ({
    ...item,
    tags: safeParseJson(item.tags, []),
  }));
};

function safeParseJson(raw: string, fallback: unknown) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

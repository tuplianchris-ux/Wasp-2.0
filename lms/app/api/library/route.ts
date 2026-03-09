import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, mockStore, isMockMode } from "@/lib/mockData";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockMode()) {
    return NextResponse.json(mockData.libraryWithAddedBy);
  }

  const items = await prisma.libraryItem.findMany({
    include: { addedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    items.map((item) => ({
      ...item,
      tags: JSON.parse(item.tags as string),
    }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, type, url, tags } = await req.json();

  if (isMockMode()) {
    const item = {
      id: `mock-lib-${Date.now()}`,
      title: title ?? "New Item",
      type: type ?? "link",
      url: url ?? "",
      tags: JSON.stringify(tags ?? []),
      userId: session.user.id,
      createdAt: new Date(),
    };
    mockStore.library.push(item);
    return NextResponse.json({ ...item, tags: tags ?? [] });
  }

  const item = await prisma.libraryItem.create({
    data: {
      title,
      type,
      url,
      tags: JSON.stringify(tags ?? []),
      userId: session.user.id,
    },
  });

  return NextResponse.json({ ...item, tags: tags ?? [] });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  if (isMockMode()) {
    const idx = mockStore.library.findIndex((i) => i.id === id);
    if (idx !== -1) mockStore.library.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }

  await prisma.libraryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

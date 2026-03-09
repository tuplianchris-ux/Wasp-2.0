import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, mockStore, isMockMode } from "@/lib/mockData";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockMode()) {
    const test = mockData.testById(params.id);
    if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(test);
  }

  const test = await prisma.test.findUnique({
    where: { id: params.id },
    include: {
      attempts: {
        include: { student: { select: { name: true, email: true } } },
      },
    },
  });

  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(test);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMockMode()) {
    const data = await req.json();
    const idx = mockStore.tests.findIndex((t) => t.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const t = mockStore.tests[idx];
    if (data.title != null) t.title = data.title;
    if (data.published != null) t.published = data.published;
    if (data.questions != null) t.questions = JSON.stringify(data.questions);
    if (data.timeLimit != null) t.timeLimit = data.timeLimit;
    return NextResponse.json(mockData.testById(params.id)!);
  }

  const data = await req.json();
  const test = await prisma.test.update({
    where: { id: params.id },
    data: {
      title: data.title,
      published: data.published,
      questions: data.questions ? JSON.stringify(data.questions) : undefined,
      timeLimit: data.timeLimit,
    },
  });
  return NextResponse.json(test);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isMockMode()) {
    const idx = mockStore.tests.findIndex((t) => t.id === params.id);
    if (idx !== -1) mockStore.tests.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }
  await prisma.test.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, mockStore, isMockMode } from "@/lib/mockData";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockMode()) {
    const assignment = mockData.assignmentById(params.id);
    if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(assignment);
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { name: true } },
      submissions: {
        include: { student: { select: { name: true, email: true } } },
      },
    },
  });

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMockMode()) {
    const data = await req.json();
    const idx = mockStore.assignments.findIndex((a) => a.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const a = mockStore.assignments[idx];
    if (data.title != null) a.title = data.title;
    if (data.description != null) a.description = data.description;
    if (data.dueDate != null) a.dueDate = new Date(data.dueDate);
    return NextResponse.json(mockData.assignmentById(params.id)!);
  }

  const data = await req.json();
  const assignment = await prisma.assignment.update({
    where: { id: params.id },
    data: {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  return NextResponse.json(assignment);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMockMode()) {
    const idx = mockStore.assignments.findIndex((a) => a.id === params.id);
    if (idx !== -1) mockStore.assignments.splice(idx, 1);
    return NextResponse.json({ ok: true });
  }

  await prisma.assignment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

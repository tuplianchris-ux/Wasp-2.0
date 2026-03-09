import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, mockStore, isMockMode } from "@/lib/mockData";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockMode()) {
    return NextResponse.json(mockData.assignmentsWithCount);
  }

  const assignments = await prisma.assignment.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMockMode()) {
    try {
      const { title, description, dueDate, fileUrl } = await req.json();
      const id = `mock-assign-${Date.now()}`;
      const created = {
        id,
        title: title ?? "New Assignment",
        description: description ?? "",
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        fileUrl: fileUrl ?? null,
        userId: session.user.id,
        createdAt: new Date(),
      };
      mockStore.assignments.push(created);
      return NextResponse.json(created);
    } catch (err) {
      return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
    }
  }

  try {
    const { title, description, dueDate, fileUrl } = await req.json();
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        fileUrl: fileUrl ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json(assignment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockStore, isMockMode } from "@/lib/mockData";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { textContent, fileUrl } = await req.json();

  if (isMockMode()) {
    const existing = mockStore.submissions.find(
      (s) => s.assignmentId === params.id && s.userId === session.user.id
    );
    if (existing) return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    const submission = {
      id: `mock-sub-${Date.now()}`,
      assignmentId: params.id,
      userId: session.user.id,
      textContent: textContent ?? null,
      fileUrl: fileUrl ?? null,
      grade: null as number | null,
      feedback: null as string | null,
      submittedAt: new Date(),
    };
    mockStore.submissions.push(submission);
    return NextResponse.json(submission);
  }

  const existing = await prisma.submission.findFirst({
    where: { assignmentId: params.id, userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  const submission = await prisma.submission.create({
    data: {
      assignmentId: params.id,
      userId: session.user.id,
      textContent,
      fileUrl: fileUrl ?? null,
    },
  });

  return NextResponse.json(submission);
}

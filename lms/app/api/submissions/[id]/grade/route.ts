import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockStore, isMockMode } from "@/lib/mockData";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { grade, feedback } = await req.json();

  if (isMockMode()) {
    const sub = mockStore.submissions.find((s) => s.id === params.id);
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
    sub.grade = Number(grade);
    sub.feedback = feedback ?? null;
    return NextResponse.json(sub);
  }

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: { grade: Number(grade), feedback },
  });

  return NextResponse.json(submission);
}

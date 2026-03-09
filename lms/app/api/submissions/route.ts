import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, isMockMode } from "@/lib/mockData";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMockMode()) {
    return NextResponse.json(mockData.submissionsForTeacher);
  }

  const submissions = await prisma.submission.findMany({
    include: {
      student: { select: { name: true, email: true } },
      assignment: { select: { title: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, isMockMode } from "@/lib/mockData";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockMode()) {
    return NextResponse.json(mockData.attemptsMine(session.user.id));
  }

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: session.user.id },
    select: { testId: true, score: true, feedback: true, submittedAt: true },
  });

  return NextResponse.json(attempts);
}

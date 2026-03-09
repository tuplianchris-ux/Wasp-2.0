import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockData, mockStore, isMockMode } from "@/lib/mockData";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isMockMode()) {
    let tests = mockData.testsWithCount;
    const publishedOnly = new URL(req.url).searchParams.get("published") === "true";
    if (publishedOnly) tests = tests.filter((t) => t.published);
    return NextResponse.json(tests);
  }

  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("published") === "true";

  const tests = await prisma.test.findMany({
    where: publishedOnly ? { published: true } : {},
    include: { _count: { select: { attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tests);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMockMode()) {
    try {
      const { title, type, questions, timeLimit, published } = await req.json();
      const id = `mock-test-${Date.now()}`;
      const created = {
        id,
        title: title ?? "New Test",
        type: (type ?? "QUIZ") as "QUIZ",
        questions: JSON.stringify(questions ?? []),
        timeLimit: timeLimit != null ? Number(timeLimit) : 15,
        published: published ?? false,
        createdAt: new Date(),
      };
      mockStore.tests.push(created);
      return NextResponse.json(created);
    } catch (err) {
      return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
    }
  }

  try {
    const { title, type, questions, timeLimit, published } = await req.json();
    const test = await prisma.test.create({
      data: {
        title,
        type,
        questions: JSON.stringify(questions),
        timeLimit: timeLimit ? Number(timeLimit) : null,
        published: published ?? false,
      },
    });
    return NextResponse.json(test);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

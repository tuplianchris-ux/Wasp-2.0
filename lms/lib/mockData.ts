/**
 * Mock data for LMS when MOCK_MODE=true.
 * Mutable stores allow create/update/delete in mock mode to persist for the session.
 */

const now = new Date();
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

export const MOCK_STUDENT_ID = "mock-student";
export const MOCK_TEACHER_ID = "mock-teacher";

// Base seed data (cloned into store so we can mutate)
const seedAssignments = [
  {
    id: "mock-assign-1",
    title: "Essay: Climate Impact",
    description: "Write 500 words on climate impact.",
    dueDate: nextWeek,
    fileUrl: null as string | null,
    userId: MOCK_TEACHER_ID,
    createdAt: lastWeek,
  },
  {
    id: "mock-assign-2",
    title: "Math Problem Set 3",
    description: "Complete problems 1-10 from Chapter 5.",
    dueDate: nextWeek,
    fileUrl: null as string | null,
    userId: MOCK_TEACHER_ID,
    createdAt: lastWeek,
  },
];

const seedTests = [
  {
    id: "mock-test-1",
    title: "Quiz: Derivatives",
    type: "QUIZ" as const,
    questions: JSON.stringify([
      { id: "q1", type: "MCQ", question: "What is the derivative of x^2?", options: ["x", "2x", "x^2"], correctAnswer: "2x", points: 1 },
    ]),
    timeLimit: 15,
    published: true,
    createdAt: lastWeek,
  },
];

const seedSubmissions = [
  {
    id: "mock-sub-1",
    userId: MOCK_STUDENT_ID,
    assignmentId: "mock-assign-1",
    fileUrl: null as string | null,
    textContent: "My essay content...",
    grade: 85,
    feedback: "Good structure.",
    submittedAt: lastWeek,
  },
  {
    id: "mock-sub-2",
    userId: MOCK_STUDENT_ID,
    assignmentId: "mock-assign-2",
    fileUrl: null as string | null,
    textContent: "Work in progress...",
    grade: null as number | null,
    feedback: null as string | null,
    submittedAt: now,
  },
];

const seedAttempts = [
  {
    id: "mock-attempt-1",
    userId: MOCK_STUDENT_ID,
    testId: "mock-test-1",
    answers: "{}",
    score: 100,
    autoGraded: true,
    feedback: "[]",
    submittedAt: lastWeek,
  },
];

const seedLibrary = [
  {
    id: "mock-lib-1",
    title: "Calculus Notes",
    type: "file",
    url: "/files/calculus.pdf",
    tags: JSON.stringify(["math", "calculus"]),
    userId: MOCK_TEACHER_ID,
    createdAt: lastWeek,
  },
];

// Mutable in-memory store (used by API routes in mock mode)
export const mockStore = {
  assignments: JSON.parse(JSON.stringify(seedAssignments)) as typeof seedAssignments,
  tests: JSON.parse(JSON.stringify(seedTests)) as typeof seedTests,
  submissions: JSON.parse(JSON.stringify(seedSubmissions)) as typeof seedSubmissions,
  attempts: JSON.parse(JSON.stringify(seedAttempts)) as typeof seedAttempts,
  library: JSON.parse(JSON.stringify(seedLibrary)) as typeof seedLibrary,
};

// Helpers for API/dashboard consumption
function assignmentsWithCount() {
  return mockStore.assignments.map((a) => ({
    ...a,
    createdBy: { name: "Demo Teacher" },
    _count: { submissions: mockStore.submissions.filter((s) => s.assignmentId === a.id).length },
  }));
}

function assignmentById(id: string) {
  const a = mockStore.assignments.find((x) => x.id === id);
  if (!a) return null;
  return {
    ...a,
    createdBy: { name: "Demo Teacher" },
    submissions: mockStore.submissions
      .filter((s) => s.assignmentId === id)
      .map((s) => ({ ...s, student: { name: "Demo Student", email: "student@demo.local" } })),
  };
}

function testsWithCount() {
  return mockStore.tests.map((t) => ({
    ...t,
    _count: { attempts: mockStore.attempts.filter((a) => a.testId === t.id).length },
  }));
}

function testById(id: string) {
  const t = mockStore.tests.find((x) => x.id === id);
  if (!t) return null;
  return {
    ...t,
    attempts: mockStore.attempts
      .filter((a) => a.testId === id)
      .map((a) => ({ ...a, student: { name: "Demo Student", email: "student@demo.local" } })),
  };
}

function submissionsForTeacher() {
  return mockStore.submissions.map((s) => ({
    ...s,
    student: { name: "Demo Student", email: "student@demo.local" },
    assignment: { title: mockStore.assignments.find((a) => a.id === s.assignmentId)?.title ?? "Assignment" },
  }));
}

function submissionsForUser(userId: string) {
  return mockStore.submissions
    .filter((s) => s.userId === userId)
    .map((s) => ({
      ...s,
      assignment: { title: mockStore.assignments.find((a) => a.id === s.assignmentId)?.title ?? "Assignment" },
    }));
}

function libraryWithAddedBy() {
  return mockStore.library.map((item) => ({
    ...item,
    addedBy: { name: "Demo Teacher" },
    tags: JSON.parse(item.tags) as string[],
  }));
}

export const mockData = {
  get assignmentsWithCount() {
    return assignmentsWithCount();
  },
  get testsWithCount() {
    return testsWithCount();
  },
  assignmentById,
  testById,
  submissionsForTeacher,
  submissionsForUser,
  libraryWithAddedBy,
  get pendingSubmissions() {
    return mockStore.submissions
      .filter((s) => s.grade == null)
      .map((s) => ({
        ...s,
        student: { name: "Demo Student" },
        assignment: { title: mockStore.assignments.find((a) => a.id === s.assignmentId)?.title ?? "Assignment" },
      }))
      .slice(0, 5);
  },
  get recentAssignments() {
    return mockStore.assignments
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((a) => ({
        ...a,
        _count: { submissions: mockStore.submissions.filter((s) => s.assignmentId === a.id).length },
      }));
  },
  attemptsForUser(userId: string) {
    return mockStore.attempts
      .filter((a) => a.userId === userId)
      .map((a) => ({
        ...a,
        test: { title: mockStore.tests.find((t) => t.id === a.testId)?.title ?? "Test" },
      }));
  },
  attemptsMine(userId: string) {
    return mockStore.attempts
      .filter((a) => a.userId === userId)
      .map((a) => ({ testId: a.testId, score: a.score, feedback: a.feedback, submittedAt: a.submittedAt }));
  },
  publishedTestCount() {
    return mockStore.tests.filter((t) => t.published).length;
  },
};

export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true";
}

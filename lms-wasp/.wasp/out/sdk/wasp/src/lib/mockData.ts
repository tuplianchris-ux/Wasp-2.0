/**
 * Seed / mock data for development when MOCK_DATA=true.
 * Use when running without a real Postgres database (e.g. quick UI testing).
 *
 * Set MOCK_DATA=true in .env.server to enable. Task list queries (getTasks, getMyTasks, getStudents)
 * will return this seed data instead of hitting the database.
 */

const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

export const mockTasks = [
  {
    id: "mock-task-1",
    title: "Complete reading assignment",
    description: "Read Chapter 5 and take notes",
    dueDate: tomorrow,
    completed: false,
    userId: "mock-user-1",
    createdAt: now,
    assignedTo: { id: "mock-user-1", name: "Student One" },
  },
  {
    id: "mock-task-2",
    title: "Submit essay draft",
    description: "First draft of the comparative analysis essay",
    dueDate: nextWeek,
    completed: false,
    userId: "mock-user-1",
    createdAt: now,
    assignedTo: { id: "mock-user-1", name: "Student One" },
  },
  {
    id: "mock-task-3",
    title: "Review quiz answers",
    description: null,
    dueDate: tomorrow,
    completed: true,
    userId: "mock-user-2",
    createdAt: now,
    assignedTo: { id: "mock-user-2", name: "Student Two" },
  },
];

/** Tasks for "my" list (e.g. current user is mock-user-1) */
export const mockMyTasks = mockTasks.filter((t) => t.userId === "mock-user-1");

export function isMockMode(): boolean {
  return process.env.MOCK_DATA === "true";
}

import { type QueryFor, createQuery } from './core'
import { GetAssignments_ext } from 'wasp/server/operations/queries'
import { GetAssignment_ext } from 'wasp/server/operations/queries'
import { GetTests_ext } from 'wasp/server/operations/queries'
import { GetTest_ext } from 'wasp/server/operations/queries'
import { GetMyTestAttempts_ext } from 'wasp/server/operations/queries'
import { GetSubmissions_ext } from 'wasp/server/operations/queries'
import { GetMySubmissions_ext } from 'wasp/server/operations/queries'
import { GetLibraryItems_ext } from 'wasp/server/operations/queries'
import { GetTeacherDashboardStats_ext } from 'wasp/server/operations/queries'
import { GetStudentDashboardStats_ext } from 'wasp/server/operations/queries'
import { GetTasks_ext } from 'wasp/server/operations/queries'
import { GetMyTasks_ext } from 'wasp/server/operations/queries'
import { GetStudents_ext } from 'wasp/server/operations/queries'

// PUBLIC API
export const getAssignments: QueryFor<GetAssignments_ext> = createQuery<GetAssignments_ext>(
  'operations/get-assignments',
  ['Assignment', 'Submission'],
)

// PUBLIC API
export const getAssignment: QueryFor<GetAssignment_ext> = createQuery<GetAssignment_ext>(
  'operations/get-assignment',
  ['Assignment', 'Submission', 'User'],
)

// PUBLIC API
export const getTests: QueryFor<GetTests_ext> = createQuery<GetTests_ext>(
  'operations/get-tests',
  ['Test', 'TestAttempt'],
)

// PUBLIC API
export const getTest: QueryFor<GetTest_ext> = createQuery<GetTest_ext>(
  'operations/get-test',
  ['Test', 'TestAttempt', 'User'],
)

// PUBLIC API
export const getMyTestAttempts: QueryFor<GetMyTestAttempts_ext> = createQuery<GetMyTestAttempts_ext>(
  'operations/get-my-test-attempts',
  ['TestAttempt', 'Test'],
)

// PUBLIC API
export const getSubmissions: QueryFor<GetSubmissions_ext> = createQuery<GetSubmissions_ext>(
  'operations/get-submissions',
  ['Submission', 'User', 'Assignment'],
)

// PUBLIC API
export const getMySubmissions: QueryFor<GetMySubmissions_ext> = createQuery<GetMySubmissions_ext>(
  'operations/get-my-submissions',
  ['Submission', 'Assignment'],
)

// PUBLIC API
export const getLibraryItems: QueryFor<GetLibraryItems_ext> = createQuery<GetLibraryItems_ext>(
  'operations/get-library-items',
  ['LibraryItem', 'User'],
)

// PUBLIC API
export const getTeacherDashboardStats: QueryFor<GetTeacherDashboardStats_ext> = createQuery<GetTeacherDashboardStats_ext>(
  'operations/get-teacher-dashboard-stats',
  ['Assignment', 'Test', 'Submission', 'User'],
)

// PUBLIC API
export const getStudentDashboardStats: QueryFor<GetStudentDashboardStats_ext> = createQuery<GetStudentDashboardStats_ext>(
  'operations/get-student-dashboard-stats',
  ['Assignment', 'Submission', 'TestAttempt', 'Test'],
)

// PUBLIC API
export const getTasks: QueryFor<GetTasks_ext> = createQuery<GetTasks_ext>(
  'operations/get-tasks',
  ['Task', 'User'],
)

// PUBLIC API
export const getMyTasks: QueryFor<GetMyTasks_ext> = createQuery<GetMyTasks_ext>(
  'operations/get-my-tasks',
  ['Task'],
)

// PUBLIC API
export const getStudents: QueryFor<GetStudents_ext> = createQuery<GetStudents_ext>(
  'operations/get-students',
  ['User'],
)

// PRIVATE API (used in SDK)
export { buildAndRegisterQuery } from './core'

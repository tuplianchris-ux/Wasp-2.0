// @ts-nocheck
import { createAuthRequiredPage } from "wasp/client/app"

// These files are used from user-land and the import paths below are relative to the
// user's project dir, and not the SDK:
import { LoginPage } from './src/pages/auth/AuthPages'
import { SignupPage } from './src/pages/auth/AuthPages'
import { EmailVerificationPage } from './src/pages/auth/AuthPages'
import { RequestPasswordResetPage } from './src/pages/auth/AuthPages'
import { PasswordResetPage } from './src/pages/auth/AuthPages'
import { RootPage } from './src/pages/RootPage'
import { TeacherDashboardPage } from './src/pages/teacher/Dashboard'
import { TeacherAssignmentsPage } from './src/pages/teacher/Assignments'
import { TeacherAssignmentDetailPage } from './src/pages/teacher/AssignmentDetail'
import { TeacherTestsPage } from './src/pages/teacher/Tests'
import { TeacherTestDetailPage } from './src/pages/teacher/TestDetail'
import { TeacherSubmissionsPage } from './src/pages/teacher/Submissions'
import { TeacherLibraryPage } from './src/pages/teacher/Library'
import { TeacherTasksPage } from './src/pages/teacher/Tasks'
import { StudentDashboardPage } from './src/pages/student/Dashboard'
import { StudentAssignmentsPage } from './src/pages/student/Assignments'
import { StudentTestsPage } from './src/pages/student/Tests'
import { StudentLibraryPage } from './src/pages/student/Library'
import { StudentStudyHubPage } from './src/pages/student/StudyHub'
import { StudentTasksPage } from './src/pages/student/Tasks'

export const routesMapping = {
  LoginRoute: LoginPage,
  SignupRoute: SignupPage,
  EmailVerificationRoute: EmailVerificationPage,
  RequestPasswordResetRoute: RequestPasswordResetPage,
  PasswordResetRoute: PasswordResetPage,
  RootRoute: createAuthRequiredPage(RootPage),
  TeacherDashboardRoute: createAuthRequiredPage(TeacherDashboardPage),
  TeacherAssignmentsRoute: createAuthRequiredPage(TeacherAssignmentsPage),
  TeacherAssignmentDetailRoute: createAuthRequiredPage(TeacherAssignmentDetailPage),
  TeacherTestsRoute: createAuthRequiredPage(TeacherTestsPage),
  TeacherTestDetailRoute: createAuthRequiredPage(TeacherTestDetailPage),
  TeacherSubmissionsRoute: createAuthRequiredPage(TeacherSubmissionsPage),
  TeacherLibraryRoute: createAuthRequiredPage(TeacherLibraryPage),
  TeacherTasksRoute: createAuthRequiredPage(TeacherTasksPage),
  StudentDashboardRoute: createAuthRequiredPage(StudentDashboardPage),
  StudentAssignmentsRoute: createAuthRequiredPage(StudentAssignmentsPage),
  StudentTestsRoute: createAuthRequiredPage(StudentTestsPage),
  StudentLibraryRoute: createAuthRequiredPage(StudentLibraryPage),
  StudentStudyHubRoute: createAuthRequiredPage(StudentStudyHubPage),
  StudentTasksRoute: createAuthRequiredPage(StudentTasksPage),
} as const;

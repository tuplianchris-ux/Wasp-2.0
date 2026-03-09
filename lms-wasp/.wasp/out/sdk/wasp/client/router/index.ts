import { interpolatePath } from './linkHelpers'
import type {
  RouteDefinitionsToRoutes,
  OptionalRouteOptions,
  ParamValue,
  ExpandRouteOnOptionalStaticSegments,
} from './types'

// PUBLIC API
export const routes = {
  LoginRoute: {
    to: "/login",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/login",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  SignupRoute: {
    to: "/signup",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/signup",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  EmailVerificationRoute: {
    to: "/email-verification",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/email-verification",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  RequestPasswordResetRoute: {
    to: "/request-password-reset",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/request-password-reset",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  PasswordResetRoute: {
    to: "/password-reset",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/password-reset",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  RootRoute: {
    to: "/",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  TeacherDashboardRoute: {
    to: "/teacher/dashboard",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/teacher/dashboard",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  TeacherAssignmentsRoute: {
    to: "/teacher/assignments",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/teacher/assignments",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  TeacherAssignmentDetailRoute: {
    to: "/teacher/assignments/:id",
    build: (
      options: OptionalRouteOptions
      & { params: {"id": ParamValue;}}
    ) => interpolatePath(
        
        "/teacher/assignments/:id",
        options.params,
        options?.search,
        options?.hash
      ),
  },
  TeacherTestsRoute: {
    to: "/teacher/tests",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/teacher/tests",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  TeacherTestDetailRoute: {
    to: "/teacher/tests/:id",
    build: (
      options: OptionalRouteOptions
      & { params: {"id": ParamValue;}}
    ) => interpolatePath(
        
        "/teacher/tests/:id",
        options.params,
        options?.search,
        options?.hash
      ),
  },
  TeacherSubmissionsRoute: {
    to: "/teacher/grading",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/teacher/grading",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  TeacherLibraryRoute: {
    to: "/teacher/library",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/teacher/library",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  TeacherTasksRoute: {
    to: "/teacher/tasks",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/teacher/tasks",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  StudentDashboardRoute: {
    to: "/student/dashboard",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/student/dashboard",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  StudentAssignmentsRoute: {
    to: "/student/assignments",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/student/assignments",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  StudentTestsRoute: {
    to: "/student/tests",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/student/tests",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  StudentLibraryRoute: {
    to: "/student/library",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/student/library",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  StudentStudyHubRoute: {
    to: "/student/study-hub",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/student/study-hub",
        undefined,
        options?.search,
        options?.hash
      ),
  },
  StudentTasksRoute: {
    to: "/student/tasks",
    build: (
      options?:
      OptionalRouteOptions
    ) => interpolatePath(
        
        "/student/tasks",
        undefined,
        options?.search,
        options?.hash
      ),
  },
} as const;

// PRIVATE API
export type Routes = RouteDefinitionsToRoutes<typeof routes>

// PUBLIC API
export { Link } from './Link'

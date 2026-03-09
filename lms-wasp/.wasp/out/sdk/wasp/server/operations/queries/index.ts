
import { prisma } from 'wasp/server'
import {
  type UnauthenticatedOperationFor,
  createUnauthenticatedOperation,
  type AuthenticatedOperationFor,
  createAuthenticatedOperation,
} from '../wrappers.js'
import { getAssignments as getAssignments_ext } from 'wasp/src/queries/assignments'
import { getAssignment as getAssignment_ext } from 'wasp/src/queries/assignments'
import { getTests as getTests_ext } from 'wasp/src/queries/tests'
import { getTest as getTest_ext } from 'wasp/src/queries/tests'
import { getMyTestAttempts as getMyTestAttempts_ext } from 'wasp/src/queries/tests'
import { getSubmissions as getSubmissions_ext } from 'wasp/src/queries/submissions'
import { getMySubmissions as getMySubmissions_ext } from 'wasp/src/queries/submissions'
import { getLibraryItems as getLibraryItems_ext } from 'wasp/src/queries/library'
import { getTeacherDashboardStats as getTeacherDashboardStats_ext } from 'wasp/src/queries/dashboard'
import { getStudentDashboardStats as getStudentDashboardStats_ext } from 'wasp/src/queries/dashboard'
import { getTasks as getTasks_ext } from 'wasp/src/queries/tasks'
import { getMyTasks as getMyTasks_ext } from 'wasp/src/queries/tasks'
import { getStudents as getStudents_ext } from 'wasp/src/queries/tasks'

// PRIVATE API
export type GetAssignments_ext = typeof getAssignments_ext

// PUBLIC API
export const getAssignments: AuthenticatedOperationFor<GetAssignments_ext> =
  createAuthenticatedOperation(
    getAssignments_ext,
    {
      Assignment: prisma.assignment,
      Submission: prisma.submission,
    },
  )


// PRIVATE API
export type GetAssignment_ext = typeof getAssignment_ext

// PUBLIC API
export const getAssignment: AuthenticatedOperationFor<GetAssignment_ext> =
  createAuthenticatedOperation(
    getAssignment_ext,
    {
      Assignment: prisma.assignment,
      Submission: prisma.submission,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetTests_ext = typeof getTests_ext

// PUBLIC API
export const getTests: AuthenticatedOperationFor<GetTests_ext> =
  createAuthenticatedOperation(
    getTests_ext,
    {
      Test: prisma.test,
      TestAttempt: prisma.testAttempt,
    },
  )


// PRIVATE API
export type GetTest_ext = typeof getTest_ext

// PUBLIC API
export const getTest: AuthenticatedOperationFor<GetTest_ext> =
  createAuthenticatedOperation(
    getTest_ext,
    {
      Test: prisma.test,
      TestAttempt: prisma.testAttempt,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetMyTestAttempts_ext = typeof getMyTestAttempts_ext

// PUBLIC API
export const getMyTestAttempts: AuthenticatedOperationFor<GetMyTestAttempts_ext> =
  createAuthenticatedOperation(
    getMyTestAttempts_ext,
    {
      TestAttempt: prisma.testAttempt,
      Test: prisma.test,
    },
  )


// PRIVATE API
export type GetSubmissions_ext = typeof getSubmissions_ext

// PUBLIC API
export const getSubmissions: AuthenticatedOperationFor<GetSubmissions_ext> =
  createAuthenticatedOperation(
    getSubmissions_ext,
    {
      Submission: prisma.submission,
      User: prisma.user,
      Assignment: prisma.assignment,
    },
  )


// PRIVATE API
export type GetMySubmissions_ext = typeof getMySubmissions_ext

// PUBLIC API
export const getMySubmissions: AuthenticatedOperationFor<GetMySubmissions_ext> =
  createAuthenticatedOperation(
    getMySubmissions_ext,
    {
      Submission: prisma.submission,
      Assignment: prisma.assignment,
    },
  )


// PRIVATE API
export type GetLibraryItems_ext = typeof getLibraryItems_ext

// PUBLIC API
export const getLibraryItems: AuthenticatedOperationFor<GetLibraryItems_ext> =
  createAuthenticatedOperation(
    getLibraryItems_ext,
    {
      LibraryItem: prisma.libraryItem,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetTeacherDashboardStats_ext = typeof getTeacherDashboardStats_ext

// PUBLIC API
export const getTeacherDashboardStats: AuthenticatedOperationFor<GetTeacherDashboardStats_ext> =
  createAuthenticatedOperation(
    getTeacherDashboardStats_ext,
    {
      Assignment: prisma.assignment,
      Test: prisma.test,
      Submission: prisma.submission,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetStudentDashboardStats_ext = typeof getStudentDashboardStats_ext

// PUBLIC API
export const getStudentDashboardStats: AuthenticatedOperationFor<GetStudentDashboardStats_ext> =
  createAuthenticatedOperation(
    getStudentDashboardStats_ext,
    {
      Assignment: prisma.assignment,
      Submission: prisma.submission,
      TestAttempt: prisma.testAttempt,
      Test: prisma.test,
    },
  )


// PRIVATE API
export type GetTasks_ext = typeof getTasks_ext

// PUBLIC API
export const getTasks: AuthenticatedOperationFor<GetTasks_ext> =
  createAuthenticatedOperation(
    getTasks_ext,
    {
      Task: prisma.task,
      User: prisma.user,
    },
  )


// PRIVATE API
export type GetMyTasks_ext = typeof getMyTasks_ext

// PUBLIC API
export const getMyTasks: AuthenticatedOperationFor<GetMyTasks_ext> =
  createAuthenticatedOperation(
    getMyTasks_ext,
    {
      Task: prisma.task,
    },
  )


// PRIVATE API
export type GetStudents_ext = typeof getStudents_ext

// PUBLIC API
export const getStudents: AuthenticatedOperationFor<GetStudents_ext> =
  createAuthenticatedOperation(
    getStudents_ext,
    {
      User: prisma.user,
    },
  )


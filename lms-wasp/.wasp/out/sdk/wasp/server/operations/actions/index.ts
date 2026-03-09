
import { prisma } from 'wasp/server'
import {
  type UnauthenticatedOperationFor,
  createUnauthenticatedOperation,
  type AuthenticatedOperationFor,
  createAuthenticatedOperation,
} from '../wrappers.js'
import { createAssignment as createAssignment_ext } from 'wasp/src/actions/assignments'
import { updateAssignment as updateAssignment_ext } from 'wasp/src/actions/assignments'
import { deleteAssignment as deleteAssignment_ext } from 'wasp/src/actions/assignments'
import { submitAssignment as submitAssignment_ext } from 'wasp/src/actions/assignments'
import { createTest as createTest_ext } from 'wasp/src/actions/tests'
import { updateTest as updateTest_ext } from 'wasp/src/actions/tests'
import { deleteTest as deleteTest_ext } from 'wasp/src/actions/tests'
import { submitTestAttempt as submitTestAttempt_ext } from 'wasp/src/actions/tests'
import { gradeSubmission as gradeSubmission_ext } from 'wasp/src/actions/submissions'
import { createLibraryItem as createLibraryItem_ext } from 'wasp/src/actions/library'
import { deleteLibraryItem as deleteLibraryItem_ext } from 'wasp/src/actions/library'
import { getAiStudyGuide as getAiStudyGuide_ext } from 'wasp/src/actions/ai'
import { gradeWithAi as gradeWithAi_ext } from 'wasp/src/actions/ai'
import { createTask as createTask_ext } from 'wasp/src/actions/tasks'
import { updateTask as updateTask_ext } from 'wasp/src/actions/tasks'
import { deleteTask as deleteTask_ext } from 'wasp/src/actions/tasks'
import { completeTask as completeTask_ext } from 'wasp/src/actions/tasks'

// PRIVATE API
export type CreateAssignment_ext = typeof createAssignment_ext

// PUBLIC API
export const createAssignment: AuthenticatedOperationFor<CreateAssignment_ext> =
  createAuthenticatedOperation(
    createAssignment_ext,
    {
      Assignment: prisma.assignment,
    },
  )

// PRIVATE API
export type UpdateAssignment_ext = typeof updateAssignment_ext

// PUBLIC API
export const updateAssignment: AuthenticatedOperationFor<UpdateAssignment_ext> =
  createAuthenticatedOperation(
    updateAssignment_ext,
    {
      Assignment: prisma.assignment,
    },
  )

// PRIVATE API
export type DeleteAssignment_ext = typeof deleteAssignment_ext

// PUBLIC API
export const deleteAssignment: AuthenticatedOperationFor<DeleteAssignment_ext> =
  createAuthenticatedOperation(
    deleteAssignment_ext,
    {
      Assignment: prisma.assignment,
    },
  )

// PRIVATE API
export type SubmitAssignment_ext = typeof submitAssignment_ext

// PUBLIC API
export const submitAssignment: AuthenticatedOperationFor<SubmitAssignment_ext> =
  createAuthenticatedOperation(
    submitAssignment_ext,
    {
      Submission: prisma.submission,
    },
  )

// PRIVATE API
export type CreateTest_ext = typeof createTest_ext

// PUBLIC API
export const createTest: AuthenticatedOperationFor<CreateTest_ext> =
  createAuthenticatedOperation(
    createTest_ext,
    {
      Test: prisma.test,
    },
  )

// PRIVATE API
export type UpdateTest_ext = typeof updateTest_ext

// PUBLIC API
export const updateTest: AuthenticatedOperationFor<UpdateTest_ext> =
  createAuthenticatedOperation(
    updateTest_ext,
    {
      Test: prisma.test,
    },
  )

// PRIVATE API
export type DeleteTest_ext = typeof deleteTest_ext

// PUBLIC API
export const deleteTest: AuthenticatedOperationFor<DeleteTest_ext> =
  createAuthenticatedOperation(
    deleteTest_ext,
    {
      Test: prisma.test,
    },
  )

// PRIVATE API
export type SubmitTestAttempt_ext = typeof submitTestAttempt_ext

// PUBLIC API
export const submitTestAttempt: AuthenticatedOperationFor<SubmitTestAttempt_ext> =
  createAuthenticatedOperation(
    submitTestAttempt_ext,
    {
      TestAttempt: prisma.testAttempt,
      Test: prisma.test,
    },
  )

// PRIVATE API
export type GradeSubmission_ext = typeof gradeSubmission_ext

// PUBLIC API
export const gradeSubmission: AuthenticatedOperationFor<GradeSubmission_ext> =
  createAuthenticatedOperation(
    gradeSubmission_ext,
    {
      Submission: prisma.submission,
    },
  )

// PRIVATE API
export type CreateLibraryItem_ext = typeof createLibraryItem_ext

// PUBLIC API
export const createLibraryItem: AuthenticatedOperationFor<CreateLibraryItem_ext> =
  createAuthenticatedOperation(
    createLibraryItem_ext,
    {
      LibraryItem: prisma.libraryItem,
    },
  )

// PRIVATE API
export type DeleteLibraryItem_ext = typeof deleteLibraryItem_ext

// PUBLIC API
export const deleteLibraryItem: AuthenticatedOperationFor<DeleteLibraryItem_ext> =
  createAuthenticatedOperation(
    deleteLibraryItem_ext,
    {
      LibraryItem: prisma.libraryItem,
    },
  )

// PRIVATE API
export type GetAiStudyGuide_ext = typeof getAiStudyGuide_ext

// PUBLIC API
export const getAiStudyGuide: AuthenticatedOperationFor<GetAiStudyGuide_ext> =
  createAuthenticatedOperation(
    getAiStudyGuide_ext,
    {
    },
  )

// PRIVATE API
export type GradeWithAi_ext = typeof gradeWithAi_ext

// PUBLIC API
export const gradeWithAi: AuthenticatedOperationFor<GradeWithAi_ext> =
  createAuthenticatedOperation(
    gradeWithAi_ext,
    {
    },
  )

// PRIVATE API
export type CreateTask_ext = typeof createTask_ext

// PUBLIC API
export const createTask: AuthenticatedOperationFor<CreateTask_ext> =
  createAuthenticatedOperation(
    createTask_ext,
    {
      Task: prisma.task,
    },
  )

// PRIVATE API
export type UpdateTask_ext = typeof updateTask_ext

// PUBLIC API
export const updateTask: AuthenticatedOperationFor<UpdateTask_ext> =
  createAuthenticatedOperation(
    updateTask_ext,
    {
      Task: prisma.task,
    },
  )

// PRIVATE API
export type DeleteTask_ext = typeof deleteTask_ext

// PUBLIC API
export const deleteTask: AuthenticatedOperationFor<DeleteTask_ext> =
  createAuthenticatedOperation(
    deleteTask_ext,
    {
      Task: prisma.task,
    },
  )

// PRIVATE API
export type CompleteTask_ext = typeof completeTask_ext

// PUBLIC API
export const completeTask: AuthenticatedOperationFor<CompleteTask_ext> =
  createAuthenticatedOperation(
    completeTask_ext,
    {
      Task: prisma.task,
    },
  )

import { type ActionFor, createAction } from './core'
import { CreateAssignment_ext } from 'wasp/server/operations/actions'
import { UpdateAssignment_ext } from 'wasp/server/operations/actions'
import { DeleteAssignment_ext } from 'wasp/server/operations/actions'
import { SubmitAssignment_ext } from 'wasp/server/operations/actions'
import { CreateTest_ext } from 'wasp/server/operations/actions'
import { UpdateTest_ext } from 'wasp/server/operations/actions'
import { DeleteTest_ext } from 'wasp/server/operations/actions'
import { SubmitTestAttempt_ext } from 'wasp/server/operations/actions'
import { GradeSubmission_ext } from 'wasp/server/operations/actions'
import { CreateLibraryItem_ext } from 'wasp/server/operations/actions'
import { DeleteLibraryItem_ext } from 'wasp/server/operations/actions'
import { GetAiStudyGuide_ext } from 'wasp/server/operations/actions'
import { GradeWithAi_ext } from 'wasp/server/operations/actions'
import { CreateTask_ext } from 'wasp/server/operations/actions'
import { UpdateTask_ext } from 'wasp/server/operations/actions'
import { DeleteTask_ext } from 'wasp/server/operations/actions'
import { CompleteTask_ext } from 'wasp/server/operations/actions'

// PUBLIC API
export const createAssignment: ActionFor<CreateAssignment_ext> = createAction<CreateAssignment_ext>(
  'operations/create-assignment',
  ['Assignment'],
)

// PUBLIC API
export const updateAssignment: ActionFor<UpdateAssignment_ext> = createAction<UpdateAssignment_ext>(
  'operations/update-assignment',
  ['Assignment'],
)

// PUBLIC API
export const deleteAssignment: ActionFor<DeleteAssignment_ext> = createAction<DeleteAssignment_ext>(
  'operations/delete-assignment',
  ['Assignment'],
)

// PUBLIC API
export const submitAssignment: ActionFor<SubmitAssignment_ext> = createAction<SubmitAssignment_ext>(
  'operations/submit-assignment',
  ['Submission'],
)

// PUBLIC API
export const createTest: ActionFor<CreateTest_ext> = createAction<CreateTest_ext>(
  'operations/create-test',
  ['Test'],
)

// PUBLIC API
export const updateTest: ActionFor<UpdateTest_ext> = createAction<UpdateTest_ext>(
  'operations/update-test',
  ['Test'],
)

// PUBLIC API
export const deleteTest: ActionFor<DeleteTest_ext> = createAction<DeleteTest_ext>(
  'operations/delete-test',
  ['Test'],
)

// PUBLIC API
export const submitTestAttempt: ActionFor<SubmitTestAttempt_ext> = createAction<SubmitTestAttempt_ext>(
  'operations/submit-test-attempt',
  ['TestAttempt', 'Test'],
)

// PUBLIC API
export const gradeSubmission: ActionFor<GradeSubmission_ext> = createAction<GradeSubmission_ext>(
  'operations/grade-submission',
  ['Submission'],
)

// PUBLIC API
export const createLibraryItem: ActionFor<CreateLibraryItem_ext> = createAction<CreateLibraryItem_ext>(
  'operations/create-library-item',
  ['LibraryItem'],
)

// PUBLIC API
export const deleteLibraryItem: ActionFor<DeleteLibraryItem_ext> = createAction<DeleteLibraryItem_ext>(
  'operations/delete-library-item',
  ['LibraryItem'],
)

// PUBLIC API
export const getAiStudyGuide: ActionFor<GetAiStudyGuide_ext> = createAction<GetAiStudyGuide_ext>(
  'operations/get-ai-study-guide',
  [],
)

// PUBLIC API
export const gradeWithAi: ActionFor<GradeWithAi_ext> = createAction<GradeWithAi_ext>(
  'operations/grade-with-ai',
  [],
)

// PUBLIC API
export const createTask: ActionFor<CreateTask_ext> = createAction<CreateTask_ext>(
  'operations/create-task',
  ['Task'],
)

// PUBLIC API
export const updateTask: ActionFor<UpdateTask_ext> = createAction<UpdateTask_ext>(
  'operations/update-task',
  ['Task'],
)

// PUBLIC API
export const deleteTask: ActionFor<DeleteTask_ext> = createAction<DeleteTask_ext>(
  'operations/delete-task',
  ['Task'],
)

// PUBLIC API
export const completeTask: ActionFor<CompleteTask_ext> = createAction<CompleteTask_ext>(
  'operations/complete-task',
  ['Task'],
)

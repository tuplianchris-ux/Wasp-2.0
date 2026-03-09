import {
  type _Assignment,
  type _Submission,
  type _Test,
  type _TestAttempt,
  type _LibraryItem,
  type _Task,
  type AuthenticatedActionDefinition,
  type Payload,
} from 'wasp/server/_types'

// PUBLIC API
export type CreateAssignment<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Assignment,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateAssignment<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Assignment,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteAssignment<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Assignment,
    ],
    Input,
    Output
  >

// PUBLIC API
export type SubmitAssignment<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Submission,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateTest<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Test,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateTest<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Test,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteTest<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Test,
    ],
    Input,
    Output
  >

// PUBLIC API
export type SubmitTestAttempt<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _TestAttempt,
      _Test,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GradeSubmission<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Submission,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateLibraryItem<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _LibraryItem,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteLibraryItem<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _LibraryItem,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAiStudyGuide<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
    ],
    Input,
    Output
  >

// PUBLIC API
export type GradeWithAi<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
    ],
    Input,
    Output
  >

// PUBLIC API
export type CreateTask<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Task,
    ],
    Input,
    Output
  >

// PUBLIC API
export type UpdateTask<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Task,
    ],
    Input,
    Output
  >

// PUBLIC API
export type DeleteTask<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Task,
    ],
    Input,
    Output
  >

// PUBLIC API
export type CompleteTask<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedActionDefinition<
    [
      _Task,
    ],
    Input,
    Output
  >


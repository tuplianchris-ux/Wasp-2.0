
import {
  type _Assignment,
  type _Submission,
  type _User,
  type _Test,
  type _TestAttempt,
  type _LibraryItem,
  type _Task,
  type AuthenticatedQueryDefinition,
  type Payload,
} from 'wasp/server/_types'

// PUBLIC API
export type GetAssignments<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Assignment,
      _Submission,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetAssignment<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Assignment,
      _Submission,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTests<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Test,
      _TestAttempt,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTest<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Test,
      _TestAttempt,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetMyTestAttempts<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _TestAttempt,
      _Test,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetSubmissions<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Submission,
      _User,
      _Assignment,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetMySubmissions<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Submission,
      _Assignment,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetLibraryItems<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _LibraryItem,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTeacherDashboardStats<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Assignment,
      _Test,
      _Submission,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetStudentDashboardStats<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Assignment,
      _Submission,
      _TestAttempt,
      _Test,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetTasks<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Task,
      _User,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetMyTasks<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _Task,
    ],
    Input,
    Output
  >

// PUBLIC API
export type GetStudents<Input extends Payload = never, Output extends Payload = Payload> = 
  AuthenticatedQueryDefinition<
    [
      _User,
    ],
    Input,
    Output
  >


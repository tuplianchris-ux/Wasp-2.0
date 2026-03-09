// Wasp internally uses the types defined in this file for typing entity maps in
// operation contexts.
//
// We must explicitly tag all entities with their name to avoid issues with
// structural typing. See https://github.com/wasp-lang/wasp/pull/982 for details.
import { 
  type Entity, 
  type EntityName,
  type User,
  type Task,
  type Assignment,
  type Test,
  type TestAttempt,
  type Submission,
  type LibraryItem,
} from 'wasp/entities'

export type _User = WithName<User, "User">
export type _Task = WithName<Task, "Task">
export type _Assignment = WithName<Assignment, "Assignment">
export type _Test = WithName<Test, "Test">
export type _TestAttempt = WithName<TestAttempt, "TestAttempt">
export type _Submission = WithName<Submission, "Submission">
export type _LibraryItem = WithName<LibraryItem, "LibraryItem">

export type _Entity = 
  | _User
  | _Task
  | _Assignment
  | _Test
  | _TestAttempt
  | _Submission
  | _LibraryItem
  | never

type WithName<E extends Entity, Name extends EntityName> = 
  E & { _entityName: Name }

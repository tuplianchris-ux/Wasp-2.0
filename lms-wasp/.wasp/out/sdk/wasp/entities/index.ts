import {
  type User,
  type Task,
  type Assignment,
  type Test,
  type TestAttempt,
  type Submission,
  type LibraryItem,
} from "@prisma/client"

export {
  type User,
  type Task,
  type Assignment,
  type Test,
  type TestAttempt,
  type Submission,
  type LibraryItem,
  type Auth,
  type AuthIdentity,
} from "@prisma/client"

export type Entity = 
  | User
  | Task
  | Assignment
  | Test
  | TestAttempt
  | Submission
  | LibraryItem
  | never

export type EntityName = 
  | "User"
  | "Task"
  | "Assignment"
  | "Test"
  | "TestAttempt"
  | "Submission"
  | "LibraryItem"
  | never

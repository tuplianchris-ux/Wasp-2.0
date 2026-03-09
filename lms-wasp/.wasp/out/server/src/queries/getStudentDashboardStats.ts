import { prisma } from 'wasp/server'

import { getStudentDashboardStats } from '../../../../../src/queries/dashboard'


export default async function (args, context) {
  return (getStudentDashboardStats as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
      Submission: prisma.submission,
      TestAttempt: prisma.testAttempt,
      Test: prisma.test,
    },
  })
}

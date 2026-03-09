import { prisma } from 'wasp/server'

import { getTeacherDashboardStats } from '../../../../../src/queries/dashboard'


export default async function (args, context) {
  return (getTeacherDashboardStats as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
      Test: prisma.test,
      Submission: prisma.submission,
      User: prisma.user,
    },
  })
}

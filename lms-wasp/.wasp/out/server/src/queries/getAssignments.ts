import { prisma } from 'wasp/server'

import { getAssignments } from '../../../../../src/queries/assignments'


export default async function (args, context) {
  return (getAssignments as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
      Submission: prisma.submission,
    },
  })
}

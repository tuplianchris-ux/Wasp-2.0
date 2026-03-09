import { prisma } from 'wasp/server'

import { getSubmissions } from '../../../../../src/queries/submissions'


export default async function (args, context) {
  return (getSubmissions as any)(args, {
    ...context,
    entities: {
      Submission: prisma.submission,
      User: prisma.user,
      Assignment: prisma.assignment,
    },
  })
}

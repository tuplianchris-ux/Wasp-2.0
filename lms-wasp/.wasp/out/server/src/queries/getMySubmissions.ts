import { prisma } from 'wasp/server'

import { getMySubmissions } from '../../../../../src/queries/submissions'


export default async function (args, context) {
  return (getMySubmissions as any)(args, {
    ...context,
    entities: {
      Submission: prisma.submission,
      Assignment: prisma.assignment,
    },
  })
}

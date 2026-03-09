import { prisma } from 'wasp/server'

import { getAssignment } from '../../../../../src/queries/assignments'


export default async function (args, context) {
  return (getAssignment as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
      Submission: prisma.submission,
      User: prisma.user,
    },
  })
}

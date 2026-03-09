import { prisma } from 'wasp/server'

import { getStudents } from '../../../../../src/queries/tasks'


export default async function (args, context) {
  return (getStudents as any)(args, {
    ...context,
    entities: {
      User: prisma.user,
    },
  })
}

import { prisma } from 'wasp/server'

import { getTest } from '../../../../../src/queries/tests'


export default async function (args, context) {
  return (getTest as any)(args, {
    ...context,
    entities: {
      Test: prisma.test,
      TestAttempt: prisma.testAttempt,
      User: prisma.user,
    },
  })
}

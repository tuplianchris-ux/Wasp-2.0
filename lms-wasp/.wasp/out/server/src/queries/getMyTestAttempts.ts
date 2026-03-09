import { prisma } from 'wasp/server'

import { getMyTestAttempts } from '../../../../../src/queries/tests'


export default async function (args, context) {
  return (getMyTestAttempts as any)(args, {
    ...context,
    entities: {
      TestAttempt: prisma.testAttempt,
      Test: prisma.test,
    },
  })
}

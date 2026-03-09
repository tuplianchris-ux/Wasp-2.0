import { prisma } from 'wasp/server'

import { getTests } from '../../../../../src/queries/tests'


export default async function (args, context) {
  return (getTests as any)(args, {
    ...context,
    entities: {
      Test: prisma.test,
      TestAttempt: prisma.testAttempt,
    },
  })
}

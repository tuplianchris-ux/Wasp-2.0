import { prisma } from 'wasp/server'

import { submitTestAttempt } from '../../../../../src/actions/tests'


export default async function (args, context) {
  return (submitTestAttempt as any)(args, {
    ...context,
    entities: {
      TestAttempt: prisma.testAttempt,
      Test: prisma.test,
    },
  })
}

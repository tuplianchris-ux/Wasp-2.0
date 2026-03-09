import { prisma } from 'wasp/server'

import { createTest } from '../../../../../src/actions/tests'


export default async function (args, context) {
  return (createTest as any)(args, {
    ...context,
    entities: {
      Test: prisma.test,
    },
  })
}

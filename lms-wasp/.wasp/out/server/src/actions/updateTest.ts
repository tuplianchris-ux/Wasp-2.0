import { prisma } from 'wasp/server'

import { updateTest } from '../../../../../src/actions/tests'


export default async function (args, context) {
  return (updateTest as any)(args, {
    ...context,
    entities: {
      Test: prisma.test,
    },
  })
}

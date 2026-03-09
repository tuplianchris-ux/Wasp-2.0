import { prisma } from 'wasp/server'

import { deleteTest } from '../../../../../src/actions/tests'


export default async function (args, context) {
  return (deleteTest as any)(args, {
    ...context,
    entities: {
      Test: prisma.test,
    },
  })
}

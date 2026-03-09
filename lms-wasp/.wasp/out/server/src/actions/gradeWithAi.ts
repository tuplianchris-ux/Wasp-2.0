import { prisma } from 'wasp/server'

import { gradeWithAi } from '../../../../../src/actions/ai'


export default async function (args, context) {
  return (gradeWithAi as any)(args, {
    ...context,
    entities: {
    },
  })
}

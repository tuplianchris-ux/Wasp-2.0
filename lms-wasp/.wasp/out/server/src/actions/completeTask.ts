import { prisma } from 'wasp/server'

import { completeTask } from '../../../../../src/actions/tasks'


export default async function (args, context) {
  return (completeTask as any)(args, {
    ...context,
    entities: {
      Task: prisma.task,
    },
  })
}

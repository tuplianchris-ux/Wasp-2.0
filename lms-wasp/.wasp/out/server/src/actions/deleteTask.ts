import { prisma } from 'wasp/server'

import { deleteTask } from '../../../../../src/actions/tasks'


export default async function (args, context) {
  return (deleteTask as any)(args, {
    ...context,
    entities: {
      Task: prisma.task,
    },
  })
}

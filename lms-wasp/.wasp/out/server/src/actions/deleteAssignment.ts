import { prisma } from 'wasp/server'

import { deleteAssignment } from '../../../../../src/actions/assignments'


export default async function (args, context) {
  return (deleteAssignment as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
    },
  })
}

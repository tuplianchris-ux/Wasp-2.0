import { prisma } from 'wasp/server'

import { createAssignment } from '../../../../../src/actions/assignments'


export default async function (args, context) {
  return (createAssignment as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
    },
  })
}

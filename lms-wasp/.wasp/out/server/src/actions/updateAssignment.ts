import { prisma } from 'wasp/server'

import { updateAssignment } from '../../../../../src/actions/assignments'


export default async function (args, context) {
  return (updateAssignment as any)(args, {
    ...context,
    entities: {
      Assignment: prisma.assignment,
    },
  })
}

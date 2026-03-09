import { prisma } from 'wasp/server'

import { submitAssignment } from '../../../../../src/actions/assignments'


export default async function (args, context) {
  return (submitAssignment as any)(args, {
    ...context,
    entities: {
      Submission: prisma.submission,
    },
  })
}

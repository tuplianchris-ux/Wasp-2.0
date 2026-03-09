import { prisma } from 'wasp/server'

import { gradeSubmission } from '../../../../../src/actions/submissions'


export default async function (args, context) {
  return (gradeSubmission as any)(args, {
    ...context,
    entities: {
      Submission: prisma.submission,
    },
  })
}

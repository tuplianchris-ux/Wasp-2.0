import { prisma } from 'wasp/server'

import { getAiStudyGuide } from '../../../../../src/actions/ai'


export default async function (args, context) {
  return (getAiStudyGuide as any)(args, {
    ...context,
    entities: {
    },
  })
}

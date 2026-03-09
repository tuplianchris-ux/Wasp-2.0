import { prisma } from 'wasp/server'

import { createLibraryItem } from '../../../../../src/actions/library'


export default async function (args, context) {
  return (createLibraryItem as any)(args, {
    ...context,
    entities: {
      LibraryItem: prisma.libraryItem,
    },
  })
}

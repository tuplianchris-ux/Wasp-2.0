import { prisma } from 'wasp/server'

import { deleteLibraryItem } from '../../../../../src/actions/library'


export default async function (args, context) {
  return (deleteLibraryItem as any)(args, {
    ...context,
    entities: {
      LibraryItem: prisma.libraryItem,
    },
  })
}

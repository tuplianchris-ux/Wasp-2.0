import { prisma } from 'wasp/server'

import { getLibraryItems } from '../../../../../src/queries/library'


export default async function (args, context) {
  return (getLibraryItems as any)(args, {
    ...context,
    entities: {
      LibraryItem: prisma.libraryItem,
      User: prisma.user,
    },
  })
}

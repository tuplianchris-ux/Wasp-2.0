import type { CreateLibraryItem, DeleteLibraryItem } from "wasp/server/operations";
import { requireTeacher } from "../lib/authGuards";

type CreateLibraryItemInput = {
  title: string;
  type: string;
  url: string;
  tags: string[];
};

type DeleteLibraryItemInput = { id: string };

export const createLibraryItem: CreateLibraryItem<CreateLibraryItemInput, any> = async (
  { title, type, url, tags },
  context
) => {
  requireTeacher(context);
  const item = await context.entities.LibraryItem.create({
    data: {
      title,
      type,
      url,
      tags: JSON.stringify(tags ?? []),
      userId: context.user.id,
    },
  });

  return { ...item, tags: tags ?? [] };
};

export const deleteLibraryItem: DeleteLibraryItem<DeleteLibraryItemInput, void> = async (
  { id },
  context
) => {
  requireTeacher(context);
  await context.entities.LibraryItem.delete({ where: { id } });
};

import { reader } from '@/lib/keystatic/reader';
import { extractCards, type ExtractedCard } from '@/lib/card-extract';
import { extractObjects, type ExtractedObject } from '@/lib/object-extract';

// A card as another part of the wiki sees it: what a Ref to it shows in its
// hover preview, and which page it is on.
export type CardInfo = ExtractedCard & { slug: string; pageTitle: string };
export type CardLookup = Record<string, CardInfo>;

let lookup: Promise<CardLookup> | undefined;

// Every card with a reference code, on every page, by code. Read once per
// build or server start, like the rest of the content.
export function getCardLookup(): Promise<CardLookup> {
  lookup ??= (async () => {
    const result: CardLookup = {};
    for (const { slug, entry } of await reader.collections.pages.all()) {
      for (const card of extractCards(await entry.content())) {
        if (card.refId in result) {
          console.warn(
            `[cards] Reference code "${card.refId}" is on more than one card; references go to the first. Press "New code" on the copy in the editor.`,
          );
          continue;
        }
        result[card.refId] = { ...card, slug, pageTitle: entry.title.trim() };
      }
    }
    return result;
  })();
  return lookup;
}

// A numbered figure, table or model as another page sees it: what a Ref to
// it shows, and which page it is on.
export type ObjectInfo = ExtractedObject & { slug: string; pageTitle: string };
export type ObjectLookup = Record<string, ObjectInfo>;

let objects: Promise<ObjectLookup> | undefined;

// Every numbered object with a reference code, on every page, by code.
// Codes repeated within a page are copies (a Ref goes to the first, as on
// the page itself, which warns); one on two pages goes to the first page.
export function getObjectLookup(): Promise<ObjectLookup> {
  objects ??= (async () => {
    const result: ObjectLookup = {};
    for (const { slug, entry } of await reader.collections.pages.all()) {
      for (const object of extractObjects(await entry.content())) {
        if (object.refId in result) continue;
        result[object.refId] = { ...object, slug, pageTitle: entry.title.trim() };
      }
    }
    return result;
  })();
  return objects;
}

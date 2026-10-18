import { reader } from '@/lib/keystatic/reader';
import { extractCards, type ExtractedCard } from '@/lib/card-extract';

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

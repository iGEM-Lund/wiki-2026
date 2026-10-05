'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { SearchPage } from '@/lib/search-index';
import { search, toRecords, type SearchRecord, type SearchTarget, type Segment } from '@/lib/search';
import { revealSearchHit } from '@/lib/reveal-search-hit';

// Served as a static file by src/app/search-index.json/route.ts; the
// production export lives under a basePath that fetch() doesn't add itself.
const INDEX_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/search-index.json`;

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function Highlighted({ segments }: { segments: Segment[] }) {
  return segments.map((segment, i) => (segment.mark ? <mark key={i}>{segment.text}</mark> : segment.text));
}

// Strips the trailing slash the production export adds (trailingSlash is
// on there only), as NavLink does.
function normalize(path: string) {
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

// Whole-site search in a modal dialog, opened from the sidebar button,
// Ctrl/Cmd+K or "/". The index is fetched on first open rather than with
// the page, so visitors who never search never download it. Picking a
// result lands on the matched word itself, not just its section.
export function SiteSearch() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const loadingRef = useRef(false);
  // A result picked on another page, revealed once that page has rendered.
  const pendingRef = useRef<SearchTarget | null>(null);
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [shortcut, setShortcut] = useState('Ctrl K');
  const router = useRouter();
  const pathname = usePathname();

  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => (records ? search(records, deferredQuery) : []), [records, deferredQuery]);
  // Reset on each keystroke (see the input's onChange), not when the
  // deferred query catches up, which could undo an arrow press made in
  // between; the clamp covers a result list that shrank meanwhile.
  const selected = Math.min(active, Math.max(results.length - 1, 0));

  function load() {
    if (records || loadingRef.current) return;
    loadingRef.current = true;
    setFailed(false);
    fetch(INDEX_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<SearchPage[]>;
      })
      .then((pages) => setRecords(toRecords(pages)))
      .catch(() => setFailed(true))
      .finally(() => {
        loadingRef.current = false;
      });
  }

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    inputRef.current?.select();
    load();
  }

  function close() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('⌘ K');
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      if (isShortcut || (event.key === '/' && !isTypingTarget(event.target))) {
        event.preventDefault();
        open();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  function go(target: SearchTarget) {
    close();
    if (normalize(pathname) === target.path) {
      revealSearchHit(target);
      return;
    }
    pendingRef.current = target;
    router.push(target.path);
  }

  // Any navigation closes the dialog. After one to a picked result, the
  // next frame is after Next's own scroll to the top of the new page, so
  // the jump to the match isn't undone.
  useEffect(() => {
    close();
    const target = pendingRef.current;
    if (!target || normalize(pathname) !== target.path) return;
    pendingRef.current = null;
    requestAnimationFrame(() => revealSearchHit(target));
  }, [pathname]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((selected + step + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[selected].target);
    }
  }

  const trimmed = deferredQuery.trim();
  let status: string | null = null;
  if (failed) status = 'Search could not be loaded. Close and try again.';
  else if (!records) status = 'Loading…';
  else if (!trimmed) status = 'Type to search every page of the wiki.';
  else if (results.length === 0) status = `No results for "${trimmed}".`;

  return (
    <>
      <button type="button" className="site__search-trigger" onClick={open} aria-label="Search the wiki">
        <Search size={18} />
        <span className="site__search-label">Search</span>
        <kbd className="site__search-kbd">{shortcut}</kbd>
      </button>
      <dialog
        ref={dialogRef}
        className="site-search"
        aria-label="Search the wiki"
        // A click on the dialog element itself (not its contents) is a
        // click on the backdrop around the panel.
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="site-search__bar">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            // Not type="search": in Chrome its first Escape only clears the
            // text, so closing the dialog would take two presses.
            type="text"
            enterKeyHint="search"
            className="site-search__input"
            placeholder="Search the wiki"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="site-search-results"
            aria-activedescendant={results.length > 0 ? `site-search-result-${selected}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="site-search__close" onClick={close} aria-label="Close search">
            <X size={18} />
          </button>
        </div>
        {status ? (
          <p className="site-search__status" role="status">
            {status}
          </p>
        ) : null}
        <ul ref={listRef} id="site-search-results" role="listbox" className="site-search__results">
          {results.map((result, i) => (
            <li key={result.href} role="presentation">
              <Link
                href={result.href}
                id={`site-search-result-${i}`}
                role="option"
                aria-selected={i === selected}
                className="site-search__result"
                onMouseMove={() => setActive(i)}
                onClick={(event) => {
                  // Modified clicks open the section in a new tab via href.
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  go(result.target);
                }}
              >
                <span className="site-search__result-path">
                  <Highlighted segments={result.pageTitle} />
                  {result.heading ? (
                    <>
                      <span className="site-search__result-sep" aria-hidden="true">
                        {' › '}
                      </span>
                      <Highlighted segments={result.heading} />
                    </>
                  ) : null}
                </span>
                {result.snippet.length > 0 ? (
                  <span className="site-search__result-snippet">
                    <Highlighted segments={result.snippet} />
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}

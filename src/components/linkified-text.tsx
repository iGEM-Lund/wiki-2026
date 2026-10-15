// Plain text with every http(s) URL in it turned into a link, e.g. the DOI
// at the end of a bibliography entry's long form.
const URL_PATTERN = /https?:\/\/[^\s<>"]+/g;
// Punctuation that ends the sentence around a URL rather than the URL itself.
const TRAILING_PUNCTUATION = /[.,;:!?'\]]+$/;

function trimUrl(raw: string): string {
  let url = raw.replace(TRAILING_PUNCTUATION, '');
  // A closing parenthesis belongs to the URL only if it opened one too.
  while (url.endsWith(')') && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
  }
  return url;
}

export function LinkifiedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    const start = match.index;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a key={start} href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>,
    );
    last = start + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

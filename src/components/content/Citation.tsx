type CitationProps = {
  id?: string;
};

// Stub: renders a bracketed reference marker. No bibliography-management
// or cross-page reference resolution is implemented yet.
export function Citation({ id }: CitationProps) {
  return <sup className="citation">[{id}]</sup>;
}

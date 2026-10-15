// A figure's alt text plus whether the figure is decorative, as the editor
// holds it. Kept apart from alt-text-field.tsx so the input can use it.
export type AltTextValue = { decorative: boolean; text: string };

export function altTextError(value: AltTextValue): string | undefined {
  if (value.decorative || value.text.trim()) return undefined;
  return 'Alt text is required unless the figure is decorative.';
}

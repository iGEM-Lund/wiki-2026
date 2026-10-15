import type { BasicFormField, FormFieldStoredValue } from '@keystatic/core';
import { AltTextInput } from './alt-text-input';
import { altTextError, type AltTextValue } from './alt-text-value';

function parseAltText(value: FormFieldStoredValue | null): AltTextValue {
  if (typeof value === 'string') return { decorative: false, text: value };
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    const { decorative, text } = value as { decorative?: unknown; text?: unknown };
    return { decorative: decorative === true, text: typeof text === 'string' ? text : '' };
  }
  return { decorative: false, text: '' };
}

// A figure's alt text with a Decorative box in front of it. Ticking the box
// switches the alt text off (and its requirement with it) without throwing
// away what was typed. No fields.* builtin can disable one field from
// another, hence one custom field holding both. A described figure is stored
// as a plain string, as before; a decorative one as { decorative: true, text }
// (the site reads both, see readAlt in src/components/content/MissingAltBanner.tsx).
export function altTextField(description: string): BasicFormField<AltTextValue> {
  return {
    kind: 'form',
    label: 'Alt text',
    Input: (props) => <AltTextInput {...props} description={description} />,
    defaultValue: () => ({ decorative: false, text: '' }),
    parse: parseAltText,
    serialize: (value) => ({
      value: value.decorative ? { decorative: true, ...(value.text ? { text: value.text } : {}) } : value.text || undefined,
    }),
    validate: (value) => {
      const error = altTextError(value);
      if (error) throw new Error(error);
      return value;
    },
    reader: { parse: parseAltText },
  };
}

import type { BasicFormField } from '@keystatic/core';
import { RefIdInput } from './ref-id-input';

// What a numbered object's code starts with, so a code pasted into a
// Reference reads as what it points at. Only a reading aid: references are
// resolved by the whole code (see src/lib/numbering.ts).
export type RefIdPrefix = 'fig' | 'tab' | 'mod' | 'card';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function newRefId(prefix: RefIdPrefix): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `${prefix}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

// A figure, table, 3D model or card's reference code: made up once when the
// object is inserted, and never derived from its number, so a reference
// keeps pointing at the same object however the objects around it move.
// No fields.* builtin can mint a value, hence a custom field.
export function refIdField(prefix: RefIdPrefix): BasicFormField<string> {
  return {
    kind: 'form',
    label: 'Reference code',
    Input: (props) => <RefIdInput {...props} onNewCode={() => props.onChange(newRefId(prefix))} />,
    defaultValue: () => newRefId(prefix),
    // An object written before codes existed (or by hand) gets one here;
    // it is saved with the page the next time it is saved.
    parse: (value) => (typeof value === 'string' && value ? value : newRefId(prefix)),
    serialize: (value) => ({ value }),
    validate: (value) => value,
    reader: {
      parse: (value) => (typeof value === 'string' ? value : ''),
    },
  };
}

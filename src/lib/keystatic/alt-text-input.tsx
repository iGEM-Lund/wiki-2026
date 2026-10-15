'use client';

import { Checkbox } from '@keystar/ui/checkbox';
import { Flex } from '@keystar/ui/layout';
import { TextField } from '@keystar/ui/text-field';
import { Text } from '@keystar/ui/typography';
import type { FormFieldInputProps } from '@keystatic/core';
import { altTextError, type AltTextValue } from './alt-text-value';

// The editor side of alt-text-field.tsx, split out like ref-id-input.tsx
// because keystatic.config.ts (and so that field) is also read on the server.
export function AltTextInput({
  value,
  onChange,
  autoFocus,
  forceValidation,
  description,
}: FormFieldInputProps<AltTextValue> & { description: string }) {
  const error = forceValidation ? altTextError(value) : undefined;
  return (
    <Flex direction="column" gap="regular">
      <Checkbox isSelected={value.decorative} onChange={(decorative) => onChange({ ...value, decorative })}>
        <Text>Decorative</Text>
      </Checkbox>
      <Text size="small" color="neutralSecondary">
        Tick only for images that add nothing a reader would miss, like ornaments, background textures or
        placeholder icons. This removes the alt text requirement: the alt text below is switched off and the
        site gives the image empty alt text, so screen readers skip it. Photos of events, people, results or
        diagrams are never decorative.
      </Text>
      <TextField
        label="Alt text"
        description={description}
        value={value.text}
        onChange={(text) => onChange({ ...value, text })}
        autoFocus={autoFocus}
        isDisabled={value.decorative}
        errorMessage={error}
      />
    </Flex>
  );
}

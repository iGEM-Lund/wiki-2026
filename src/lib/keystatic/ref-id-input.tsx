'use client';

import { useState } from 'react';
import { ActionButton } from '@keystar/ui/button';
import { Icon } from '@keystar/ui/icon';
import { copyIcon } from '@keystar/ui/icon/icons/copyIcon';
import { copyCheckIcon } from '@keystar/ui/icon/icons/copyCheckIcon';
import { refreshCwIcon } from '@keystar/ui/icon/icons/refreshCwIcon';
import { Flex } from '@keystar/ui/layout';
import { TextField } from '@keystar/ui/text-field';
import { Text } from '@keystar/ui/typography';

// The editor side of ref-id-field.tsx, split out because it holds state:
// keystatic.config.ts (and so that field) is also read on the server.
export function RefIdInput({ value, onNewCode }: { value: string; onNewCode: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Flex direction="column" gap="regular">
      <TextField
        label="Reference code"
        description="To mention this in the text, insert a Reference there and paste this code into it. The number is worked out automatically. If you copied this from another object on the page, press New code so each has its own."
        value={value}
        isReadOnly
      />
      <Flex gap="regular">
        <ActionButton
          onPress={() => {
            void navigator.clipboard.writeText(value).then(() => setCopied(true));
          }}
        >
          <Icon src={copied ? copyCheckIcon : copyIcon} />
          <Text>{copied ? 'Copied' : 'Copy'}</Text>
        </ActionButton>
        <ActionButton
          onPress={() => {
            onNewCode();
            setCopied(false);
          }}
        >
          <Icon src={refreshCwIcon} />
          <Text>New code</Text>
        </ActionButton>
      </Flex>
    </Flex>
  );
}

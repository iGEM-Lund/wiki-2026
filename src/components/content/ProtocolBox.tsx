import type { ReactNode } from 'react';

type ProtocolBoxProps = {
  title?: string;
  children?: ReactNode;
};

export function ProtocolBox({ title, children }: ProtocolBoxProps) {
  return (
    <div className="protocol-box">
      {title ? <h3 className="protocol-box__title">{title}</h3> : null}
      <div className="protocol-box__body">{children}</div>
    </div>
  );
}

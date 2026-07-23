type CalloutProps = {
  tone?: 'info' | 'warning' | 'success';
  text?: string;
};

export function Callout({ tone = 'info', text }: CalloutProps) {
  return <div className={`callout callout--${tone}`}>{text}</div>;
}

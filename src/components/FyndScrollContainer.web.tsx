import React from 'react';
import { CSSProperties } from 'react';

type Props = {
  children: React.ReactNode;
  style?: any;
  contentContainerStyle?: any;
};

function flattenStyle(input: any): Record<string, any> {
  if (!input) return {};
  if (Array.isArray(input)) {
    return input.reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
  }
  if (typeof input === 'object') return input;
  return {};
}

export default function FyndScrollContainer({ children, style, contentContainerStyle }: Props) {
  const outer = flattenStyle(style);
  const inner = flattenStyle(contentContainerStyle);

  const outerCss: CSSProperties = {
    ...outer,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
  };

  const innerCss: CSSProperties = {
    ...inner,
    maxWidth: '100%',
    overflowX: 'hidden',
  };

  return (
    <div style={outerCss}>
      <div style={innerCss}>{children}</div>
    </div>
  );
}

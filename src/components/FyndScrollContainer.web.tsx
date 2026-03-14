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
  if (typeof input === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      switch (key) {
        case 'paddingHorizontal': result.paddingLeft = val; result.paddingRight = val; break;
        case 'paddingVertical': result.paddingTop = val; result.paddingBottom = val; break;
        case 'marginHorizontal': result.marginLeft = val; result.marginRight = val; break;
        case 'marginVertical': result.marginTop = val; result.marginBottom = val; break;
        default: result[key] = val;
      }
    }
    return result;
  }
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

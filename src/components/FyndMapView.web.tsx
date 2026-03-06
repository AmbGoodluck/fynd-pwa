/**
 * FyndMapView.web.tsx — WEB BROWSER
 *
 * Metro picks this file automatically for web builds instead of
 * FyndMapView.tsx. It renders an <iframe> with the baked-in map HTML.
 *
 * Two-way communication bridge:
 *   • iframe → parent : window.ReactNativeWebView.postMessage is rewritten
 *                       to window.parent.postMessage before injection.
 *   • parent → iframe : injectJavaScript() sends a postMessage to the iframe
 *                       which evals it using an injected bridge listener.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

export type FyndMapViewRef = {
  injectJavaScript: (js: string) => void;
};

type Props = {
  html: string;
  style?: any;
  onMessage?: (data: string) => void;
};

// TypeScript cast so we can write <Iframe> JSX with DOM attributes.
// This file is browser-only (Metro .web.tsx resolution), so this is safe.
type IframeProps = {
  srcDoc: string;
  style: React.CSSProperties;
  sandbox: string;
  title: string;
};
const Iframe = 'iframe' as unknown as React.ComponentType<IframeProps & {
  ref?: React.Ref<HTMLIFrameElement>;
}>;

const BRIDGE_LISTENER = `
<script>
(function () {
  window.addEventListener('message', function (e) {
    // Only accept commands from the parent window
    if (e.source !== window.parent) return;
    if (typeof e.data !== 'string' || e.data === '') return;
    try {
      // Indirect eval runs in the iframe's global scope, where map functions
      // (setActiveStop, setUserLocation, showOverview …) are defined.
      // eslint-disable-next-line no-new-func
      (new Function(e.data.replace(/; true;$/, '')))();
    } catch (err) {
      // Silently ignore — map may not be initialised yet
    }
  });
})();
</script>`;

const FyndMapView = forwardRef<FyndMapViewRef, Props>(
  ({ html, style, onMessage }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    // ── parent → iframe : injectJavaScript ─────────────────────────────────
    useImperativeHandle(ref, () => ({
      injectJavaScript: (js: string) => {
        try {
          iframeRef.current?.contentWindow?.postMessage(js, '*');
        } catch {
          // Cross-origin guard (should not happen for srcDoc iframes)
        }
      },
    }));

    // ── iframe → parent : listen for postMessage events ─────────────────────
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        try {
          JSON.parse(event.data);   // only forward well-formed JSON
          onMessageRef.current?.(event.data);
        } catch {
          // Not the message we care about
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, []);

    // Patch the HTML:
    //   1. Replace ReactNativeWebView.postMessage → window.parent.postMessage
    //   2. Inject the bridge listener so injectJavaScript works
    const webHtml = html
      .replace(
        /window\.ReactNativeWebView\.postMessage\(/g,
        'window.parent.postMessage('
      )
      .replace('</body>', `${BRIDGE_LISTENER}\n</body>`);

    return (
      <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
        <Iframe
          ref={iframeRef as any}
          srcDoc={webHtml}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          sandbox="allow-scripts allow-same-origin"
          title="Fynd Map"
        />
      </View>
    );
  }
);

export default FyndMapView;

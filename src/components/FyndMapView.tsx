/**
 * FyndMapView.tsx — NATIVE (iOS / Android)
 *
 * Thin wrapper around react-native-webview that exposes the same interface
 * as the web counterpart (FyndMapView.web.tsx) so MapScreen can import a
 * single component regardless of platform.
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

export type FyndMapViewRef = {
  injectJavaScript: (js: string) => void;
};

type Props = {
  html: string;
  style?: StyleProp<ViewStyle>;
  onMessage?: (data: string) => void;
};

const FyndMapView = forwardRef<FyndMapViewRef, Props>(
  ({ html, style, onMessage }, ref) => {
    const wvRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      injectJavaScript: (js: string) => {
        wvRef.current?.injectJavaScript(js);
      },
    }));

    const handleMessage = (event: WebViewMessageEvent) => {
      onMessage?.(event.nativeEvent.data);
    };

    return (
      <WebView
        ref={wvRef}
        source={{ html }}
        style={style as any}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        mixedContentMode="always"
        // Cache the Google Maps JS script so subsequent loads are instant
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        onMessage={handleMessage}
      />
    );
  }
);

export default FyndMapView;

# Add project specific ProGuard rules here.
-keepattributes JavascriptInterface
-keepclassmembers class com.fynd.app.WebAppInterface {
    public *;
}
# Keep WebView JavaScript bridge
-keep class android.webkit.** { *; }

package io.github.heirsofruin.deadoralive;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;

/**
 * The whole app: one WebView showing the game's single-file build from the APK's
 * assets. The page is served from an https address inside the app (not file://)
 * so the browser storage the saves live in behaves as it does on the web.
 */
public class MainActivity extends Activity {
  static final String HOST = "appassets.androidplatform.net";
  private WebView web;

  @Override
  protected void onCreate(Bundle saved) {
    super.onCreate(saved);
    web = new WebView(this);
    WebSettings st = web.getSettings();
    st.setJavaScriptEnabled(true);
    st.setDomStorageEnabled(true);
    web.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
        Uri u = req.getUrl();
        if (!HOST.equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        try {
          InputStream in = getAssets().open(path.substring(1));
          String mime = path.endsWith(".png") ? "image/png" : path.endsWith(".json") ? "application/json" : "text/html";
          return new WebResourceResponse(mime, "utf-8", in);
        } catch (Exception e) {
          return null;
        }
      }

      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
        Uri u = req.getUrl();
        if (HOST.equals(u.getHost())) return false;
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* no browser */ }
        return true;
      }
    });
    setContentView(web);
    if (saved != null) web.restoreState(saved);
    else web.loadUrl("https://" + HOST + "/index.html");
  }

  @Override
  protected void onSaveInstanceState(Bundle out) {
    super.onSaveInstanceState(out);
    web.saveState(out);
  }

  @Override
  public void onBackPressed() {
    if (web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override
  protected void onPause() { web.onPause(); super.onPause(); }

  @Override
  protected void onResume() { super.onResume(); web.onResume(); }
}

package android.webkit;
public class WebView extends android.view.View {
  public WebView(android.content.Context c) { super(c); }
  public WebSettings getSettings() { return null; } public void setWebViewClient(WebViewClient c) {}
  public void loadUrl(String u) {} public WebBackForwardList restoreState(android.os.Bundle b) { return null; }
  public WebBackForwardList saveState(android.os.Bundle b) { return null; }
  public boolean canGoBack() { return false; } public void goBack() {} public void onPause() {} public void onResume() {}
}

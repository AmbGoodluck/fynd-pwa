import UIKit
import WebKit

class WebViewController: UIViewController {
    private static let webAppURL = URL(string: "https://fynd.app")!

    private var webView: WKWebView!
    private var progressView: UIProgressView!
    private var refreshControl: UIRefreshControl!
    private var progressObservation: NSKeyValueObservation?

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupWebView()
        setupProgressView()
        setupRefreshControl()
        loadWebApp()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView.frame = view.bounds
        progressView.frame = CGRect(
            x: 0,
            y: view.safeAreaInsets.top,
            width: view.bounds.width,
            height: 2
        )
    }

    deinit {
        progressObservation?.invalidate()
    }

    // MARK: - Setup

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // Enable data storage
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        // Custom user agent
        webView.customUserAgent = nil // use default, append Fynd identifier
        webView.evaluateJavaScript("navigator.userAgent") { [weak self] result, _ in
            if let ua = result as? String {
                self?.webView.customUserAgent = ua + " FyndApp/1.0"
            }
        }

        view.addSubview(webView)
    }

    private func setupProgressView() {
        progressView = UIProgressView(progressViewStyle: .bar)
        progressView.progressTintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
        progressView.trackTintColor = .clear
        view.addSubview(progressView)

        progressObservation = webView.observe(\.estimatedProgress, options: .new) { [weak self] webView, _ in
            guard let self = self else { return }
            let progress = Float(webView.estimatedProgress)
            self.progressView.setProgress(progress, animated: true)
            self.progressView.isHidden = progress >= 1.0
        }
    }

    private func setupRefreshControl() {
        refreshControl = UIRefreshControl()
        refreshControl.tintColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
    }

    // MARK: - Actions

    private func loadWebApp() {
        let request = URLRequest(
            url: Self.webAppURL,
            cachePolicy: .useProtocolCachePolicy
        )
        webView.load(request)
    }

    @objc private func handleRefresh() {
        webView.reload()
    }

    private func showErrorView() {
        let errorVC = ErrorViewController()
        errorVC.onRetry = { [weak self] in
            self?.dismiss(animated: true)
            self?.loadWebApp()
        }
        errorVC.modalPresentationStyle = .fullScreen
        present(errorVC, animated: false)
    }
}

// MARK: - WKNavigationDelegate

extension WebViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        let urlString = url.absoluteString

        // Handle Google Maps links
        if urlString.contains("maps.google.com") ||
           urlString.contains("google.com/maps") ||
           urlString.hasPrefix("comgooglemaps://") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            } else {
                // Fallback to Apple Maps
                let coordinate = urlString
                if let mapsURL = URL(string: "http://maps.apple.com/?\(coordinate)") {
                    UIApplication.shared.open(mapsURL)
                }
            }
            decisionHandler(.cancel)
            return
        }

        // Keep internal navigation within the WebView
        if urlString.contains("fynd.app") {
            decisionHandler(.allow)
            return
        }

        // Open external links in Safari
        if navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        didFinish navigation: WKNavigation!
    ) {
        refreshControl.endRefreshing()
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        refreshControl.endRefreshing()
        let nsError = error as NSError
        // Don't show error for cancelled requests (e.g. rapid navigation)
        if nsError.code == NSURLErrorCancelled { return }
        showErrorView()
    }
}

// MARK: - WKUIDelegate

extension WebViewController: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        // Handle target="_blank" links
        if navigationAction.targetFrame == nil,
           let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }
}

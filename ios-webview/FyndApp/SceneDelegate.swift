import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let webVC = WebViewController()
        let nav = UINavigationController(rootViewController: webVC)
        nav.isNavigationBarHidden = true
        window.rootViewController = nav
        self.window = window
        window.makeKeyAndVisible()
    }
}

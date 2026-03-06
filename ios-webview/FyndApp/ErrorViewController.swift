import UIKit

class ErrorViewController: UIViewController {
    var onRetry: (() -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        setupUI()
    }

    private func setupUI() {
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.alignment = .center
        stackView.spacing = 16
        stackView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stackView)

        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 40),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -40),
        ])

        // Icon
        let iconConfig = UIImage.SymbolConfiguration(pointSize: 60, weight: .light)
        let iconImage = UIImage(systemName: "wifi.slash", withConfiguration: iconConfig)
        let iconView = UIImageView(image: iconImage)
        iconView.tintColor = UIColor(red: 229/255, green: 229/255, blue: 234/255, alpha: 1)
        stackView.addArrangedSubview(iconView)

        // Title
        let titleLabel = UILabel()
        titleLabel.text = "No Internet Connection"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = UIColor(red: 17/255, green: 24/255, blue: 39/255, alpha: 1)
        stackView.addArrangedSubview(titleLabel)

        // Subtitle
        let subtitleLabel = UILabel()
        subtitleLabel.text = "Please check your network connection and try again."
        subtitleLabel.font = .systemFont(ofSize: 14)
        subtitleLabel.textColor = UIColor(red: 107/255, green: 114/255, blue: 128/255, alpha: 1)
        subtitleLabel.textAlignment = .center
        subtitleLabel.numberOfLines = 0
        stackView.addArrangedSubview(subtitleLabel)

        // Retry button
        let retryButton = UIButton(type: .system)
        retryButton.setTitle("Try Again", for: .normal)
        retryButton.setTitleColor(.white, for: .normal)
        retryButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        retryButton.backgroundColor = UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1)
        retryButton.layer.cornerRadius = 14
        retryButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 40, bottom: 14, right: 40)
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)

        stackView.setCustomSpacing(24, after: subtitleLabel)
        stackView.addArrangedSubview(retryButton)
    }

    @objc private func retryTapped() {
        onRetry?()
    }
}

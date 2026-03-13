// metro.config.js — ensures @expo/vector-icons fonts and all assets are bundled correctly
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all font file extensions are recognised
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Zustand v5 (and other packages) ship ESM .mjs files that contain
// `import.meta` syntax. Metro bundles for web as a classic <script> (not
// type="module"), so the browser throws a parse-time SyntaxError before any
// code runs. Remove the "import" condition so Metro always resolves to the
// CommonJS build instead of the ESM build.
if (config.resolver.unstable_conditionsByPlatform) {
  const webConditions = config.resolver.unstable_conditionsByPlatform['web'] ?? [];
  config.resolver.unstable_conditionsByPlatform['web'] = webConditions.filter(
    (c) => c !== 'import'
  );
} else {
  // Disable package exports resolution entirely as a fallback — this makes
  // Metro use the traditional "main" field, which always points to CJS.
  config.resolver.unstable_enablePackageExports = false;
}

// Disable multipart bundle streaming — avoids OkHttp ChunkedSource ProtocolException
// in BundleDownloader.processMultipartResponse (RN 0.83 + Expo dev client)
config.server = {
  ...config.server,
  experimentalImportBundleSupport: false,
};

module.exports = config;

// metro.config.js — ensures @expo/vector-icons fonts and all assets are bundled correctly
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all font file extensions are recognised
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Disable multipart bundle streaming — avoids OkHttp ChunkedSource ProtocolException
// in BundleDownloader.processMultipartResponse (RN 0.83 + Expo dev client)
config.server = {
  ...config.server,
  experimentalImportBundleSupport: false,
};

module.exports = config;

// metro.config.js — ensures @expo/vector-icons fonts and all assets are bundled correctly
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all font file extensions are recognised
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

module.exports = config;

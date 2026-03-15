const fs = require('fs');
const path = require('path');

// 1. Copy static assets
const cp = (s, d) => fs.copyFileSync(s, d);
cp('feedback/privacy-policy.html', 'dist/privacy-policy.html');
cp('feedback/terms.html', 'dist/terms.html');
cp('public/_redirects', 'dist/_redirects');
cp('public/_headers', 'dist/_headers');
cp('public/manifest.json', 'dist/manifest.json');
cp('public/service-worker.js', 'dist/service-worker.js');
cp('assets/logo-icon.png', 'dist/icon.png');
fs.mkdirSync('dist/fonts', { recursive: true });
cp('node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf', 'dist/fonts/Ionicons.ttf');
cp('node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf', 'dist/fonts/Inter_400Regular.ttf');
cp('node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf', 'dist/fonts/Inter_500Medium.ttf');
cp('node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf', 'dist/fonts/Inter_600SemiBold.ttf');
cp('node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf', 'dist/fonts/Inter_700Bold.ttf');
console.log('Post-build assets copied.');

// 2. Patch index.html — add PWA tags, fix script tag (type=module, no defer, no duplicates)
let html = fs.readFileSync('dist/index.html', 'utf8');

// Remove any existing link tags we may have added before (prevent duplicates)
html = html.replace(/<link rel="icon" href="\/favicon\.ico" \/>\s*/g, '');
html = html.replace(/<link rel="apple-touch-icon" href="\/icon\.png" \/>\s*/g, '');
html = html.replace(/<link rel="manifest" href="\/manifest\.json" \/>\s*/g, '');

// Add PWA links once, just before </head>
html = html.replace('</head>', [
  '  <link rel="icon" href="/favicon.ico" />',
  '  <link rel="apple-touch-icon" href="/icon.png" />',
  '  <link rel="manifest" href="/manifest.json" />',
  '</head>',
].join('\n'));

// Fix script tag: ensure type="module" and remove defer
html = html
  .replace(/<script src="(\/_expo[^"]+)"([^>]*)><\/script>/,
    '<script type="module" src="$1"></script>')
  .replace(/<script type="module" src="(\/_expo[^"]+)" defer><\/script>/,
    '<script type="module" src="$1"></script>');

fs.writeFileSync('dist/index.html', html);
console.log('index.html patched.');

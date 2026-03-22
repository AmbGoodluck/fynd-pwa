module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Polyfill import.meta → globalThis.__ExpoImportMetaRegistry so the
          // Metro web bundle (served as a classic <script>, not type="module")
          // doesn't throw "Cannot use 'import.meta' outside a module".
          unstable_transformImportMeta: true,
        },
      ],
    ],
  };
};

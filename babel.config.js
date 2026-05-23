module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Force hermes-v0 transform profile which includes transforms for
          // private class properties/methods that Expo Go's Hermes doesn't
          // support natively yet.
          unstable_transformProfile: 'hermes-v0',
        },
      ],
    ],
    plugins: [
      'react-native-reanimated/plugin', // Must be listed last
    ],
  };
};

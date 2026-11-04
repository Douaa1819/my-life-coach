const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');
const reanimatedResolver = require('react-native-reanimated/jest/resolver');

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const { defaultResolver } = options;
  return reanimatedResolver(request, {
    ...options,
    defaultResolver: (nextRequest, nextOptions) =>
      reactNativeResolver(nextRequest, { ...nextOptions, defaultResolver }),
  });
};

module.exports = {
  preset: 'react-native',
  // React Navigation and the RN libraries publish untranspiled ESM; let Babel
  // transform them instead of Jest choking on `export`.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-native-picker|@react-navigation|react-native-.*)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};

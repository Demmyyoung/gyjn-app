const path = require('path');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const projectRoot = __dirname; // C:\Users\demil\OneDrive\Documents\GYJN\gyjn-app

const config = getSentryExpoConfig(projectRoot);

// Force Metro to only look inside gyjn-app, not the parent GYJN folder
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
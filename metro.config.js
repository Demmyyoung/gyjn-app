// metro.config.js
// Explicitly sets the project root to THIS folder so Metro doesn't
// get confused by the package-lock.json sitting in the parent GYJN folder.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname; // C:\Users\demil\OneDrive\Documents\GYJN\gyjn-app

const config = getDefaultConfig(projectRoot);

// Force Metro to only look inside gyjn-app, not the parent GYJN folder
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;

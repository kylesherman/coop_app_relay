// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// ✅ Watch only the app and components directories
config.watchFolders = [
  path.join(projectRoot, "app"),
  path.join(projectRoot, "components"),
  path.join(projectRoot, "styles"),
];

// ✅ Explicitly ignore massive folders
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /\.git\/.*/,
];

module.exports = config;
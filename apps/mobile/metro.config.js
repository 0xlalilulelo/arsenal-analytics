const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve modules from workspace root first, then project root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Block Metro from crawling into other apps' node_modules.
// apps/web installs React 19 (for Next.js) which would shadow the React 18
// at the workspace root, breaking native module initialisation in Expo Go.
const { exclusionList } = require('metro-config');
config.resolver.blockList = exclusionList([
  new RegExp(
    `${path.resolve(workspaceRoot, 'apps/web/node_modules').replace(/\\/g, '\\\\')}.*`,
  ),
]);

module.exports = config;

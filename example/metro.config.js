const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "..");
const config = getDefaultConfig(__dirname);

// The example runs the library from ../src, live. Its dependencies (React,
// Reanimated, Teleport...) must come from this app's node_modules only: the
// library's own node_modules hold dev copies that would load a second React.
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${escape(path.join(root, "node_modules"))}\\/.*$`),
];

const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-teletoast") {
    return { type: "sourceFile", filePath: path.join(root, "src/index.ts") };
  }
  return (resolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;

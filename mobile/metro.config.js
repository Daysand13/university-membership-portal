const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/**
 * Keeping the app's dependencies to the app's own folder.
 *
 * This project sits inside the website's repository, and the website has
 * its own React — a different version, for a different renderer. Metro
 * looks for a package in the current folder and then walks upwards, so
 * without this it would find node_modules at the repository root and a
 * build could end up with two copies of React in it, which fails in ways
 * that look nothing like their cause.
 *
 * `disableHierarchicalLookup` is the switch that stops the walk. Nothing
 * outside this folder is watched or resolved.
 */
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

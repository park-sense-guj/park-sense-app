const { withPodfileProperties, withXcodeProject } = require('expo/config-plugins');

const PRIVATE_FRAMEWORKS = ['SwiftUICore', 'UIUtilities'];
const STUB_FRAMEWORK_SEARCH = '"$(PODS_ROOT)/../../plugins/stubs/frameworks"';

function withDisabledAutolink(swiftFlags) {
  let flags = String(swiftFlags ?? '$(inherited)');
  for (const framework of PRIVATE_FRAMEWORKS) {
    if (!flags.includes(`-Xfrontend ${framework}`)) {
      flags += ` -Xfrontend -disable-autolink-framework -Xfrontend ${framework}`;
    }
  }
  return flags;
}

function withoutBrokenAutolinkLdFlag(ldFlags) {
  return ldFlags.filter((flag) => !String(flag).includes('no_autolink_framework'));
}

function withStubFrameworkSearchPaths(searchPaths) {
  const paths = Array.isArray(searchPaths) ? [...searchPaths] : [searchPaths ?? '$(inherited)'];
  if (!paths.some((p) => String(p).includes('plugins/stubs/frameworks'))) {
    paths.push(STUB_FRAMEWORK_SEARCH);
  }
  return paths;
}

/**
 * Xcode 26: UIKit subframeworks (SwiftUICore, UIUtilities) are autolinked
 * from Swift and from ObjC (e.g. RNGestureHandler) but are not public SDK
 * frameworks. Disable Swift autolink, give ld a local UIUtilities stub, and
 * skip ENABLE_DEBUG_DYLIB on the app.
 *
 * Also turn off expo-dev-client network inspect so the launcher does not
 * link RCTReconnectingWebSocket, which is missing from prebuilt React-Core.
 */
function withSwiftUICoreLinkFix(config) {
  config = withPodfileProperties(config, (mod) => {
    mod.modResults.EX_DEV_CLIENT_NETWORK_INSPECTOR = 'false';
    // Prebuilt React-Core hides Debug Fabric symbols (Sealable, etc.) that
    // RNGestureHandler needs, and omits RCTReconnectingWebSocket.
    mod.modResults['ios.buildReactNativeFromSource'] = 'true';
    return mod;
  });

  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key]?.buildSettings;
      if (!buildSettings?.PRODUCT_BUNDLE_IDENTIFIER) {
        continue;
      }
      const bundleId = String(buildSettings.PRODUCT_BUNDLE_IDENTIFIER).replace(/"/g, '');
      if (bundleId !== 'com.parksense.app') {
        continue;
      }

      if (buildSettings.OTHER_LDFLAGS) {
        const ldFlags = Array.isArray(buildSettings.OTHER_LDFLAGS)
          ? buildSettings.OTHER_LDFLAGS
          : [buildSettings.OTHER_LDFLAGS];
        buildSettings.OTHER_LDFLAGS = withoutBrokenAutolinkLdFlag(ldFlags);
      }

      buildSettings.FRAMEWORK_SEARCH_PATHS = withStubFrameworkSearchPaths(
        buildSettings.FRAMEWORK_SEARCH_PATHS,
      );
      buildSettings.OTHER_SWIFT_FLAGS = withDisabledAutolink(buildSettings.OTHER_SWIFT_FLAGS);
      buildSettings.ENABLE_DEBUG_DYLIB = 'NO';
      buildSettings.CLANG_ENABLE_EXPLICIT_MODULES = 'NO';
    }
    return mod;
  });
}

module.exports = withSwiftUICoreLinkFix;

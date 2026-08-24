// Copyright 2015-present 650 Industries. All rights reserved.

/**
 * Prebuilt React-Core (RN 0.81+) does not export RCTPackagerConnection.
 * Compiling the original category makes Debug device builds fail:
 *   Undefined symbols: _OBJC_CLASS_$_RCTPackagerConnection
 * Metro / expo-dev-client still work without this interceptor.
 */

#import <EXDevLauncher/RCTPackagerConnection+EXDevLauncherPackagerConnectionInterceptor.h>

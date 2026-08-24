import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { FloatingTabBar } from '../components/FloatingTabBar';
import { useAutoParkingSession } from '../hooks/useAutoParkingSession';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminSensorsScreen } from '../screens/admin/AdminSensorsScreen';
import { AdminSlotsScreen } from '../screens/admin/AdminSlotsScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ReceptionistArrivalsScreen } from '../screens/receptionist/ReceptionistArrivalsScreen';
import { ReceptionistPassScreen } from '../screens/receptionist/ReceptionistPassScreen';
import { ReceptionistScanScreen } from '../screens/receptionist/ReceptionistScanScreen';
import { HistoryScreen } from '../screens/user/HistoryScreen';
import { ArrivalPassScreen } from '../screens/user/ArrivalPassScreen';
import { MapScreen } from '../screens/user/MapScreen';
import { NavigateScreen } from '../screens/user/NavigateScreen';
import { NotificationsScreen } from '../screens/user/NotificationsScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeProvider';
import type {
  AdminStackParamList,
  AdminTabParamList,
  AuthStackParamList,
  ReceptionistStackParamList,
  ReceptionistTabParamList,
  UserStackParamList,
  UserTabParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const UserStack = createNativeStackNavigator<UserStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const ReceptionistStack = createNativeStackNavigator<ReceptionistStackParamList>();
const UserTabs = createBottomTabNavigator<UserTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();
const ReceptionistTabs = createBottomTabNavigator<ReceptionistTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function UserTabNavigator() {
  const { colors } = useTheme();

  const tabOptions = useMemo(
    () => ({
      headerShown: false,
      lazy: true,
      freezeOnBlur: true,
      tabBarActiveTintColor: colors.tabActiveText,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarHideOnKeyboard: true,
      sceneContainerStyle: { backgroundColor: colors.background },
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBar: (props: BottomTabBarProps) => <FloatingTabBar {...props} />,
    }),
    [colors],
  );

  return (
    <UserTabs.Navigator screenOptions={tabOptions}>
      <UserTabs.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          title: 'Home',
          sceneStyle: {
            backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.background,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <UserTabs.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <UserTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
    </UserTabs.Navigator>
  );
}

function UserNavigator() {
  const { colors } = useTheme();

  return (
    <UserStack.Navigator
      screenOptions={{
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <UserStack.Screen
        name="UserTabs"
        component={UserTabNavigator}
        options={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.background,
          },
        }}
      />
      <UserStack.Screen
        name="Navigate"
        component={NavigateScreen}
        options={{
          title: 'Navigation',
          headerBackTitle: 'Map',
          contentStyle: {
            backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.background,
          },
        }}
      />
      <UserStack.Screen
        name="ArrivalPass"
        component={ArrivalPassScreen}
        options={{
          title: 'Arrival pass',
          headerBackTitle: 'Map',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <UserStack.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          title: '',
          headerBackTitle: 'Back',
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </UserStack.Navigator>
  );
}

function AdminTabNavigator() {
  const { colors } = useTheme();

  const tabOptions = useMemo(
    () => ({
      headerShown: false,
      lazy: true,
      freezeOnBlur: true,
      tabBarActiveTintColor: colors.tabActiveText,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarHideOnKeyboard: true,
      sceneContainerStyle: { backgroundColor: colors.background },
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBar: (props: BottomTabBarProps) => <FloatingTabBar {...props} />,
    }),
    [colors],
  );

  return (
    <AdminTabs.Navigator screenOptions={tabOptions}>
      <AdminTabs.Screen
        name="DashboardTab"
        component={AdminDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <AdminTabs.Screen
        name="SlotsTab"
        component={AdminSlotsScreen}
        options={{
          title: 'Slots',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'car' : 'car-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <AdminTabs.Screen
        name="SensorsTab"
        component={AdminSensorsScreen}
        options={{
          title: 'Sensors',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <AdminTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
    </AdminTabs.Navigator>
  );
}

function AdminNavigator() {
  const { colors } = useTheme();

  return (
    <AdminStack.Navigator
      screenOptions={{
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <AdminStack.Screen
        name="AdminTabs"
        component={AdminTabNavigator}
        options={{ headerShown: false }}
      />
      <AdminStack.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          title: '',
          headerBackTitle: 'Back',
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AdminStack.Navigator>
  );
}

function ReceptionistTabNavigator() {
  const { colors } = useTheme();

  const tabOptions = useMemo(
    () => ({
      headerShown: false,
      lazy: true,
      freezeOnBlur: true,
      tabBarActiveTintColor: colors.tabActiveText,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarHideOnKeyboard: true,
      sceneContainerStyle: { backgroundColor: colors.background },
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBar: (props: BottomTabBarProps) => <FloatingTabBar {...props} />,
    }),
    [colors],
  );

  return (
    <ReceptionistTabs.Navigator screenOptions={tabOptions}>
      <ReceptionistTabs.Screen
        name="ScanTab"
        component={ReceptionistScanScreen}
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <ReceptionistTabs.Screen
        name="ArrivalsTab"
        component={ReceptionistArrivalsScreen}
        options={{
          title: 'Arrivals',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
      <ReceptionistTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={size}
              accessibilityElementsHidden
            />
          ),
        }}
      />
    </ReceptionistTabs.Navigator>
  );
}

function ReceptionistNavigator() {
  const { colors } = useTheme();

  return (
    <ReceptionistStack.Navigator
      screenOptions={{
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <ReceptionistStack.Screen
        name="ReceptionistTabs"
        component={ReceptionistTabNavigator}
        options={{ headerShown: false }}
      />
      <ReceptionistStack.Screen
        name="PassDetail"
        component={ReceptionistPassScreen}
        options={{
          title: 'Arrival check',
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <ReceptionistStack.Screen
        name="Alerts"
        component={NotificationsScreen}
        options={{
          title: '',
          headerBackTitle: 'Back',
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </ReceptionistStack.Navigator>
  );
}

function SignedInNavigator() {
  useAutoParkingSession();
  const profile = useAuthStore((state) => state.profile);
  if (profile?.role === 'admin') {
    return <AdminNavigator />;
  }
  if (profile?.role === 'receptionist') {
    return <ReceptionistNavigator />;
  }
  return <UserNavigator />;
}

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        primary: colors.primary,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.occupied,
      },
    }),
    [colors, isDark],
  );

  return (
    <NavigationContainer theme={navTheme}>
      {!firebaseUser || !profile ? (
        <AuthNavigator />
      ) : (
        <SignedInNavigator />
      )}
    </NavigationContainer>
  );
}

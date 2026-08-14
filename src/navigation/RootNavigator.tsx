import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FloatingTabBar } from '../components/FloatingTabBar';
import { colors } from '../config/theme';
import { useNotifications } from '../hooks/useNotifications';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminSensorsScreen } from '../screens/admin/AdminSensorsScreen';
import { AdminSlotsScreen } from '../screens/admin/AdminSlotsScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HistoryScreen } from '../screens/user/HistoryScreen';
import { MapScreen } from '../screens/user/MapScreen';
import { NavigateScreen } from '../screens/user/NavigateScreen';
import { NotificationsScreen } from '../screens/user/NotificationsScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { useAuthStore } from '../store/authStore';
import type {
  AdminTabParamList,
  AuthStackParamList,
  UserStackParamList,
  UserTabParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const UserStack = createNativeStackNavigator<UserStackParamList>();
const UserTabs = createBottomTabNavigator<UserTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.white,
    text: colors.text,
    border: colors.border,
  },
};

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarHideOnKeyboard: true,
  tabBarStyle: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBar: (props: BottomTabBarProps) => <FloatingTabBar {...props} />,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function UserTabNavigator() {
  const profile = useAuthStore((state) => state.profile);
  const { unreadCount } = useNotifications(profile?.userId);

  return (
    <UserTabs.Navigator screenOptions={tabOptions}>
      <UserTabs.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
      <UserTabs.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
      <UserTabs.Screen
        name="AlertsTab"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
      <UserTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
    </UserTabs.Navigator>
  );
}

function UserNavigator() {
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
      <UserStack.Screen name="UserTabs" component={UserTabNavigator} options={{ headerShown: false }} />
      <UserStack.Screen
        name="Navigate"
        component={NavigateScreen}
        options={{ title: 'Navigation', headerBackTitle: 'Map' }}
      />
    </UserStack.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminTabs.Navigator screenOptions={tabOptions}>
      <AdminTabs.Screen
        name="DashboardTab"
        component={AdminDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
      <AdminTabs.Screen
        name="SlotsTab"
        component={AdminSlotsScreen}
        options={{
          title: 'Slots',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
      <AdminTabs.Screen
        name="SensorsTab"
        component={AdminSensorsScreen}
        options={{
          title: 'Sensors',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
      <AdminTabs.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} accessibilityElementsHidden />
          ),
        }}
      />
    </AdminTabs.Navigator>
  );
}

export function RootNavigator() {
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  return (
    <NavigationContainer theme={navTheme}>
      {!firebaseUser || !profile ? (
        <AuthNavigator />
      ) : profile.role === 'admin' ? (
        <AdminNavigator />
      ) : (
        <UserNavigator />
      )}
    </NavigationContainer>
  );
}

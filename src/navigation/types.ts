import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ParkingSlot } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type UserTabParamList = {
  MapTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

export type UserStackParamList = {
  UserTabs: NavigatorScreenParams<UserTabParamList>;
  Navigate: { slot: ParkingSlot };
  Alerts: undefined;
};

export type AdminTabParamList = {
  DashboardTab: undefined;
  SlotsTab: undefined;
  SensorsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  User: NavigatorScreenParams<UserStackParamList>;
  Admin: NavigatorScreenParams<AdminTabParamList>;
};

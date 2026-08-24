export type UserRole = 'user' | 'admin' | 'receptionist';

export type HoldCheckIn = 'pending' | 'admitted' | 'denied';

export type ParkingPassStatus = 'issued' | 'admitted' | 'denied' | 'cancelled' | 'consumed';

export type SlotStatus = 'Available' | 'Occupied';

export type SensorStatus = 'Active' | 'Faulty' | 'Simulated';

export type UserProfile = {
  userId: string;
  fullName: string;
  email: string;
  contactNo?: string;
  registeredOn: number;
  role: UserRole;
  preferredLocation?: string;
  photoUrl?: string;
};

export type ParkingSlot = {
  slotId: string;
  slotNumber: string;
  locationName: string;
  latitude: number;
  longitude: number;
  status: SlotStatus;
  adminId?: string;
  heldByUserId?: string;
  heldByName?: string;
  heldUntil?: number;
  holdToken?: string;
  holdCheckIn?: HoldCheckIn;
  checkedInAt?: number;
  checkedInBy?: string;
  checkedInByName?: string;
  occupiedByUserId?: string;
  occupiedByName?: string;
  occupiedByRole?: UserRole;
};

export type ParkingPass = {
  token: string;
  slotId: string;
  slotNumber: string;
  locationName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  photoUrl?: string;
  issuedAt: number;
  expiresAt: number;
  status: ParkingPassStatus;
  admittedAt?: number;
  admittedBy?: string;
  admittedByName?: string;
  deniedAt?: number;
  deniedBy?: string;
  deniedByName?: string;
  denyReason?: string;
  cancelledAt?: number;
  consumedAt?: number;
};

export type BayKind = 'offline' | 'mine' | 'heldMine' | 'held' | 'open' | 'taken';

export type Sensor = {
  sensorId: string;
  slotId: string;
  sensorType: 'IR' | 'Ultrasonic' | 'Mock';
  sensorStatus: SensorStatus;
  lastUpdated: number;
};

export type ParkingHistory = {
  historyId: string;
  userId: string;
  slotId: string;
  slotNumber: string;
  locationName: string;
  entryTime: number;
  exitTime?: number;
  bookingDate: string;
};

export type AppNotification = {
  notificationId: string;
  userId: string;
  message: string;
  createdTime: number;
  isRead: boolean;
  slotId?: string;
};

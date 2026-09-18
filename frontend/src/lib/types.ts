export type UserRole = "PET_PARENT" | "PROVIDER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  dob: string | null;
  ageMonths: number | null;
  weightKg: number | null;
  gender: string | null;
  alerts: string | null;
  createdAt: string;
}

export interface PetParentProfile {
  userId: string;
  phoneNo: string | null;
  address: string | null;
  pets: Pet[];
}

export interface ProviderProfile {
  userId: string;
  providerType: string;
  phoneNo: string | null;
  address: string | null;
}

export type Profile = PetParentProfile | ProviderProfile;

export type RecordType =
  | "VACCINATION"
  | "DEWORMING"
  | "LAB_RESULT"
  | "PRESCRIPTION"
  | "VISIT_SUMMARY"
  | "IMAGING"
  | "OTHER";

export type ServiceCategory =
  | "CHECKUP"
  | "VACCINATION"
  | "SURGERY"
  | "GROOMING"
  | "BOARDING"
  | "TRAINING"
  | "EMERGENCY";

export type StaffRole = "VET" | "GROOMER" | "TRAINER" | "ASSISTANT" | "RECEPTIONIST";

export interface Service {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: ServiceCategory;
  durationMinutes: number;
  isActive: boolean;
  effectiveActive?: boolean;
  staffServices?: { staff: StaffMember }[];
}

export interface StaffMember {
  id: string;
  providerId: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  staffServices?: { service: Service }[];
}

export interface TimeSlot {
  id: string;
  staffId: string;
  startDatetime: string;
  endDatetime: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface DiscoveryProvider {
  id: string;
  name: string;
  providerType: string;
  address: string | null;
  phoneNo?: string | null;
  services: Service[];
  rating: number | null;
  reviewCount: number;
}

export interface AvailableSlot {
  id: string;
  staffId: string;
  staffName: string;
  startDatetime: string;
  endDatetime: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  payload: {
    bookingId?: string;
    petName?: string;
    serviceName?: string;
    providerName?: string;
    startDatetime?: string;
  } | null;
  isRead: boolean;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  petId: string;
  petParentId: string;
  providerId: string;
  serviceId: string;
  staffId: string;
  slotId: string;
  status: BookingStatus;
  rating: number | null;
  reviewComment: string | null;
  pet: Pet;
  service: Service;
  staff: StaffMember;
  slot: TimeSlot;
}

export interface PetRecord {
  id: string;
  petId: string;
  bookingId: string | null;
  recordType: RecordType;
  title: string;
  description: string | null;
  recordDate: string;
  fileUrl: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

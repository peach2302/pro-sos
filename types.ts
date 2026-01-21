export enum IncidentType {
  FIRE = 'FIRE',
  ACCIDENT = 'ACCIDENT',
  SICK = 'SICK',
  ANIMAL = 'ANIMAL',
  OTHER = 'OTHER'
}

export enum IncidentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface IncidentReport {
  id: string;
  type: IncidentType;
  description: string;
  reporterName: string;
  phone: string;
  location: Location;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  status: IncidentStatus;
  createdAt: number;
  acceptedAt?: number;
  resolvedAt?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  advice?: string; // New field for Gemini advice
  closingMediaUrl?: string;
  signatureUrl?: string;
  officerName?: string;
  officerPosition?: string;
}

export interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  // Fix: Changed JSX.Element to React.ReactElement to resolve namespace issue in a .ts file.
  icon: React.ReactElement;
}

export interface Attachment {
  name: string;
  type: string;
  data: string; // base64 data URL
}

export type EntryType = 'login' | 'secure-note' | 'credit-card' | 'identity' | 'bank-account';
export type Folder = string;

export interface IPasswordStrength {
  score: number;
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
}

export interface IPasswordEntry {
  // Common fields
  id: string;
  type: EntryType;
  name: string;
  notes?: string;
  favorite: boolean;
  folder?: Folder;
  tags: string[];
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt: Date;
  sharedWith?: { contactId: string; accessLevel: 'view' | 'full' }[];

  // Login
  siteName?: string;
  url?: string;
  username?: string;
  password?: string;
  passwordStrength?: IPasswordStrength;
  passwordHistory?: { password: string; date: Date }[];

  // Credit Card
  cardholderName?: string;
  cardNumber?: string;
  cardType?: 'credit' | 'debit';
  expiryDate?: string;
  cvv?: string;
  pin?: string;

  // Identity
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;

  // Bank Account
  bankName?: string;
  accountType?: string;
  routingNumber?: string;
  accountNumber?: string;
  swiftCode?: string;
}

export interface AuthorizedContact {
  id: string;
  name: string;
  email: string;
  accessLevel: 'view' | 'full';
  waitingPeriod: number; // in days
  isActive: boolean;
  createdAt: Date;
}

export interface Subscription {
  plan: 'free' | 'premium' | 'family' | 'business';
  status: 'trialing' | 'active' | 'canceled';
  trialEndsAt: Date | null;
}

export interface User {
  id?: string;
  email: string;
  isAdmin?: boolean;
  subscription?: string;
  subscriptionValidUntil?: Date; // Added for expiration check
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TimedShare {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  encryptedData: string;
  releaseDate: Date;
  status: 'pending' | 'released' | 'revoked';
  createdAt: Date;
}

export interface EmergencyRequest {
  id: string;
  requesterEmail: string;
  targetUserEmail: string;
  proofDocumentUrl?: string; // URL to the uploaded proof file
  requestType: 'death' | 'illness' | 'absence' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
  requestedAt: Date;
  approvedAt?: Date;
}

export interface DigitalWillConfig {
  userId: string;
  beneficiaryEmail?: string;
  condition: 'death' | 'illness' | 'absence';
  action: 'transfer_access' | 'delete_account';
  updatedAt: Date;
}

export interface AccessLog {
  id: string;
  userId: string;
  action: string;
  resourceId?: string;
  details?: string;
  timestamp: Date;
}
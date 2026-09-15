export type PlanType = 'Focus' | 'Flow' | 'Full';
export type BillingCycle = 'monthly' | 'yearly';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'teacher' | 'admin';
  plan: PlanType;
  billingCycle?: BillingCycle;
  generationsUsed: number;
  freeGenerationsLimit: number; // 1 free generation before sign up / upgrade
  subscriptionExpiry?: string | null;
  paymentRef?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface ExamGenerationRecord {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  level: 'O-Level' | 'A-Level' | 'Grade 7';
  paperNumber: string;
  totalMarks: number | string;
  examSession: string;
  originalExamText: string;
  markingScheme: string;
  planAtGeneration: PlanType;
  attribution: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id?: string;
  reference: string;
  userId: string;
  userEmail: string;
  planId: PlanType;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  destinationAccount: string; // +263788849965
  paymentMethod: 'ecocash' | 'onemoney' | 'visa_mastercard' | 'stanbic' | 'cbz' | 'afc' | 'other';
  phoneNumber?: string;
  status: 'Pending' | 'Paid' | 'Failed';
  createdAt: string;
  verifiedAt?: string;
}

export interface PricingPlan {
  id: PlanType;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  exclusiveFeatures: string[];
  ctaText: string;
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'Focus',
    name: 'Apply for Focus',
    tagline: 'Get started with basic examination marking evaluation',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'USD',
    features: [
      '1 Free Exam Paper Marking Scheme Generation',
      'O-Level, A-Level & Grade 7 Core Alignment',
      'Basic step-by-step marking guidelines',
      'Clean formatted text and Word export',
      'High-clarity evaluation breakdown'
    ],
    exclusiveFeatures: [],
    ctaText: 'Apply for Focus (Free)'
  },
  {
    id: 'Flow',
    name: 'Flow Plan',
    tagline: 'For active classroom teachers marking multiple terms',
    monthlyPrice: 1.66,
    yearlyPrice: 16.60,
    currency: 'USD',
    features: [
      'Unlimited Exam Paper Generations',
      'Detailed Method [M], Accuracy [A], Independent [B] & Follow-Through [ft] marks',
      'Paper 1 (Multiple Choice rationale) & Paper 2 (Structured)',
      'Ultra-fast high-priority queue',
      'Formatted PDF and Word (.doc) Instant Downloads',
      'Paper Vault History storage'
    ],
    exclusiveFeatures: [
      'Step-by-step sub-mark allocation matrix',
      'Downloadable print-ready PDF schemes'
    ],
    ctaText: 'Upgrade to Flow Plan'
  },
  {
    id: 'Full',
    name: 'Full Plan (Max)',
    tagline: 'The supreme chief examiner kit with exclusive marking intelligence',
    monthlyPrice: 5.33,
    yearlyPrice: 53.30,
    currency: 'USD',
    popular: true,
    features: [
      'All Flow Plan Features included',
      'Chief Examiner Analytical Reports & Assessment Directives',
      'Specimen Grade Boundary Calibration (A, B, C, D, E, U cutoffs)',
      'High-Frequency Student Misconceptions & Trap Alerts',
      'Model High-Scoring Student Responses & Worked Exemplars',
      'Alternative acceptable terminology [owtte] & strict rejection terms [reject]',
      'Direct WhatsApp & Priority Educator Support',
      'Instant priority processing'
    ],
    exclusiveFeatures: [
      'Official Chief Examiner Guidance Notes',
      'Specimen Grade Boundary Matrix',
      'Common Student Traps & Misconceptions Analysis',
      'Model High-Grade Answers vs Common Failure Modes'
    ],
    ctaText: 'Upgrade to Full Plan (Max)'
  }
];

export const EXAM_SUBJECTS = [
  'Mathematics (4004 / 4028 / 6042)',
  'English Language (1122)',
  'Combined Science (4003)',
  'Physics (5054 / 6032)',
  'Chemistry (5070 / 6033)',
  'Biology (5090 / 6030)',
  'History (2167 / 6006)',
  'Geography (2248 / 6002)',
  'Commerce (7103 / 6004)',
  'Principles of Accounts (7110 / 6001)',
  'Economics (2281 / 6003)',
  'Computer Science (7014 / 6023)',
  'Heritage Studies (4006)',
  'Family & Religious Studies (FRS 2043 / 6008)',
  'Shona (3159 / 6010)',
  'Ndebele (3155 / 6011)',
  'Agriculture (5037 / 6007)',
  'Building Technology & Design (4063)',
  'Food Technology & Design (4060)',
  'Grade 7 General Paper',
  'Grade 7 Mathematics',
  'Grade 7 English',
  'Grade 7 Agriculture'
];

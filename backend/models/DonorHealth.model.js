import mongoose from 'mongoose';

const DonorHealthSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Personal Information
  fullName: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    required: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  
  // Medical Conditions
  medicalConditions: {
    heartDisease: { type: Boolean, default: false },
    diabetes: { type: Boolean, default: false },
    highBloodPressure: { type: Boolean, default: false },
    lowBloodPressure: { type: Boolean, default: false },
    cancer: { type: Boolean, default: false },
    hivAids: { type: Boolean, default: false },
    hepatitisBC: { type: Boolean, default: false },
    malaria: { type: Boolean, default: false },
    tuberculosis: { type: Boolean, default: false },
    epilepsy: { type: Boolean, default: false },
    asthma: { type: Boolean, default: false },
    bleedingDisorder: { type: Boolean, default: false },
    kidneyDisease: { type: Boolean, default: false },
    liverDisease: { type: Boolean, default: false }
  },
  
  // Recent Activities
  recentActivities: {
    tattooOrPiercing: { type: Boolean, default: false },
    surgeryOrTransfusion: { type: Boolean, default: false },
    dentalWork: { type: Boolean, default: false },
    vaccination: { type: Boolean, default: false },
    travelToMalariaArea: { type: Boolean, default: false },
    pregnancyOrBreastfeeding: { type: Boolean, default: false }
  },
  
  // Current Health
  currentHealth: {
    recentFeverOrIllness: { type: Boolean, default: false },
    onMedication: { type: Boolean, default: false },
    medicationDetails: { type: String },
    recentAlcoholConsumption: { type: Boolean, default: false }
  },
  
  // Lifestyle
  lifestyle: {
    smoker: { type: Boolean, default: false },
    regularAlcoholUse: { type: Boolean, default: false }
  },
  
  // Donation History
  donationHistory: {
    previouslyDonated: { type: Boolean, default: false },
    lastDonationDate: { type: Date },
    totalDonations: { type: Number, default: 0 },
    anyReactionsInPast: { type: Boolean, default: false },
    reactionDetails: { type: String }
  },
  
  // Eligibility
  eligibility: {
    isEligible: { type: Boolean, default: true },
    reasonsForIneligibility: [{ type: String }],
    eligibilityDate: { type: Date } // When they will become eligible again
  },
  
  // Consent
  consent: {
    informationAccurate: { type: Boolean, required: true },
    consentToDonate: { type: Boolean, required: true },
    understandsProcess: { type: Boolean, required: true }
  },
  
  // Admin/Review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'requires_review'],
    default: 'pending'
  },
  
  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
DonorHealthSchema.pre('save', async function() {
  this.updatedAt = Date.now();
  
  // Auto-calculate eligibility based on conditions
  const ineligibleConditions = [];
  
  // Check medical conditions that make donor ineligible
  if (this.medicalConditions.hivAids) ineligibleConditions.push('HIV/AIDS');
  if (this.medicalConditions.hepatitisBC) ineligibleConditions.push('Hepatitis B/C');
  if (this.medicalConditions.cancer) ineligibleConditions.push('Cancer history');
  if (this.medicalConditions.heartDisease) ineligibleConditions.push('Heart disease');
  if (this.medicalConditions.bleedingDisorder) ineligibleConditions.push('Bleeding disorder');
  
  // Check recent activities
  if (this.recentActivities.tattooOrPiercing) ineligibleConditions.push('Recent tattoo/piercing (wait 6 months)');
  if (this.recentActivities.travelToMalariaArea) ineligibleConditions.push('Travel to malaria-endemic area (wait 3 months)');
  
  // Check current health
  if (this.currentHealth.recentFeverOrIllness) ineligibleConditions.push('Recent fever or illness');
  if (this.currentHealth.recentAlcoholConsumption) ineligibleConditions.push('Recent alcohol consumption (wait 24 hours)');
  
  // Check weight
  if (this.weight < 50) ineligibleConditions.push('Weight below 50kg');
  
  // Check last donation date (minimum 56 days between donations)
  if (this.donationHistory.lastDonationDate) {
    const daysSinceLastDonation = Math.floor((Date.now() - this.donationHistory.lastDonationDate) / (1000 * 60 * 60 * 24));
    if (daysSinceLastDonation < 56) {
      ineligibleConditions.push('Less than 56 days since last donation');
    }
  }
  
  // Set eligibility
  if (ineligibleConditions.length > 0) {
    this.eligibility.isEligible = false;
    this.eligibility.reasonsForIneligibility = ineligibleConditions;
  } else {
    this.eligibility.isEligible = true;
    this.eligibility.reasonsForIneligibility = [];
  }
});

// Index for efficient queries
DonorHealthSchema.index({ donor: 1 });
DonorHealthSchema.index({ status: 1 });
DonorHealthSchema.index({ 'eligibility.isEligible': 1 });

export default mongoose.model('DonorHealth', DonorHealthSchema);

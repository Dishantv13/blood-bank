export const USER_SAFE_FIELDS = [
  '_id',
  'name',
  'email',
  'phone',
  'bloodGroup',
  'role',
  'isDonor',
  'needsBlood',
  'activeMode',
  'address',
  'location',
  'photoURL',
  'photoURLPublicId',
  'isAvailable',
  'healthForm',
  'donorInfo',
  'lastDonationDate',
  'createdAt',
].join(' ');

export const USER_PROFILE_FIELDS = [
  '_id',
  'name',
  'email',
  'phone',
  'bloodGroup',
  'role',
  'isDonor',
  'needsBlood',
  'activeMode',
  'address',
  'location',
  'photoURL',
  'photoURLPublicId',
  'isAvailable',
  'healthForm',
  'donorInfo',
  'lastDonationDate',
  'createdAt',
].join(' ');

export const USER_DONOR_FIELDS = [
  '_id',
  'name',
  'email',
  'phone',
  'bloodGroup',
  'address',
  'location',
  'photoURL',
  'isAvailable',
  'isDonor',
  'donorInfo',
  'lastDonationDate',
  'createdAt',
].join(' ');

export const BLOOD_BANK_SAFE_FIELDS = [
  '_id',
  'name',
  'email',
  'phone',
  'logo',
  'imageUrl',
  'licenseNumber',
  'registrationNumber',
  'establishedYear',
  'address',
  'profileImage',
  'profileImagePublicId',
  'location',
  'inventory',
  'operatingHours',
  'services',
  'contactPerson',
  'isActive',
  'isVerified',
  'approvalStatus',
  'reviewedAt',
  'reviewedBy',
  'rejectionReason',
  'createdAt',
].join(' ');

export const BLOOD_BANK_LIST_FIELDS = [
  '_id',
  'name',
  'email',
  'phone',
  'logo',
  'imageUrl',
  'profileImage',
  'address',
  'location',
  'isActive',
  'isVerified',
  'approvalStatus',
].join(' ');

const optimizeCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return url;
};

export const sanitizeUser = (user) => {
  if (!user) return null;
  const normalizedId = user._id || user.id;
  return {
    _id: normalizedId,
    id: normalizedId,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    bloodGroup: user.bloodGroup || '',
    role: user.role,
    isDonor: Boolean(user.isDonor),
    needsBlood: Boolean(user.needsBlood),
    activeMode: user.activeMode || 'patient',
    address: user.address || {},
    location: user.location,
    photoURL: optimizeCloudinaryUrl(user.photoURL || ''),
    photoURLPublicId: user.photoURLPublicId || '',
    isAvailable: typeof user.isAvailable === 'boolean' ? user.isAvailable : true,
    healthForm: user.healthForm,
    donorInfo: user.donorInfo,
    lastDonationDate: user.lastDonationDate,
    createdAt: user.createdAt,
  };
};

export const sanitizeBloodBank = (bloodBank) => {
  if (!bloodBank) return null;
  const normalizedId = bloodBank._id || bloodBank.id;
  return {
    _id: normalizedId,
    id: normalizedId,
    name: bloodBank.name,
    email: bloodBank.email,
    phone: bloodBank.phone || '',
    establishedYear: bloodBank.establishedYear,
    licenseNumber: bloodBank.licenseNumber || '',
    registrationNumber: bloodBank.registrationNumber || '',
    address: bloodBank.address || {},
    profileImage: optimizeCloudinaryUrl(bloodBank.profileImage || ''),
    logo: optimizeCloudinaryUrl(bloodBank.logo || ''),
    imageUrl: optimizeCloudinaryUrl(bloodBank.imageUrl || ''),
    profileImagePublicId: bloodBank.profileImagePublicId || '',
    location: bloodBank.location,
    inventory: bloodBank.inventory || [],
    operatingHours: bloodBank.operatingHours || {},
    services: bloodBank.services || [],
    contactPerson: bloodBank.contactPerson || {},
    isActive: Boolean(bloodBank.isActive),
    isVerified: Boolean(bloodBank.isVerified),
    approvalStatus: bloodBank.approvalStatus || 'pending',
    reviewedAt: bloodBank.reviewedAt,
    reviewedBy: bloodBank.reviewedBy || '',
    rejectionReason: bloodBank.rejectionReason || '',
    createdAt: bloodBank.createdAt,
  };
};

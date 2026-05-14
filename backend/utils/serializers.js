export const USER_SAFE_FIELDS = [
  "_id",
  "name",
  "email",
  "phone",
  "bloodGroup",
  "role",
  "isDonor",
  "needsBlood",
  "activeMode",
  "address",
  "location",
  "photoURL",
  "photoURLPublicId",
  "isAvailable",
  "healthForm",
  "donorInfo",
  "lastDonationDate",
  "createdAt",
].join(" ");

export const USER_PROFILE_FIELDS = [
  "_id",
  "name",
  "email",
  "phone",
  "bloodGroup",
  "role",
  "isDonor",
  "needsBlood",
  "activeMode",
  "address",
  "location",
  "photoURL",
  "photoURLPublicId",
  "isAvailable",
  "healthForm",
  "donorInfo",
  "lastDonationDate",
  "createdAt",
].join(" ");

export const USER_DONOR_FIELDS = [
  "_id",
  "name",
  "email",
  "phone",
  "bloodGroup",
  "address",
  "location",
  "photoURL",
  "isAvailable",
  "isDonor",
  "donorInfo",
  "lastDonationDate",
  "createdAt",
].join(" ");

export const BLOOD_BANK_SAFE_FIELDS = [
  "_id",
  "name",
  "email",
  "phone",
  "logo",
  "imageUrl",
  "licenseNumber",
  "registrationNumber",
  "establishedYear",
  "address",
  "profileImage",
  "profileImagePublicId",
  "location",
  "operatingHours",
  "services",
  "contactPerson",
  "isActive",
  "isVerified",
  "approvalStatus",
  "reviewedAt",
  "reviewedBy",
  "rejectionReason",
  "createdAt",
].join(" ");

export const BLOOD_BANK_LIST_FIELDS = [
  "_id",
  "name",
  "email",
  "phone",
  "logo",
  "imageUrl",
  "profileImage",
  "address",
  "location",
  "isActive",
  "isVerified",
  "approvalStatus",
].join(" ");

const optimizeCloudinaryUrl = (url) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com"))
    return url;
  if (url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/f_auto,q_auto/");
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
    phone: user.phone || "",
    bloodGroup: user.bloodGroup || "",
    role: user.role,
    isDonor: Boolean(user.isDonor),
    needsBlood: Boolean(user.needsBlood),
    activeMode: user.activeMode || "patient",
    address: user.address || {},
    location: user.location,
    photoURL: optimizeCloudinaryUrl(user.photoURL || ""),
    photoURLPublicId: user.photoURLPublicId || "",
    isAvailable:
      typeof user.isAvailable === "boolean" ? user.isAvailable : true,
    healthForm: user.healthForm,
    donorInfo: user.donorInfo,
    lastDonationDate: user.lastDonationDate,
    createdAt: user.createdAt,
  };
};

export const sanitizePublicUser = (user) => {
  if (!user) return null;
  const normalizedId = user._id || user.id;
  return {
    _id: normalizedId,
    id: normalizedId,
    name: user.name,
    bloodGroup: user.bloodGroup || "",
    city: user.address?.city || "",
    state: user.address?.state || "",
    isDonor: Boolean(user.isDonor),
    isAvailable:
      typeof user.isAvailable === "boolean" ? user.isAvailable : true,
    photoURL: optimizeCloudinaryUrl(user.photoURL || ""),
  };
};

export const sanitizeDonorSummary = (user) => {
  if (!user) return null;
  const normalizedId = user._id || user.id;
  return {
    _id: normalizedId,
    id: normalizedId,
    name: user.name || "Anonymous Donor",
    email: user.email || "",
    phone: user.phone || "",
    bloodGroup: user.bloodGroup || "",
    city: user.address?.city || "",
    isDonor: Boolean(user.isDonor),
    isAvailable:
      typeof user.isAvailable === "boolean" ? user.isAvailable : true,
    totalDonations: Number(user.donorInfo?.totalDonations || 0),
    lastDonationDate:
      user.lastDonationDate || user.donorInfo?.lastDonationDate || null,
    photoURL: optimizeCloudinaryUrl(user.photoURL || ""),
  };
};

const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [
    address.street,
    address.city,
    address.state,
    address.pincode || address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
};

export const sanitizeBloodBank = (bloodBank) => {
  if (!bloodBank) return null;
  const normalizedId = bloodBank._id || bloodBank.id;
  return {
    _id: normalizedId,
    id: normalizedId,
    name: bloodBank.name,
    email: bloodBank.email,
    phone: bloodBank.phone || "",
    establishedYear: bloodBank.establishedYear,
    licenseNumber: bloodBank.licenseNumber || "",
    registrationNumber: bloodBank.registrationNumber || "",
    address: bloodBank.address || {},
    formattedAddress: formatAddress(bloodBank.address),
    profileImage: optimizeCloudinaryUrl(bloodBank.profileImage || ""),
    logo: optimizeCloudinaryUrl(bloodBank.logo || ""),
    imageUrl: optimizeCloudinaryUrl(bloodBank.imageUrl || ""),
    profileImagePublicId: bloodBank.profileImagePublicId || "",
    location: bloodBank.location,
    operatingHours: bloodBank.operatingHours || {},
    services: bloodBank.services || [],
    contactPerson: bloodBank.contactPerson || {},
    isActive: Boolean(bloodBank.isActive),
    isVerified: Boolean(bloodBank.isVerified),
    approvalStatus: bloodBank.approvalStatus || "pending",
    reviewedAt: bloodBank.reviewedAt,
    reviewedBy: bloodBank.reviewedBy || "",
    rejectionReason: bloodBank.rejectionReason || "",
    inventory: bloodBank.inventory || [],
    createdAt: bloodBank.createdAt,
  };
};

export const sanitizeBloodBankSummary = (bloodBank) => {
  if (!bloodBank) return null;
  const normalizedId = bloodBank._id || bloodBank.id;
  return {
    _id: normalizedId,
    id: normalizedId,
    name: bloodBank.name,
    city: bloodBank.address?.city || "",
    state: bloodBank.address?.state || "",
    profileImage: optimizeCloudinaryUrl(
      bloodBank.profileImage || bloodBank.logo || "",
    ),
    isVerified: Boolean(bloodBank.isVerified),
    approvalStatus: bloodBank.approvalStatus || "pending",
    services: bloodBank.services || [],
  };
};

const getLocationArea = (hospital = {}) => {
  if (!hospital || typeof hospital !== "object") return "";
  return hospital.name || hospital.address || "";
};

export const sanitizePublicBloodRequest = (request) => {
  if (!request) return null;

  return {
    _id: request._id,
    id: request._id,
    bloodGroup: request.bloodGroup,
    units: request.units,
    urgency: request.urgency,
    status: request.status,
    requiredBy: request.requiredBy,
    createdAt: request.createdAt,
    requestDate: request.createdAt,
    locationArea: getLocationArea(request.hospital),
    hospital: {
      name: request.hospital?.name || "",
      area: getLocationArea(request.hospital),
    },
  };
};

export const sanitizePrivateBloodRequest = (
  request,
  { includeTimeline = true } = {},
) => {
  if (!request) return null;

  return {
    _id: request._id,
    id: request._id,
    requestType: request.requestType,
    patientName: request.patientName,
    bloodGroup: request.bloodGroup,
    units: request.units,
    urgency: request.urgency,
    status: request.status,
    hospital: request.hospital || {},
    contactNumber: request.contactNumber || "",
    requiredBy: request.requiredBy,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    description: request.description || "",
    fulfillment: request.fulfillment || null,
    bloodBankResponse: request.bloodBankResponse || null,
    requestedBy: request.requestedBy || null,
    requestingBloodBank: request.requestingBloodBank || null,
    targetBloodBank: request.targetBloodBank || null,
    bloodBank: request.bloodBank || null,
    timeline: includeTimeline ? request.timeline || [] : undefined,
  };
};

export const sanitizeRequestSummary = (request) => {
  if (!request) return null;
  return {
    _id: request._id,
    id: request._id,
    bloodGroup: request.bloodGroup,
    units: request.units,
    urgency: request.urgency,
    status: request.status,
    requestType: request.requestType,
    requiredBy: request.requiredBy,
    createdAt: request.createdAt,
    locationArea: getLocationArea(request.hospital),
  };
};

export const sanitizeAdminDetailView = (resource = {}, type = "resource") => ({
  ...resource,
  _detailType: type,
});

const maskPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

export const sanitizeSearchDonorResult = (donor) => {
  if (!donor) return null;

  const roundedKm = Number.isFinite(Number(donor.distanceKm))
    ? Math.max(1, Math.round(Number(donor.distanceKm)))
    : null;

  return {
    donorId: donor._id,
    bloodGroup: donor.bloodGroup || "",
    availability: donor.isAvailable === true ? "available" : "unavailable",
    city: donor.address?.city || "",
    area: donor.address?.city || donor.address?.state || "",
    approximateDistanceKm: roundedKm,
    maskedPhone: maskPhone(donor.phone),
    hasProfilePhoto: Boolean(donor.photoURL),
  };
};

export const sanitizeSearchBloodBankResult = (bloodBank) => {
  if (!bloodBank) return null;

  const roundedKm = Number.isFinite(Number(bloodBank.distanceKm))
    ? Math.max(1, Math.round(Number(bloodBank.distanceKm)))
    : null;

  return {
    bloodBankId: bloodBank._id,
    name: bloodBank.name,
    city: bloodBank.address?.city || "",
    area: bloodBank.address?.city || bloodBank.address?.state || "",
    approximateDistanceKm: roundedKm,
    availableUnits: Number(bloodBank.availableUnits || 0),
    operatingHours: bloodBank.operatingHours || undefined,
    isVerified: Boolean(bloodBank.isVerified),
  };
};

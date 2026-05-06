import DonorHealth from "../models/DonorHealth.model.js";
import { ApiError } from "../utils/apiError.js";
import {
  getPaginationParams,
  buildPaginatedResponse,
} from "../utils/pagination.js";

export const submitHealthForm = async (userId, data) => {
  const { consent } = data;
  if (
    !consent?.informationAccurate ||
    !consent?.consentToDonate ||
    !consent?.understandsProcess
  ) {
    throw new ApiError(400, "All consent fields must be accepted");
  }

  const existing = await DonorHealth.findOne({
    donor: userId,
    status: "pending",
  }).lean();
  if (existing) {
    throw new ApiError(
      400,
      "You already have a pending health form. Please wait for review.",
    );
  }

  const form = new DonorHealth({ donor: userId, ...data });
  await form.save();

  return {
    id: form._id,
    eligibility: form.eligibility,
    status: form.status,
  };
};

export const getMyForms = async (userId) => {
  return DonorHealth.find({ donor: userId })
    .select("_id status eligibility submittedAt reviewNotes reviewedAt")
    .sort({ submittedAt: -1 })
    .lean();
};

export const getLatestForm = async (userId) => {
  const form = await DonorHealth.findOne({ donor: userId })
    .sort({ submittedAt: -1 })
    .lean();
  if (!form) throw new ApiError(404, "No health form found");
  return form;
};

export const checkEligibility = async (userId) => {
  const form = await DonorHealth.findOne({ donor: userId })
    .sort({ submittedAt: -1 })
    .lean();
  if (!form)
    return { hasForm: false, message: "Please complete the health form first" };

  return {
    hasForm: true,
    isEligible: form.eligibility?.isEligible,
    reasons: form.eligibility?.reasonsForIneligibility || [],
    status: form.status,
    submittedAt: form.submittedAt,
  };
};

export const getAllForms = async (query) => {
  const { page, limit, skip } = getPaginationParams({ query });
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.isEligible !== undefined)
    filter["eligibility.isEligible"] = query.isEligible === "true";

  const [forms, total] = await Promise.all([
    DonorHealth.find(filter)
      .populate("donor", "name email phone")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DonorHealth.countDocuments(filter),
  ]);

  return buildPaginatedResponse(forms, total, page, limit);
};

export const getFormById = async (id) => {
  const form = await DonorHealth.findById(id)
    .populate("donor", "name email phone")
    .lean();
  if (!form) throw new ApiError(404, "Health form not found");
  return form;
};

export const reviewForm = async (id, bloodBankId, data) => {
  const form = await DonorHealth.findById(id);
  if (!form) throw new ApiError(404, "Health form not found");

  form.status = data.status;
  form.reviewNotes = data.reviewNotes;
  form.reviewedBy = bloodBankId;
  form.reviewedAt = Date.now();
  await form.save();

  return form;
};

export const updateForm = async (id, userId, data) => {
  const form = await DonorHealth.findById(id);
  if (!form) throw new ApiError(404, "Health form not found");
  if (form.donor.toString() !== userId.toString())
    throw new ApiError(403, "Not authorized");
  if (!["pending", "requires_review"].includes(form.status)) {
    throw new ApiError(
      400,
      "Cannot update a form that has been approved or rejected",
    );
  }

  const updateFields = [
    "fullName",
    "dateOfBirth",
    "gender",
    "bloodGroup",
    "weight",
    "phone",
    "email",
    "address",
    "city",
    "medicalConditions",
    "recentActivities",
    "currentHealth",
    "lifestyle",
    "donationHistory",
    "consent",
  ];

  updateFields.forEach((field) => {
    if (data[field] !== undefined) form[field] = data[field];
  });

  form.status = "pending";
  await form.save();
  return form;
};

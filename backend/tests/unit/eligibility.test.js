import DonorHealth from "../../models/DonorHealth.model.js";
import mongoose from "mongoose";

describe("Donor Eligibility Unit Tests", () => {
  let donorId;

  beforeEach(() => {
    donorId = new mongoose.Types.ObjectId();
  });

  const getBaseFormData = () => ({
    donor: donorId,
    fullName: "Test Donor",
    dateOfBirth: new Date("1990-01-01"),
    gender: "male",
    bloodGroup: "O+",
    weight: 70,
    phone: "1234567890",
    email: "test@example.com",
    consent: {
      informationAccurate: true,
      consentToDonate: true,
      understandsProcess: true,
    },
  });

  test("Should be eligible with perfect health data", async () => {
    const form = new DonorHealth(getBaseFormData());
    await form.save();

    expect(form.eligibility.isEligible).toBe(true);
    expect(form.eligibility.reasonsForIneligibility).toHaveLength(0);
  });

  test("Should be ineligible if weight is below 50kg", async () => {
    const data = getBaseFormData();
    data.weight = 45;

    const form = new DonorHealth(data);
    await form.save();

    expect(form.eligibility.isEligible).toBe(false);
    expect(form.eligibility.reasonsForIneligibility).toContain(
      "Weight below 50kg",
    );
  });

  test("Should be ineligible if less than 90 days since last donation", async () => {
    const data = getBaseFormData();
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

    data.donationHistory = {
      previouslyDonated: true,
      lastDonationDate: recentDate,
    };

    const form = new DonorHealth(data);
    await form.save();

    expect(form.eligibility.isEligible).toBe(false);
    expect(form.eligibility.reasonsForIneligibility).toContain(
      "Less than 90 days since last donation",
    );
  });

  test("Should be ineligible with HIV/AIDS condition", async () => {
    const data = getBaseFormData();
    data.medicalConditions = { hivAids: true };

    const form = new DonorHealth(data);
    await form.save();

    expect(form.eligibility.isEligible).toBe(false);
    expect(form.eligibility.reasonsForIneligibility).toContain("HIV/AIDS");
  });

  test("Should be ineligible if tattoo was received recently", async () => {
    const data = getBaseFormData();
    data.recentActivities = { tattooOrPiercing: true };

    const form = new DonorHealth(data);
    await form.save();

    expect(form.eligibility.isEligible).toBe(false);
    expect(form.eligibility.reasonsForIneligibility).toContain(
      "Recent tattoo/piercing (wait 6 months)",
    );
  });

  test("Should handle multiple ineligibility reasons", async () => {
    const data = getBaseFormData();
    data.weight = 40;
    data.medicalConditions = { cancer: true };

    const form = new DonorHealth(data);
    await form.save();

    expect(form.eligibility.isEligible).toBe(false);
    expect(form.eligibility.reasonsForIneligibility).toContain(
      "Weight below 50kg",
    );
    expect(form.eligibility.reasonsForIneligibility).toContain(
      "Cancer history",
    );
  });
});

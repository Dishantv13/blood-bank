import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContainer";
import {
  useUpdateDonorInfoMutation,
  useVerifyAadharMutation,
} from "../store/userApi";
import { ROUTE_PATH } from "../enum/routePath";
import {
  FaShieldAlt,
  FaCheck,
  FaSatelliteDish,
  FaMapMarkerAlt,
  FaFileAlt,
  FaUndo,
  FaCheckCircle,
} from "react-icons/fa";
import DatePicker from "../components/DatePicker";
import "../pages.css/DonorHealthForm.css";

const defaultFormValues = {
  weight: "",
  height: "",
  dateOfBirth: "",
  gender: "",
  lastDonationDate: "",
  totalDonations: 0,
  bloodPressure: "",
  hemoglobinLevel: "",
  diseases: {
    hiv: false,
    hepatitisB: false,
    hepatitisC: false,
    malaria: false,
    tuberculosis: false,
    heartDisease: false,
    diabetes: false,
    cancer: false,
    bloodDisorder: false,
    epilepsy: false,
  },
  recentConditions: {
    fever: false,
    coldOrFlu: false,
    antibiotics: false,
    surgery: false,
    tattooOrPiercing: false,
    pregnancy: false,
    vaccination: false,
  },
  lifestyle: {
    alcohol: "",
    smoking: "",
    drugUse: false,
  },
  emergencyContact: {
    name: "",
    phone: "",
    relationship: "",
  },
  address: {
    pincode: "",
  },
  consent: {
    informationAccurate: false,
    consentToDonate: false,
    understandsProcess: false,
  },
};

const keepOnlyDigits = (event, maxLength) => {
  const digits = String(event.target.value ?? "").replace(/\D/g, "");
  event.target.value = digits.slice(0, maxLength);
};

const DonorHealthForm = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Wizard States
  const [currentStep, setCurrentStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [aadharVerified, setAadharVerified] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState("");

  const [updateDonorInfo, { isLoading }] = useUpdateDonorInfoMutation();
  const [verifyAadhar] = useVerifyAadharMutation();

  const {
    register,
    watch,
    reset,
    setValue,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });

  const watchDOB = watch("dateOfBirth");

  useEffect(() => {
    if (!user) {
      navigate(ROUTE_PATH.LOGIN);
    }
  }, [user, navigate]);

  useEffect(() => {
    const infoSource = user?.healthForm || user?.donorInfo;
    if (infoSource) {
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return isNaN(d) ? "" : d.toISOString().split("T")[0];
      };

      reset({
        ...defaultFormValues,
        ...user.donorInfo,
        ...user?.healthForm,
        dateOfBirth: formatDate(
          user.donorInfo?.dateOfBirth || user?.healthForm?.dateOfBirth,
        ),
        lastDonationDate: formatDate(
          user.donorInfo?.lastDonationDate ||
            user?.healthForm?.donationHistory?.lastDonationDate,
        ),
      });

      if (user.donorInfo?.dateOfBirth) {
        setAadharVerified(true);
      }
    }
  }, [user, reset]);

  const handleNext = async (e) => {
    if (e) e.preventDefault(); // Safety to prevent form submission
    let fields = [];
    if (currentStep === 1) fields = ["weight", "height", "gender"];
    if (currentStep === 2) fields = ["diseases", "recentConditions"];
    if (currentStep === 3) fields = ["dateOfBirth"];

    const isValid = await trigger(fields);
    if (isValid) {
      if (currentStep === 3 && !aadharVerified) {
        toast.error("Identity verification is required to proceed.");
        return;
      }
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = (e) => {
    if (e) e.preventDefault();
    setCurrentStep((prev) => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleAadharVerification = async (file) => {
    if (!file) return;

    setIsScanning(true);
    setAadharVerified(false);
    setError("");

    // Step 1: Client-Side Heuristic
    const fileName = file.name.toLowerCase();
    const isAllowed = fileName.includes("adhar") || fileName.includes("aadhar");

    if (!isAllowed) {
      setIsScanning(false);
      setError(
        "Security Error: Document rejected. Please upload a valid Aadhaar document.",
      );
      toast.error("Identity Verification Failed.");
      return;
    }

    toast.info("Securely scanning Aadhaar...");
    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await verifyAadhar(formData).unwrap();

      const extractedDob = response?.dob || response?.data?.dob;
      if (extractedDob) {
        setValue("dateOfBirth", extractedDob);
        setAadharVerified(true);
        toast.success("Security Match: Verified by Secure ID Server.");
      } else {
        throw new Error("Verification Failed - No DOB extracted");
      }
    } catch (err) {
      console.error("[Identity] Connection failed:", err);
      setError(
        `Security Failure: ${err.message || "Server connection interrupted."}`,
      );
      toast.error("Identity Verification Failed.");
    } finally {
      setIsScanning(false);
    }
  };

  const resetVerification = () => {
    setAadharVerified(false);
    toast.info(
      "Identity verification reset. You can now change DOB or re-upload.",
    );
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationShared(true);
        setGettingLocation(false);
        toast.success("Location Captured!");
      },
      () => {
        setGettingLocation(false);
        toast.error("Failed to get location");
      },
    );
  };

  const onSubmit = async (data) => {
    try {
      const birthDate = new Date(data.dateOfBirth);
      const age = Math.floor(
        (new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000),
      );
      const isEligible =
        parseFloat(data.weight) >= 50 && age >= 18 && age <= 65;

      const submitData = {
        ...data,
        isEligible,
        location: location
          ? {
              type: "Point",
              coordinates: [location.longitude, location.latitude],
            }
          : undefined,
        lastUpdated: new Date().toISOString(),
      };

      const response = await updateDonorInfo(submitData).unwrap();
      const updatedUser = response?.user || response?.data || response;
      if (updatedUser) setUser(updatedUser);

      toast.success("Health Profile Updated Successfully!");
      navigate(ROUTE_PATH.DASHBOARD);
    } catch (err) {
      toast.error("Failed to update. Please try again.");
    }
  };

  return (
    <div className="donor-form-container">
      {/* Identity Banner */}
      <div className="donor-identity-banner">
        <div className="identity-info">
          <div className="badge">DONOR</div>
          <p>
            <strong>{user?.name}</strong> | {user?.phone}
          </p>
        </div>
        <div className="secure-badge">
          <FaShieldAlt /> Private & Secure Verification
        </div>
      </div>

      <div className="donor-form-header">
        <h1>Donor Eligibility Questionnaire</h1>
        <div className="stepper">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`step ${currentStep >= s ? "active" : ""} ${currentStep > s ? "complete" : ""}`}
            >
              <div className="num">{currentStep > s ? <FaCheck /> : s}</div>
              <span className="label">
                {s === 1 && "Vitals"}
                {s === 2 && "Medical"}
                {s === 3 && "Verification"}
                {s === 4 && "Consent"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="donor-health-form">
        {/* STEP 1: VITALS */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>Step 1: Physical Parameters</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  {...register("weight", { required: true, min: 50 })}
                  placeholder="Min 50kg"
                />
                {errors.weight && (
                  <small className="err">Requirement: Min 50kg</small>
                )}
              </div>
              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  {...register("height", { required: true })}
                  placeholder="e.g. 170"
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select {...register("gender", { required: true })}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Emergency Location Sharing</label>
                <button
                  type="button"
                  className={`btn-loc ${locationShared ? "active" : ""}`}
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <>
                      <FaSatelliteDish /> Accessing...
                    </>
                  ) : locationShared ? (
                    <>
                      <FaMapMarkerAlt /> Location Shared
                    </>
                  ) : (
                    <>
                      <FaMapMarkerAlt /> Share My Location
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MEDICAL */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2>Step 2: Medical Screening</h2>
            <div className="screening-section">
              <h3>Have you ever had:</h3>
              <div className="toggle-grid">
                {Object.keys(defaultFormValues.diseases).map((d) => (
                  <label key={d} className="toggle-item">
                    <input type="checkbox" {...register(`diseases.${d}`)} />
                    <div className="toggle-btn">
                      <span className="box"></span>
                      <span className="txt">
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: VERIFICATION HUB */}
        {currentStep === 3 && (
          <div className="step-content">
            <h2>Step 3: Identity & DOB Verification</h2>
            <p className="notice">
              We need to match your Date of Birth from your Aadhaar card.
            </p>

            <div className="verification-hub">
              <div className="aadhar-scan-box">
                {isScanning ? (
                  <div className="scanning-overlay">
                    <div className="scanner-line"></div>
                    <div className="scan-details">
                      <p>
                        <FaSatelliteDish /> Extracting DOB from Aadhaar card...
                      </p>
                      <small>Please wait while we reach UIDAI records...</small>
                    </div>
                  </div>
                ) : aadharVerified ? (
                  <div className="verified-view-card">
                    <div className="match-status">
                      <div className="status-badge success">
                        AUTO-FILLED <FaCheckCircle />
                      </div>
                      <div className="comparison-box">
                        <div className="comp-item">
                          <span>Verified Date of Birth</span>
                          <strong>{watchDOB}</strong>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-retry"
                      onClick={resetVerification}
                    >
                      <FaUndo /> Re-scan different document
                    </button>
                  </div>
                ) : (
                  <div className="upload-view">
                    <label className="upload-btn">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          handleAadharVerification(e.target.files[0])
                        }
                        hidden
                      />
                      <div className="upload-inner">
                        <span className="icon">
                          <FaFileAlt />
                        </span>
                        <strong>Upload Aadhaar (Image or PDF)</strong>
                        <p>e-Aadhaar PDFs are now supported</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* DOB Field - Now Auto-filled after scan */}
              <div className="form-group large" style={{ marginTop: "2rem" }}>
                <label>Date of Birth (Auto-filled from Aadhaar) *</label>
                <DatePicker
                  value={watch("dateOfBirth")}
                  onChange={(date) => {
                    setValue("dateOfBirth", date.toISOString().split("T")[0]);
                  }}
                  placeholder="Will be filled after scan"
                />
                {!aadharVerified && (
                  <small className="hint-txt">
                    Upload your card above to populate this field
                  </small>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: CONSENT */}
        {currentStep === 4 && (
          <div className="step-content">
            <h2>Step 4: Final Consent</h2>
            <div className="consent-grid">
              {[
                "informationAccurate",
                "consentToDonate",
                "understandsProcess",
              ].map((field) => (
                <label key={field} className="consent-item">
                  <input
                    type="checkbox"
                    {...register(`consent.${field}`, { required: true })}
                  />
                  <div className="consent-check">
                    <span className="dot"></span>
                    <p>
                      {field === "informationAccurate" &&
                        "I declare all information is true and accurate."}
                      {field === "consentToDonate" &&
                        "I consent to donate blood and undergo necessary testing."}
                      {field === "understandsProcess" &&
                        "I acknowledge that I understand the donation procedure."}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="form-nav">
          {currentStep > 1 && (
            <button type="button" className="btn-sub" onClick={handleBack}>
              Previous
            </button>
          )}

          {currentStep < 4 ? (
            <button type="button" className="btn-pri" onClick={handleNext}>
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="btn-pri finish"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Submit Health Report"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DonorHealthForm;

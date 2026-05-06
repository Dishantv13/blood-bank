import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useGetProfileQuery, useUpdateProfileMutation } from "../store/userApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastContainer";
import MapModal from "../components/MapModal";
import {
  nameValidator,
  phoneValidator,
  pincodeValidator,
} from "../validation/validation";
import {
  BLOOD_GROUPS,
  MAX_IMAGE_SIZE_BYTES,
  MESSAGE_DISPLAY_MS,
} from "../enum/constants";
import "../pages.css/Profile.css";
import SkeletonLoader from "../components/SkeletonLoader";
import DonorBadges from "../components/DonorBadges";
import DonationTimeline from "../components/DonationTimeline";
import { useGetMyDonationsQuery } from "../store/donationApi";
import {
  FaAward,
  FaHistory,
  FaCheckCircle,
  FaExclamationCircle,
  FaTimesCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";

const defaultFormValues = {
  name: "",
  phone: "",
  bloodGroup: "",
  isDonor: false,
  isAvailable: true,
  address: {
    street: "",
    city: "",
    state: "",
    pincode: "",
  },
  location: null,
};

const keepOnlyDigits = (event, maxLength) => {
  const digits = String(event.target.value ?? "").replace(/\D/g, "");
  event.target.value = digits.slice(0, maxLength);
};

const Profile = () => {
  const { setUser: setAuthUser } = useAuth();
  const toast = useToast();

  // RTK Query Hooks replace manual fetching and state
  const { data: userRes, isLoading: loadingProfile } = useGetProfileQuery();
  const { data: donationRes } = useGetMyDonationsQuery(undefined, {
    skip: !userRes?.data?.isDonor,
  });
  const [updateProfileMutation] = useUpdateProfileMutation();
  const user = userRes?.data || null;

  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const {
    register,
    watch,
    reset,
    setValue,
    handleSubmit: handleFormSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });

  const watchedIsDonor = watch("isDonor");
  const watchedIsAvailable = watch("isAvailable");
  const watchedLocation = watch("location");

  // Once RTK fetches the profile, inject it into the Hook Form
  useEffect(() => {
    if (user) {
      const profileAddress = user.address || {};
      reset({
        name: user.name || "",
        phone: user.phone || "",
        bloodGroup: user.bloodGroup || "",
        isDonor: user.isDonor || false,
        isAvailable: user.isAvailable ?? true,
        address: {
          street: profileAddress.street || "",
          city: profileAddress.city || "",
          state: profileAddress.state || "",
          pincode: profileAddress.pincode || "",
        },
        location: user.location || null,
      });

      // Load profile image from localStorage
      const savedImage = localStorage.getItem(`userPhoto_${user._id}`);
      if (savedImage) {
        setPreviewImage(savedImage);
      }
    }
  }, [user, reset]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setValue(
          "location",
          {
            type: "Point",
            coordinates: [coords.longitude, coords.latitude],
          },
          { shouldDirty: true },
        );
        setGettingLocation(false);
        toast.success("Location captured successfully!");
      },
      (error) => {
        setGettingLocation(false);
        toast.error(`Unable to retrieve location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setMessageType("error");
        setMessage("Image size should be less than 5MB");
        setTimeout(() => setMessage(""), MESSAGE_DISPLAY_MS);
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage) {
      setMessageType("error");
      setMessage("Please select an image first");
      setTimeout(() => setMessage(""), MESSAGE_DISPLAY_MS);
      return;
    }

    try {
      setUploadingImage(true);

      // Save to localStorage
      const userId = user?._id || "default";
      localStorage.setItem(`userPhoto_${userId}`, previewImage);

      setMessageType("success");
      setMessage("Profile picture updated successfully!");
      setProfileImage(null);
      setTimeout(() => setMessage(""), MESSAGE_DISPLAY_MS);
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessageType("error");
      setMessage("Failed to upload image. Please try again.");
      setTimeout(() => setMessage(""), MESSAGE_DISPLAY_MS);
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const normalizedData = {
        ...data,
        phone: String(data.phone ?? "").replace(/\D/g, ""),
        address: {
          ...data.address,
          pincode: String(data.address?.pincode ?? "").trim(),
        },
      };

      if (!normalizedData.isDonor) {
        normalizedData.isAvailable = true;
      }

      const response = await updateProfileMutation(normalizedData).unwrap();

      setMessageType("success");
      setMessage("Profile updated successfully!");
      toast.success("Profile updated successfully!");
      setEditing(false);

      // Update global auth context
      const updatedUser = response.user || response.data || response;
      setAuthUser(updatedUser);

      setTimeout(() => setMessage(""), MESSAGE_DISPLAY_MS);
    } catch (error) {
      setMessageType("error");
      setMessage("Failed to update profile");
      toast.error("Failed to update profile. Please try again.");
      setTimeout(() => setMessage(""), MESSAGE_DISPLAY_MS);
    }
  };

  if (loadingProfile) {
    return <SkeletonLoader />;
  }

  // bloodGroups imported from constants

  return (
    <div className="page-container">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {previewImage || user?.profilePicture ? (
                <img
                  src={previewImage || user?.profilePicture}
                  alt="Profile"
                  className="profile-image"
                />
              ) : (
                <svg width="64" height="64" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="10"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M3 19C3 15.134 6.13401 12 10 12C13.866 12 17 15.134 17 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <div className="avatar-upload">
              <input
                type="file"
                id="profileImageInput"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <label htmlFor="profileImageInput" className="upload-btn">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M17 13v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M15 8l-5-5m0 0L5 8m5-5v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Upload Photo
              </label>
              {profileImage && (
                <button
                  onClick={handleImageUpload}
                  className="save-image-btn"
                  disabled={uploadingImage}
                >
                  {uploadingImage ? "Uploading..." : "Save Photo"}
                </button>
              )}
            </div>
          </div>
          <div className="profile-header-info">
            <h1>{user?.name}</h1>
            <p>{user?.email}</p>
            <span className="blood-group-badge">{user?.bloodGroup}</span>
          </div>
        </div>

        {message && (
          <div
            className={`message ${messageType === "success" ? "success-message" : "error-message"}`}
          >
            {message}
          </div>
        )}

        <div className="profile-content">
          {!editing ? (
            <div className="profile-view">
              <div className="profile-section">
                <h2>Personal Information</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name:</label>
                    <span>{user?.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{user?.email}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone:</label>
                    <span>{user?.phone}</span>
                  </div>
                  <div className="info-item">
                    <label>Blood Group:</label>
                    <span>{user?.bloodGroup}</span>
                  </div>
                  <div className="info-item">
                    <label>Role:</label>
                    <span className="role-badge">{user?.role}</span>
                  </div>
                  <div className="info-item">
                    <label>Donor Status:</label>
                    <span>
                      {user?.isDonor ? (
                        <>
                          <FaCheckCircle color="green" /> Registered Donor
                        </>
                      ) : (
                        <>
                          <FaTimesCircle color="red" /> Not a Donor
                        </>
                      )}
                    </span>
                  </div>
                  {user?.isDonor && (
                    <div className="info-item">
                      <label>Availability:</label>
                      <span>
                        {user?.isAvailable ? (
                          <>
                            <FaCheckCircle color="green" /> Available
                          </>
                        ) : (
                          <>
                            <FaTimesCircle color="red" /> Not Available
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {user?.address && (
                <div className="profile-section">
                  <h2>Address</h2>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Street:</label>
                      <span>{user.address.street || "Not provided"}</span>
                    </div>
                    <div className="info-item">
                      <label>City:</label>
                      <span>{user.address.city || "Not provided"}</span>
                    </div>
                    <div className="info-item">
                      <label>State:</label>
                      <span>{user.address.state || "Not provided"}</span>
                    </div>
                    <div className="info-item">
                      <label>Pincode:</label>
                      <span>{user.address.pincode || "Not provided"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Section */}
              <div className="profile-section">
                <h2>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ verticalAlign: "middle", marginRight: "8px" }}
                  >
                    <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                    <circle cx="12" cy="7" r="2" />
                  </svg>
                  My Location
                </h2>
                {user?.location?.coordinates &&
                user.location.coordinates[0] !== 0 &&
                user.location.coordinates[1] !== 0 ? (
                  <div className="location-info-card">
                    <div className="location-coords">
                      <span className="coord-label">Latitude:</span>
                      <span className="coord-value">
                        {user.location.coordinates[1].toFixed(6)}
                      </span>
                      <span className="coord-label">Longitude:</span>
                      <span className="coord-value">
                        {user.location.coordinates[0].toFixed(6)}
                      </span>
                    </div>
                    <button
                      className="btn-view-map"
                      onClick={() => setShowMapModal(true)}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                        <circle cx="12" cy="7" r="2" />
                      </svg>
                      View on Map
                    </button>
                  </div>
                ) : (
                  <div className="no-location-card">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      opacity="0.5"
                    >
                      <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                      <circle cx="12" cy="7" r="2" />
                    </svg>
                    <p>No location shared yet</p>
                    <small>Edit your profile to share your location</small>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleFormSubmit(onSubmit)}
              className="profile-edit-form"
            >
              <div className="profile-section">
                <h2>Edit Personal Information</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      className="form-control"
                      {...register("name", {
                        validate: nameValidator,
                      })}
                    />
                    {errors.name && (
                      <small className="error-message">
                        {errors.name.message}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      className="form-control"
                      inputMode="numeric"
                      maxLength={10}
                      onInput={(event) => keepOnlyDigits(event, 10)}
                      {...register("phone", {
                        setValueAs: (value) =>
                          String(value ?? "")
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        validate: phoneValidator,
                      })}
                    />
                    {errors.phone && (
                      <small className="error-message">
                        {errors.phone.message}
                      </small>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="bloodGroup">Blood Group</label>
                    <select
                      id="bloodGroup"
                      className="form-control"
                      {...register("bloodGroup", {
                        required: "Blood group is required",
                      })}
                    >
                      <option value="">Select blood group</option>
                      {BLOOD_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                    {errors.bloodGroup && (
                      <small className="error-message">
                        {errors.bloodGroup.message}
                      </small>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Register as a blood donor</label>
                  <div className="option-cards">
                    <label
                      className={`option-card ${watchedIsDonor === true ? "selected" : ""}`}
                      onClick={() =>
                        setValue("isDonor", true, { shouldDirty: true })
                      }
                    >
                      <input
                        type="radio"
                        name="isDonor"
                        value="true"
                        {...register("isDonor")}
                        checked={watchedIsDonor === true}
                        onChange={() =>
                          setValue("isDonor", true, { shouldDirty: true })
                        }
                      />
                      <div className="option-content">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                        <span className="option-title">Yes</span>
                        <small>I'm a donor</small>
                      </div>
                    </label>

                    <label
                      className={`option-card ${watchedIsDonor === false ? "selected" : ""}`}
                      onClick={() =>
                        setValue("isDonor", false, { shouldDirty: true })
                      }
                    >
                      <input
                        type="radio"
                        name="isDonor"
                        value="false"
                        {...register("isDonor")}
                        checked={watchedIsDonor === false}
                        onChange={() =>
                          setValue("isDonor", false, { shouldDirty: true })
                        }
                      />
                      <div className="option-content">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span className="option-title">No</span>
                        <small>Not a donor</small>
                      </div>
                    </label>
                  </div>
                </div>

                {watchedIsDonor && (
                  <div className="form-group">
                    <label>Available for donation</label>
                    <div className="option-cards">
                      <label
                        className={`option-card ${watchedIsAvailable === true ? "selected" : ""}`}
                        onClick={() =>
                          setValue("isAvailable", true, { shouldDirty: true })
                        }
                      >
                        <input
                          type="radio"
                          name="isAvailable"
                          value="true"
                          {...register("isAvailable")}
                          checked={watchedIsAvailable === true}
                          onChange={() =>
                            setValue("isAvailable", true, { shouldDirty: true })
                          }
                        />
                        <div className="option-content">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="option-title">Yes</span>
                          <small>Ready to donate</small>
                        </div>
                      </label>

                      <label
                        className={`option-card ${watchedIsAvailable === false ? "selected" : ""}`}
                        onClick={() =>
                          setValue("isAvailable", false, { shouldDirty: true })
                        }
                      >
                        <input
                          type="radio"
                          name="isAvailable"
                          value="false"
                          {...register("isAvailable")}
                          checked={watchedIsAvailable === false}
                          onChange={() =>
                            setValue("isAvailable", false, {
                              shouldDirty: true,
                            })
                          }
                        />
                        <div className="option-content">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <span className="option-title">No</span>
                          <small>Not available now</small>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="profile-section">
                <h2>Edit Address</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address.street">Street</label>
                    <input
                      type="text"
                      id="address.street"
                      className="form-control"
                      {...register("address.street")}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address.city">City</label>
                    <input
                      type="text"
                      id="address.city"
                      className="form-control"
                      {...register("address.city")}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="address.state">State</label>
                    <input
                      type="text"
                      id="address.state"
                      className="form-control"
                      {...register("address.state")}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address.pincode">Pincode</label>
                    <input
                      type="text"
                      id="address.pincode"
                      className="form-control"
                      inputMode="numeric"
                      maxLength={6}
                      onInput={(event) => keepOnlyDigits(event, 6)}
                      {...register("address.pincode", {
                        setValueAs: (value) =>
                          String(value ?? "")
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        validate: (value) => {
                          if (!String(value ?? "").trim()) return true;
                          return pincodeValidator(value);
                        },
                      })}
                    />
                    {errors.address?.pincode && (
                      <small className="error-message">
                        {errors.address.pincode.message}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Section in Edit Mode */}
              <div className="profile-section">
                <h2>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ verticalAlign: "middle", marginRight: "8px" }}
                  >
                    <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                    <circle cx="12" cy="7" r="2" />
                  </svg>
                  Share Your Location
                </h2>
                <p className="location-help-text">
                  Share your location so patients can find nearby donors easily.
                </p>

                <div className="location-capture-section">
                  <button
                    type="button"
                    className={`btn-capture-location ${watchedLocation ? "has-location" : ""}`}
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <>
                        <span className="spinner-small"></span>
                        Getting Location...
                      </>
                    ) : watchedLocation ? (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Location Captured - Click to Update
                      </>
                    ) : (
                      <>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2C9.5 2 7 4 7 7C7 11 12 18 12 18C12 18 17 11 17 7C17 4 14.5 2 12 2Z" />
                          <circle cx="12" cy="7" r="2" />
                        </svg>
                        Capture My Location
                      </>
                    )}
                  </button>

                  {watchedLocation && (
                    <div className="captured-location-info">
                      <span>
                        <FaMapMarkerAlt /> Lat:{" "}
                        {watchedLocation.coordinates[1].toFixed(6)}, Lng:{" "}
                        {watchedLocation.coordinates[0].toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const userAddress = user?.address || {};
                    reset({
                      name: user?.name || "",
                      phone: user?.phone || "",
                      bloodGroup: user?.bloodGroup || "",
                      isDonor: user?.isDonor || false,
                      isAvailable: user?.isAvailable ?? true,
                      address: {
                        street: userAddress.street || "",
                        city: userAddress.city || "",
                        state: userAddress.state || "",
                        pincode: userAddress.pincode || "",
                      },
                      location: user?.location || null,
                    });
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Map Modal for viewing location */}
      {showMapModal && user?.location && (
        <MapModal
          location={user.location}
          name={user.name}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
};

export default Profile;

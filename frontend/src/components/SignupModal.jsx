import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { ROUTE_PATH } from "../enum/routePath";
import Modal from "./Modal";
import "../components.css/SignupModal.css";

import {
  nameValidator,
  phoneValidator,
  emailValidator,
  pincodeValidator,
} from "../validation/validation";
import { BLOOD_GROUPS } from "../config/constants";

const SignupModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { register: registerUser, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch("password");

  // bloodGroups imported from constants

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      name: data.name?.trim(),
      email: data.email?.trim().toLowerCase(),
      phone: data.phone?.replace(/\D/g, "").slice(0, 10),
      address: {
        street: data.address?.street?.trim() || "",
        city: data.address?.city?.trim() || "",
            state: data.address?.state?.trim() || "", // State input
            pincode: String(data.address?.pincode ?? "").replace(/\D/g, "").slice(0, 6), // Pincode input
      },
    };

    const result = await registerUser(payload);

    if (result.success) {
      onClose();
      navigate(ROUTE_PATH.DASHBOARD);
    } else {
      alert(result.message);
    }
  };

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();

      if (result.success) {
        onClose();
        navigate(ROUTE_PATH.DASHBOARD);
      } else if (result.message && !result.message.includes('popup was closed')) {
        alert(result.message);
      }
    } catch (error) {
      console.error("Google Signup Error:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Your Account">
      <form onSubmit={handleSubmit(onSubmit)} className="signup-modal-form">
        {/* Personal Info */}

        <div className="form-section-title">Personal Information</div>

        {/* Name */}

        <div className="form-group">
          <label>
            <span className="label-icon">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
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
            </span>
            Full Name *
          </label>

          <input
            className="form-control"
            placeholder="Enter your full name"
            {...register("name", { validate: nameValidator })}
          />

          {errors.name && <p className="error-text">{errors.name.message}</p>}
        </div>

        {/* Email */}

        <div className="form-group">
          <label>
            <span className="label-icon">
              <svg width="16" height="16" viewBox="0 -3 20 20" fill="none">
                <path
                  d="M3 4H17C18.1 4 19 4.9 19 6V14C19 15.1 18.1 16 17 16H3C1.9 16 1 15.1 1 14V6C1 4.9 1.9 4 3 4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M19 6L10 11L1 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Email Address *
          </label>

          <input
            className="form-control"
            placeholder="your.email@example.com"
            type="email"
            {...register("email", { validate: emailValidator })}
          />

          {errors.email && <p className="error-text">{errors.email.message}</p>}
        </div>

        {/* Password Row */}

        <div className="form-row">
          <div className="form-group password-field">
            <label>
              <span className="label-icon">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3"
                    y="9"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M6 9V6C6 3.79 7.79 2 10 2C12.21 2 14 3.79 14 6V9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              Password *
            </label>

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "password" : "text"}
                className="form-control"
                placeholder="Minimum 6 characters"
                {...register("password", {
                  required: "Password required",
                  minLength: { value: 6, message: "Minimum 6 characters" },
                })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Show password" : "Hide password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86"/>
                    <path d="M14.12 14.12a3 3 0 01-4.24-4.24"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {errors.password && (
              <p className="error-text">{errors.password.message}</p>
            )}
          </div>

          <div className="form-group password-field">
            <label>
              <span className="label-icon">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3"
                    y="9"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M6 9V6C6 3.79 7.79 2 10 2C12.21 2 14 3.79 14 6V9"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              Confirm Password
            </label>

            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "password" : "text"}
                className="form-control"
                placeholder="Re-enter password"
                {...register("confirmPassword", {
                  required: "Confirm password required",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                })}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Show confirm password" : "Hide confirm password"}
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86"/>
                    <path d="M14.12 14.12a3 3 0 01-4.24-4.24"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="error-text">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {/* Phone + Blood Group */}

        <div className="form-row">
          <div className="form-group">
            <label>
              <span className="label-icon">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="5"
                    y="2"
                    width="10"
                    height="16"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M10 15H10.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Phone Number *
            </label>

            <input
              className="form-control"
              placeholder="Enter phone number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              {...register("phone", {
                validate: phoneValidator,
                setValueAs: (value) => String(value ?? "").replace(/\D/g, "").slice(0, 10),
              })}
              onInput={(event) => {
                event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 10);
              }}
            />

            {errors.phone && (
              <p className="error-text">{errors.phone.message}</p>
            )}
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 2C10 2 5 7.5 5 12C5 14.76 7.23 17 10 17C12.76 17 15 14.76 15 12C15 7.5 10 2 10 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              Blood Group *
            </label>

            <select
              className="form-control"
              {...register("bloodGroup", { required: "Blood group required" })}
            >
              <option value="">Select Blood Group</option>

              {bloodGroups.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>

            {errors.bloodGroup && (
              <p className="error-text">{errors.bloodGroup.message}</p>
            )}
          </div>
        </div>

        {/* Checkboxes */}

        <div className="form-group-checkbox">
          <label className="checkbox-label">
            <input type="checkbox" {...register("isDonor")} />
            <span>I want to register as a blood donor</span>
          </label>
        </div>

        <div className="form-group-checkbox">
          <label className="checkbox-label">
            <input type="checkbox" {...register("needsBlood")} />
            <span>I need blood / Looking for blood donors</span>
          </label>
        </div>

        {/* Address */}

        <div className="form-section-title">Address (Optional)</div>

        <div className="form-row">
          <div className="form-group">
            <label>Street</label>
            <input className="form-control" {...register("address.street")} />
          </div>

          <div className="form-group">
            <label>City</label>
            <input className="form-control" {...register("address.city")} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>State</label>
            <input className="form-control" {...register("address.state")} />
          </div>

          <div className="form-group">
            <label>Pincode</label>
            <input
              className="form-control"
              type="text"
              inputMode="numeric"
              maxLength={6}
              {...register("address.pincode", {
                setValueAs: (value) =>
                  String(value ?? "")
                    .replace(/\D/g, "")
                    .slice(0, 6),
                validate: pincodeValidator,
              })}
              onInput={(event) => {
                event.target.value = String(event.target.value || "")
                  .replace(/\D/g, "")
                  .slice(0, 6);
              }}
            />
            {errors.address?.pincode && (
              <p className="error-text">{errors.address.pincode.message}</p>
            )}
          </div>
        </div>

        {/* Submit */}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Creating Account...
            </>
          ) : (
            <>
              <span className="btn-icon1">
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <path
                    d="M16 6L8 14L4 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Sign Up
            </>
          )}
        </button>

        <div className="divider">
          <span>OR</span>
        </div>

        {/* Google */}

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading || isSubmitting}
        >
          {isGoogleLoading ? (
            <span className="spinner"></span>
          ) : (
            <svg className="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {isGoogleLoading ? "Connecting..." : "Continue with Google"}
        </button>


        <div className="blood-bank-register-link">
          <p>
            Are you a Blood Bank?{" "}
            <Link to={ROUTE_PATH.BLOOD_BANK_REGISTER} onClick={onClose}>
              Register here
            </Link>
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default SignupModal;

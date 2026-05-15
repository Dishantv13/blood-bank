import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { phoneValidator, emailValidator } from "../validation/validation";
import DatePicker from "./DatePicker";
import "../components.css/EventFormModal.css";

const EventFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      eventType: "blood-drive",
      date: "",
      startTime: "09:00",
      endTime: "17:00",
      location: {
        name: "",
        address: "",
        coordinates: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
      contactInfo: {
        phone: "",
        email: "",
      },
      expectedDonors: 50,
      maxParticipants: 100,
      visibility: "public",
    },
  });

  // Watch fields for cross-validation
  const expectedDonors = watch("expectedDonors");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Clone and format date for the input (YYYY-MM-DD)
        const data = JSON.parse(JSON.stringify(initialData));
        if (data.date && data.date.includes("T")) {
          data.date = data.date.split("T")[0];
        }
        reset(data);
      } else {
        reset({
          title: "",
          description: "",
          eventType: "blood-drive",
          date: "",
          startTime: "09:00",
          endTime: "17:00",
          location: {
            name: "",
            address: "",
            coordinates: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
          contactInfo: {
            phone: "",
            email: "",
          },
          expectedDonors: 50,
          maxParticipants: 100,
          visibility: "public",
        });
      }
    }
  }, [initialData, reset, isOpen]);

  // Standard phone register to extract onChange
  const { onChange: phoneOnChange, ...phoneRegister } = register(
    "contactInfo.phone",
    {
      required: "Phone is required",
      validate: phoneValidator,
    },
  );

  const handlePhoneChange = (e) => {
    // Only allow digits and limit to 10
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    e.target.value = value;
    phoneOnChange(e);
  };

  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? "Edit Event" : "Create New Event"}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="event-form">
          {/* Title */}
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              {...register("title", { required: "Title is required" })}
              placeholder="e.g., Blood Donation Drive 2026"
              className={errors.title ? "error" : ""}
            />
            {errors.title && (
              <span className="error-text">{errors.title.message}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description *</label>
            <textarea
              {...register("description", {
                required: "Description is required",
              })}
              placeholder="Describe the event details..."
              rows="4"
              className={errors.description ? "error" : ""}
            />
            {errors.description && (
              <span className="error-text">{errors.description.message}</span>
            )}
          </div>

          {/* Event Type */}
          <div className="form-row">
            <div className="form-group">
              <label>Event Type *</label>
              <select {...register("eventType")}>
                <option value="blood-drive">Blood Drive</option>
                <option value="awareness">Awareness Campaign</option>
                <option value="health-checkup">Health Checkup</option>
              </select>
            </div>

            <div className="form-group">
              <label>Visibility *</label>
              <select {...register("visibility")}>
                <option value="public">Public</option>
                <option value="donors-only">For Donors Only</option>
                <option value="patients-only">For Patients Only</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Event Date *</label>
              <DatePicker
                value={watch("date")}
                onChange={(date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setValue("date", `${year}-${month}-${day}`, { shouldValidate: true });
                }}
                minDate={new Date()}
                placeholder="Choose Event Date"
              />
              {errors.date && (
                <span className="error-text">{errors.date.message}</span>
              )}
            </div>

            <div className="form-group">
              <label>Start Time *</label>
              <input type="time" {...register("startTime")} />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input type="time" {...register("endTime")} />
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location Name *</label>
            <input
              type="text"
              {...register("location.name", {
                required: "Location name is required",
              })}
              placeholder="e.g., City Hospital"
              className={errors.location?.name ? "error" : ""}
            />
            {errors.location?.name && (
              <span className="error-text">{errors.location.name.message}</span>
            )}
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              {...register("location.address")}
              placeholder="Full address"
            />
          </div>

          {/* Contact Info */}
          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                {...register("contactInfo.email", {
                  required: "Email is required",
                  validate: emailValidator,
                })}
                placeholder="contact@example.com"
                className={errors.contactInfo?.email ? "error" : ""}
              />
              {errors.contactInfo?.email && (
                <span className="error-text">
                  {errors.contactInfo.email.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                {...phoneRegister}
                onChange={handlePhoneChange}
                placeholder="9876543210"
                className={errors.contactInfo?.phone ? "error" : ""}
              />
              {errors.contactInfo?.phone && (
                <span className="error-text">
                  {errors.contactInfo.phone.message}
                </span>
              )}
            </div>
          </div>

          {/* Expected Donors & Max Participants */}
          <div className="form-row">
            <div className="form-group">
              <label>Expected Donors</label>
              <input
                type="number"
                {...register("expectedDonors", {
                  min: { value: 0, message: "Must be positive" },
                })}
                className={errors.expectedDonors ? "error" : ""}
              />
              {errors.expectedDonors && (
                <span className="error-text">
                  {errors.expectedDonors.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Max Participants</label>
              <input
                type="number"
                {...register("maxParticipants", {
                  min: { value: 1, message: "Must be at least 1" },
                  validate: (value) => {
                    return (
                      Number(value) >= Number(expectedDonors) ||
                      "Max participants must be greater than or equal to expected donors"
                    );
                  },
                })}
                className={errors.maxParticipants ? "error" : ""}
              />
              {errors.maxParticipants && (
                <span className="error-text">
                  {errors.maxParticipants.message}
                </span>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading
                ? "Saving..."
                : initialData
                  ? "Update Event"
                  : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventFormModal;

import request from "supertest";
import app from "../../app.js";
import User from "../../models/User.model.js";
import BloodBank from "../../models/BloodBank.model.js";
import BloodRequest from "../../models/BloodRequest.model.js";

describe("Blood Request Integration Tests", () => {
  let user;
  let userCookies;
  let bloodBank;
  let bloodBankCookies;

  beforeEach(async () => {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.default.genSalt(10);
    const hashedPassword = await bcrypt.default.hash("Password123!", salt);

    // Create User
    user = await User.create({
      name: "Test Requestor",
      email: "requestor@example.com",
      password: hashedPassword,
      phone: "1234567890",
      bloodGroup: "A+",
    });

    const userLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "Password123!" });
    userCookies = userLogin.get("Set-Cookie");

    // Create Blood Bank
    bloodBank = await BloodBank.create({
      name: "Test Blood Bank",
      email: "bank@example.com",
      password: hashedPassword,
      phone: "9876543210",
      licenseNumber: "LIC123",
      approvalStatus: "approved",
      isActive: true,
      isVerified: true,
    });

    const bankLogin = await request(app)
      .post("/api/v1/blood-banks/login")
      .send({ email: bloodBank.email, password: "Password123!" });
    bloodBankCookies = bankLogin.get("Set-Cookie");
  });

  describe("POST /api/v1/requests", () => {
    it("should create a new blood request", async () => {
      const requestData = {
        patientName: "Jane Doe",
        bloodGroup: "A+",
        units: 2,
        urgency: "urgent",
        contactNumber: "1234567890",
        hospital: {
          name: "City Hospital",
          address: "123 Main St",
          location: {
            type: "Point",
            coordinates: [77.209, 28.6139],
          },
        },
      };

      const res = await request(app)
        .post("/api/v1/requests")
        .set("Cookie", userCookies)
        .send(requestData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patientName).toBe("Jane Doe");

      const reqInDb = await BloodRequest.findOne({ patientName: "Jane Doe" });
      expect(reqInDb).toBeDefined();
    });
  });

  describe("GET /api/v1/requests/my-requests", () => {
    it("should fetch requests created by the user", async () => {
      await BloodRequest.create({
        requestedBy: user._id,
        patientName: "Jane Doe",
        bloodGroup: "A+",
        units: 2,
        contactNumber: "1234567890",
        hospital: {
          name: "City Hospital",
          address: "123 Main St",
          location: { type: "Point", coordinates: [77.209, 28.6139] },
        },
      });

      const res = await request(app)
        .get("/api/v1/requests/my-requests")
        .set("Cookie", userCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
      expect(res.body.data.data[0].patientName).toBe("Jane Doe");
    });
  });
});

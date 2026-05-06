import request from "supertest";
import app from "../../app.js";
import User from "../../models/User.model.js";
import RegistrationOtp from "../../models/BloodBankRegistrationOtp.model.js";
import * as authService from "../../services/authService.js";
import { jest } from "@jest/globals";

describe("Auth Integration Tests", () => {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
    phone: "1234567890",
    bloodGroup: "A+",
  };

  describe("POST /api/v1/auth/register", () => {
    it("should initiate registration and send OTP", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("OTP sent to your email");
      expect(res.body.data).toHaveProperty("verificationId");
      expect(res.body.data.maskedEmail).toBe("te***t@example.com");
    });

    it("should fail if email already exists", async () => {
      await User.create({
        ...testUser,
        password: "hashedPassword",
      });

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User with this email already exists");
    });
  });

  describe("POST /api/v1/auth/verify-otp", () => {
    let verificationId;
    const fixedOtp = "123456";

    beforeEach(async () => {
      // Manually create a pending registration
      verificationId = "test-v-id";
      const bcrypt = await import("bcryptjs");
      const otpHash = await bcrypt.default.hash(fixedOtp, 10);
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(testUser.password, salt);

      await RegistrationOtp.create({
        verificationId,
        email: testUser.email,
        type: "user",
        otpHash,
        otpExpiresAt: new Date(Date.now() + 100000),
        expiresAt: new Date(Date.now() + 100000),
        registrationData: {
          ...testUser,
          password: hashedPassword,
        },
        status: "pending",
      });
    });

    it("should verify OTP and create user", async () => {
      const res = await request(app).post("/api/v1/auth/verify-otp").send({
        verificationId,
        otp: fixedOtp,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("user");
      expect(res.body.data.user.email).toBe(testUser.email);

      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeDefined();
    });

    it("should fail with incorrect OTP", async () => {
      const res = await request(app).post("/api/v1/auth/verify-otp").send({
        verificationId,
        otp: "000000",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid OTP/i);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      const bcrypt = await import("bcryptjs");
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(testUser.password, salt);
      await User.create({
        ...testUser,
        password: hashedPassword,
      });
    });

    it("should login successfully and set cookies", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("user");
      expect(res.get("Set-Cookie")).toBeDefined();
    });

    it("should fail with wrong password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: "WrongPassword123!",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    let authCookies;

    beforeEach(async () => {
      const bcrypt = await import("bcryptjs");
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(testUser.password, salt);
      await User.create({
        ...testUser,
        password: hashedPassword,
      });

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      authCookies = loginRes.get("Set-Cookie");
    });

    it("should refresh session when refresh token is valid", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", authCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.get("Set-Cookie")).toBeDefined();
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout and clear cookies", async () => {
      const res = await request(app).post("/api/v1/auth/logout").send();

      expect(res.status).toBe(200);
      // Check if cookies are cleared (max-age=0 or expires in past)
      const cookies = res.get("Set-Cookie");
      expect(
        cookies.some((c) => c.includes("Max-Age=0") || c.includes("Expires=")),
      ).toBe(true);
    });
  });
});

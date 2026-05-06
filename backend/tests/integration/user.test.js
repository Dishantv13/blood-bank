import request from "supertest";
import app from "../../app.js";
import User from "../../models/User.model.js";
import { getAuthCookiesForUser } from "./helpers.js";
import { jest } from "@jest/globals";

describe("User Integration Tests", () => {
  let user;
  let authCookies;

  const loginAsUser = async (u) => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: u.email, password: "Password123!" }); // This requires real password
    return loginRes.get("Set-Cookie");
  };

  // Let's refine the approach: use a real login if possible, or manually set cookies.
  // Given our auth.test.js works, we can use real login.

  beforeEach(async () => {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.default.genSalt(10);
    const hashedPassword = await bcrypt.default.hash("Password123!", salt);

    user = await User.create({
      name: "Test Profile User",
      email: "profile@example.com",
      password: hashedPassword,
      phone: "1234567890",
      bloodGroup: "A+",
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "Password123!" });

    authCookies = loginRes.get("Set-Cookie");
  });

  describe("GET /api/v1/users/profile", () => {
    it("should fetch user profile when authenticated", async () => {
      const res = await request(app)
        .get("/api/v1/users/profile")
        .set("Cookie", authCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(user.email);
    });

    it("should fail when not authenticated", async () => {
      const res = await request(app).get("/api/v1/users/profile");

      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/v1/users/profile", () => {
    it("should update user profile", async () => {
      const res = await request(app)
        .put("/api/v1/users/profile")
        .set("Cookie", authCookies)
        .send({
          name: "Updated Name",
          phone: "9876543210",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe("Updated Name");
    });
  });

  describe("PUT /api/v1/users/toggle-mode", () => {
    it("should toggle user mode", async () => {
      // Must set isDonor: true first to toggle to donor mode
      await User.findByIdAndUpdate(user._id, { isDonor: true });

      const res = await request(app)
        .put("/api/v1/users/toggle-mode")
        .set("Cookie", authCookies)
        .send({ mode: "donor" });

      expect(res.status).toBe(200);
      expect(res.body.data.activeMode).toBe("donor");
    });
  });
});

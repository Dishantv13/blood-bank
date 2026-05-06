import request from "supertest";
import app from "../../app.js";
import User from "../../models/User.model.js";
import BloodBank from "../../models/BloodBank.model.js";
import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";

describe("Admin Integration Tests", () => {
  let adminCookies;

  beforeEach(async () => {
    // Ensure admin user exists or mock comparison
    const compareSpy = jest
      .spyOn(bcrypt, "compare")
      .mockImplementation((pass, hash) => {
        if (pass === "AdminPassword123!") return true;
        return bcrypt.compare(pass, hash);
      });

    const loginRes = await request(app)
      .post("/api/v1/admin-auth/login")
      .send({ email: "admin@example.com", password: "AdminPassword123!" });

    if (loginRes.status !== 200) {
      console.error("Admin login failed in test setup:", loginRes.body);
    }

    adminCookies = loginRes.get("Set-Cookie");
    compareSpy.mockRestore();
  });

  describe("GET /api/v1/admin/dashboard/stats", () => {
    it("should fetch admin dashboard stats", async () => {
      const res = await request(app)
        .get("/api/v1/admin/dashboard/stats")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("activeUsers");
    });
  });

  describe("GET /api/v1/admin/users", () => {
    it("should list all users", async () => {
      await User.create({
        name: "Normal User",
        email: "user@example.com",
        password: "hashedPassword",
      });

      const res = await request(app)
        .get("/api/v1/admin/users")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.data.length).toBeGreaterThan(0);
    });
  });

  describe("PATCH /api/v1/admin/bloodbanks/:bankId/status", () => {
    it("should approve a blood bank", async () => {
      const bank = await BloodBank.create({
        name: "Pending Bank",
        email: "pending@example.com",
        password: "hashedPassword",
        phone: "1234567890",
        licenseNumber: "LIC999",
        approvalStatus: "pending",
      });

      const res = await request(app)
        .patch(`/api/v1/admin/bloodbanks/${bank._id}/status`)
        .set("Cookie", adminCookies)
        .send({ status: "approved" });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe("approved");

      const updatedBank = await BloodBank.findById(bank._id);
      expect(updatedBank.approvalStatus).toBe("approved");
    });
  });
});

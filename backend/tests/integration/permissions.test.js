import request from "supertest";
import app from "../../app.js";
import User from "../../models/User.model.js";

describe("Permission Denial Integration Tests", () => {
  let userCookies;

  beforeEach(async () => {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.default.genSalt(10);
    const hashedPassword = await bcrypt.default.hash("Password123!", salt);

    const user = await User.create({
      name: "Regular User",
      email: "regular@example.com",
      password: hashedPassword,
      phone: "1234567890",
      role: "user",
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "regular@example.com", password: "Password123!" });
    userCookies = loginRes.get("Set-Cookie");
  });

  it("should deny regular user from accessing admin routes", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard/stats")
      .set("Cookie", userCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(
      /not authorized|forbidden|access required/i,
    );
  });

  it("should deny regular user from accessing blood bank portal routes", async () => {
    const res = await request(app)
      .get("/api/v1/bloodbank/profile")
      .set("Cookie", userCookies);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should deny regular user from fulfilling a blood request", async () => {
    const res = await request(app)
      .post("/api/v1/requests/some-id/fulfill")
      .set("Cookie", userCookies)
      .send({ unitsProvided: 1 });

    expect(res.status).toBe(401);
  });
});

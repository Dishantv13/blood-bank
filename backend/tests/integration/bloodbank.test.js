import request from "supertest";
import app from "../../app.js";
import BloodBank from "../../models/BloodBank.model.js";
import Inventory from "../../models/Inventory.model.js";
import Event from "../../models/Event.model.js";

describe("Blood Bank Portal Integration Tests", () => {
  let bloodBank;
  let cookies;

  beforeEach(async () => {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.default.genSalt(10);
    const hashedPassword = await bcrypt.default.hash("Password123!", salt);

    bloodBank = await BloodBank.create({
      name: "Portal Blood Bank",
      email: "portal@example.com",
      password: hashedPassword,
      phone: "1234567890",
      licenseNumber: "LIC456",
      approvalStatus: "approved",
      isActive: true,
      isVerified: true,
    });

    const loginRes = await request(app)
      .post("/api/v1/blood-banks/login")
      .send({ email: bloodBank.email, password: "Password123!" });
    cookies = loginRes.get("Set-Cookie");
  });

  describe("GET /api/v1/bloodbank/settings/profile", () => {
    it("should fetch blood bank profile", async () => {
      const res = await request(app)
        .get("/api/v1/bloodbank/settings/profile")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Portal Blood Bank");
    });
  });

  // describe('PUT /api/v1/bloodbank/settings/inventory', () => {
  //   it('should update blood bank inventory', async () => {
  //     // Ensure inventory record exists
  //     await Inventory.create({
  //       bloodBank: bloodBank._id,
  //       bloodBankName: bloodBank.name,
  //       items: [{ bloodGroup: 'A+', units: 0 }]
  //     });

  //     const res = await request(app)
  //       .put('/api/v1/bloodbank/settings/inventory')
  //       .set('Cookie', cookies)
  //       .send({
  //         inventory: [
  //           { bloodGroup: 'A+', units: 50 },
  //           { bloodGroup: 'B+', units: 30 }
  //         ]
  //       });

  //     expect(res.status).toBe(200);

  //     const inv = await Inventory.findOne({ bloodBank: bloodBank._id });
  //     expect(inv.items.find(i => i.bloodGroup === 'A+').units).toBe(50);
  //     expect(inv.items.find(i => i.bloodGroup === 'B+').units).toBe(30);
  //   });
  // });

  describe("POST /api/v1/bloodbank/events", () => {
    it("should create a new event", async () => {
      const eventData = {
        title: "Community Blood Drive",
        description: "Join us for a blood donation camp at the city park.",
        eventType: "donation-camp",
        date: new Date(Date.now() + 86400000).toISOString(),
        startTime: "10:00",
        endTime: "16:00",
        visibility: "public",
        location: {
          name: "City Park",
          address: "456 Park Ave",
          coordinates: {
            type: "Point",
            coordinates: [77.209, 28.6139], // Delhi coordinates [lng, lat]
          },
        },
      };

      const res = await request(app)
        .post("/api/v1/bloodbank/events")
        .set("Cookie", cookies)
        .send(eventData);

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe("Community Blood Drive");

      const event = await Event.findOne({ title: "Community Blood Drive" });
      expect(event).toBeDefined();
    });
  });
});

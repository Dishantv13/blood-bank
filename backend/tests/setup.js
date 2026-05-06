import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

process.env.PII_ENCRYPTION_KEY = "a".repeat(32); // 32 characters dummy key
process.env.CSRF_HASH_SECRET = "b".repeat(32); // 32 characters dummy secret
process.env.USER_ACCESS_TOKEN_SECRET = "c".repeat(32);
process.env.USER_REFRESH_TOKEN_SECRET = "d".repeat(32);
process.env.ADMIN_ACCESS_TOKEN_SECRET = "e".repeat(32);
process.env.ADMIN_REFRESH_TOKEN_SECRET = "f".repeat(32);
process.env.BLOODBANK_ACCESS_TOKEN_SECRET = "g".repeat(32);
process.env.BLOODBANK_REFRESH_TOKEN_SECRET = "h".repeat(32);
process.env.BLOODBANK_OTP_HASH_SECRET = "i".repeat(32);
process.env.ADMIN_EMAIL = "admin@example.com";
process.env.ADMIN_PASSWORD_HASH =
  "$2a$10$7vI6V2G/Y.I.M9.xQ0.l.O9yqY7yG.y.y.y.y.y.y.y.y.y.y.y.y"; // This is just a placeholder, I should generate a real one or mock it
process.env.NODE_ENV = "test";

jest.setTimeout(10000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    replSet: { count: 1 },
  });
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

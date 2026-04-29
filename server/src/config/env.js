import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
};

if (!env.mongoUri) {
  throw new Error("Missing MONGO_URI in server/.env");
}

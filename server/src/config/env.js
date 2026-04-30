import dotenv from "dotenv";

dotenv.config();

const readEnv = (key, fallback = "") => {
  const value = process.env[key];
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
};

export const env = {
  port: Number(readEnv("PORT", "4000")),
  mongoUri: readEnv("MONGO_URI"),
  jwtSecret: readEnv("JWT_SECRET", "dev-secret"),
  clientUrl: readEnv("CLIENT_URL", "http://localhost:5173"),
  clientUrls: readEnv("CLIENT_URL", "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: readEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: readEnv("CLOUDINARY_API_KEY"),
    apiSecret: readEnv("CLOUDINARY_API_SECRET"),
  },
  discord: {
    clientId: readEnv("DISCORD_CLIENT_ID"),
    clientSecret: readEnv("DISCORD_CLIENT_SECRET"),
    redirectUri: readEnv("DISCORD_REDIRECT_URI"),
  },
};

if (!env.mongoUri) {
  throw new Error("Missing MONGO_URI in server/.env");
}

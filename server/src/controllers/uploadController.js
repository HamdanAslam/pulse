import streamifier from "streamifier";
import { cloudinary } from "../config/cloudinary.js";

export async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  if (!cloudinary.config().cloud_name) {
    return res.status(500).json({ error: "Cloudinary is not configured" });
  }

  const result = await new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "livechat",
        resource_type: "image",
      },
      (error, uploaded) => {
        if (error) reject(error);
        else resolve(uploaded);
      },
    );
    streamifier.createReadStream(req.file.buffer).pipe(upload);
  });

  return res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  });
}

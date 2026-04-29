import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { uploadImage } from "../controllers/uploadController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);
router.post("/image", upload.single("file"), uploadImage);

export default router;

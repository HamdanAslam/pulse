import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listGifs } from "../controllers/gifController.js";

const router = Router();

router.use(requireAuth);
router.get("/", listGifs);

export default router;

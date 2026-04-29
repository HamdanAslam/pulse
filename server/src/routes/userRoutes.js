import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { searchUsers, usersByIds } from "../controllers/userController.js";

const router = Router();

router.get("/search", requireAuth, searchUsers);
router.get("/by-ids", requireAuth, usersByIds);

export default router;

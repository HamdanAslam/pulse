import { Router } from "express";
import { login, logout, me, signup, updateMe } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);

export default router;

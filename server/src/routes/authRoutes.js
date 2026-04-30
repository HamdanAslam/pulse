import { Router } from "express";
import {
  completeDiscordSignup,
  discordCallback,
  login,
  logout,
  me,
  signup,
  startDiscordAuth,
  updateMe,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/discord", startDiscordAuth);
router.get("/discord/callback", discordCallback);
router.post("/discord/complete", completeDiscordSignup);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);
router.patch("/me", requireAuth, updateMe);

export default router;

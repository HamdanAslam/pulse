import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createDM,
  createDMMessage,
  listDMs,
  listDMMessages,
} from "../controllers/dmController.js";

const router = Router();
router.use(requireAuth);

router.get("/", listDMs);
router.post("/", createDM);
router.get("/:dmId/messages", listDMMessages);
router.post("/:dmId/messages", createDMMessage);

export default router;

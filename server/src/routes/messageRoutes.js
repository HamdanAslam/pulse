import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createChannelMessage,
  deleteMessage,
  editMessage,
  listChannelMessages,
  toggleReaction,
} from "../controllers/messageController.js";

const router = Router();
router.use(requireAuth);

router.get("/channels/:channelId/messages", listChannelMessages);
router.post("/channels/:channelId/messages", createChannelMessage);
router.patch("/messages/:messageId", editMessage);
router.delete("/messages/:messageId", deleteMessage);
router.post("/messages/:messageId/reactions", toggleReaction);

export default router;

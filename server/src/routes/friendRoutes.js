import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  acceptFriend,
  declineFriend,
  listFriends,
  removeFriend,
  sendFriendRequest,
} from "../controllers/friendController.js";

const router = Router();

router.use(requireAuth);
router.get("/", listFriends);
router.post("/requests", sendFriendRequest);
router.post("/:userId/accept", acceptFriend);
router.post("/:userId/decline", declineFriend);
router.delete("/:userId", removeFriend);

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  addServerMember,
  assignRole,
  createCategory,
  createChannel,
  createInvite,
  createRole,
  createServer,
  deleteCategory,
  deleteChannel,
  deleteInvite,
  deleteRole,
  deleteServer,
  getServer,
  joinInvite,
  listInvites,
  listRoles,
  listServers,
  removeServerMember,
  resolveInvite,
  unassignRole,
  updateCategory,
  updateChannel,
  updateRole,
  updateServer,
} from "../controllers/serverController.js";

const router = Router();

router.use(requireAuth);

router.get("/", listServers);
router.post("/", createServer);
router.get("/:serverId", getServer);
router.patch("/:serverId", updateServer);
router.delete("/:serverId", deleteServer);

router.post("/:serverId/members", addServerMember);
router.delete("/:serverId/members/:userId", removeServerMember);

router.get("/:serverId/roles", listRoles);
router.post("/:serverId/roles", createRole);
router.patch("/:serverId/roles/:roleId", updateRole);
router.delete("/:serverId/roles/:roleId", deleteRole);
router.post("/:serverId/members/:userId/roles/:roleId", assignRole);
router.delete("/:serverId/members/:userId/roles/:roleId", unassignRole);

router.post("/:serverId/categories", createCategory);
router.patch("/:serverId/categories/:categoryId", updateCategory);
router.delete("/:serverId/categories/:categoryId", deleteCategory);

router.post("/:serverId/channels", createChannel);
router.patch("/:serverId/channels/:channelId", updateChannel);
router.delete("/:serverId/channels/:channelId", deleteChannel);

router.get("/:serverId/invites", listInvites);
router.post("/:serverId/invites", createInvite);
router.delete("/:serverId/invites/:inviteId", deleteInvite);
router.get("/invites/:code", resolveInvite);
router.post("/invites/:code/join", joinInvite);

export default router;

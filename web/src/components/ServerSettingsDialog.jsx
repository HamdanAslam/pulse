import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Crown, Hash, Link2, RotateCcw, Save, Settings2, Shield, Trash2, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "@/components/Avatar";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { uploadImage } from "@/services/upload.service";
import { useIsMobile } from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";

const PERM_FLAGS = [
  { key: "ADMINISTRATOR", label: "Administrator", value: 1 << 30 },
  { key: "VIEW_CHANNEL", label: "View Channels", value: 1 << 0 },
  { key: "SEND_MESSAGES", label: "Send Messages", value: 1 << 1 },
  { key: "MANAGE_MESSAGES", label: "Manage Messages", value: 1 << 2 },
  { key: "DELETE_MESSAGES", label: "Delete Messages", value: 1 << 8 },
  { key: "MANAGE_CHANNELS", label: "Manage Channels", value: 1 << 3 },
  { key: "MANAGE_ROLES", label: "Manage Roles", value: 1 << 4 },
  { key: "MANAGE_SERVER", label: "Manage Server", value: 1 << 5 },
];

const buildServerDraft = (server) => ({
  name: server?.name || "",
  color: server?.color || "220 80% 65%",
  icon: server?.icon || "",
  iconPublicId: server?.iconPublicId || "",
  banner: server?.banner || "",
  bannerPublicId: server?.bannerPublicId || "",
});

const CREATION_DEFAULTS = {
  roleColor: "220 80% 65%",
};

const hslTupleToHex = (tuple = "220 80% 65%") => {
  const [h = 220, s = 80, l = 65] = String(tuple)
    .replace(/%/g, "")
    .split(/\s+/)
    .map(Number);
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = h / 60;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue >= 0 && hue < 1) [r, g, b] = [chroma, x, 0];
  else if (hue < 2) [r, g, b] = [x, chroma, 0];
  else if (hue < 3) [r, g, b] = [0, chroma, x];
  else if (hue < 4) [r, g, b] = [0, x, chroma];
  else if (hue < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  const match = lightness - chroma / 2;
  const toHex = (value) => Math.round((value + match) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHslTuple = (hex) => {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const ServerSettingsDialog = ({ open, onOpenChange, server, initialTab = "overview" }) => {
  const isMobile = useIsMobile();
  const {
    users,
    selfId,
    updateServer,
    createCategory,
    createChannel,
    createRole,
    assignRole,
    updateRole,
    deleteRole,
    listInvites,
    createInvite,
    deleteInvite,
  } = useChat();
  const iconInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [tab, setTab] = useState(initialTab);
  const [draft, setDraft] = useState(() => buildServerDraft(server));
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [cropConfig, setCropConfig] = useState(null);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("text");
  const [channelCategoryId, setChannelCategoryId] = useState("none");
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState("220 80% 65%");
  const [selectedPerms, setSelectedPerms] = useState({});
  const [memberId, setMemberId] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("");
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [vanityCode, setVanityCode] = useState("");
  const isOwner = server?.ownerId === selfId || Boolean(server?.permissions?.isOwner);
  const canManageServer = isOwner || Boolean(server?.permissions?.canManageServer);
  const canManageChannels = isOwner || Boolean(server?.permissions?.canManageChannels);
  const canManageRoles = isOwner || Boolean(server?.permissions?.canManageRoles);
  const availableTabs = useMemo(
    () =>
      [
        canManageServer ? "overview" : null,
        canManageChannels ? "channels" : null,
        canManageRoles ? "roles" : null,
        canManageRoles ? "members" : null,
        canManageServer ? "invites" : null,
      ].filter(Boolean),
    [canManageServer, canManageChannels, canManageRoles],
  );

  const members = useMemo(
    () => (server?.memberIds || []).map((id) => users.find((user) => user.id === id)).filter(Boolean),
    [server, users],
  );
  const roles = server?.roles || [];
  const allChannels = useMemo(
    () => (server?.categories || []).flatMap((category) => category.channels.map((channel) => ({ ...channel, categoryName: category.name }))),
    [server],
  );
  const baseline = useMemo(() => buildServerDraft(server), [server]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const categoryDraftDirty = Boolean(categoryName.trim());
  const channelDraftDirty = Boolean(channelName.trim()) || channelType !== "text" || channelCategoryId !== "none";
  const roleDraftDirty =
    Boolean(roleName.trim()) ||
    roleColor !== CREATION_DEFAULTS.roleColor ||
    Object.values(selectedPerms).some(Boolean);
  const memberDraftDirty = Boolean(memberId || roleToAssign);
  const inviteDraftDirty = Boolean(vanityCode.trim());

  useEffect(() => {
    if (!open) return;
    setTab(availableTabs.includes(initialTab) ? initialTab : availableTabs[0] || "overview");
  }, [open, initialTab, availableTabs]);

  useEffect(() => {
    if (!open) return;
    setDraft(buildServerDraft(server));
  }, [open, server]);

  useEffect(() => {
    if (!open || !dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, dirty]);

  useEffect(() => {
    if (!open || !server || tab !== "invites" || !canManageServer) return;
    setInvitesLoading(true);
    listInvites(server.id)
      .then(setInvites)
      .finally(() => setInvitesLoading(false));
  }, [open, server, tab, listInvites, canManageServer]);

  if (!server || availableTabs.length === 0) return null;

  const requestClose = (nextOpen) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (dirty) {
      setShowCloseWarning(true);
      return;
    }
    onOpenChange(false);
  };

  const resetDraft = () => {
    setDraft(baseline);
    setShowCloseWarning(false);
  };

  const resetCategoryDraft = () => setCategoryName("");
  const resetChannelDraft = () => {
    setChannelName("");
    setChannelType("text");
    setChannelCategoryId("none");
  };
  const resetRoleDraft = () => {
    setRoleName("");
    setRoleColor(CREATION_DEFAULTS.roleColor);
    setSelectedPerms({});
  };
  const resetMemberDraft = () => {
    setMemberId("");
    setRoleToAssign("");
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await updateServer(server.id, {
        name: draft.name.trim(),
        color: draft.color.trim(),
        icon: draft.icon.trim(),
        iconPublicId: draft.iconPublicId,
        banner: draft.banner.trim(),
        bannerPublicId: draft.bannerPublicId,
      });
      toast.success("Server updated");
      setShowCloseWarning(false);
    } catch (error) {
      toast.error(error?.message || "Could not update server");
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropConfig({ kind: "icon", file });
    if (iconInputRef.current) iconInputRef.current.value = "";
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropConfig({ kind: "banner", file });
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleCropConfirm = async (blob) => {
    const target = cropConfig?.kind;
    if (!target || !cropConfig?.file) return;
    const croppedFile = new File([blob], cropConfig.file.name, { type: blob.type || cropConfig.file.type || "image/png" });

    if (target === "icon") setUploadingIcon(true);
    if (target === "banner") setUploadingBanner(true);

    try {
      const result = await uploadImage(croppedFile);
      if (target === "icon") {
        setDraft((current) => ({
          ...current,
          icon: result.url,
          iconPublicId: result.publicId || "",
        }));
        toast.success("Server icon ready to save");
      } else {
        setDraft((current) => ({
          ...current,
          banner: result.url,
          bannerPublicId: result.publicId || "",
        }));
        toast.success("Server banner ready to save");
      }
      setCropConfig(null);
    } catch (error) {
      toast.error(error?.message || "Image upload failed");
      throw error;
    } finally {
      setUploadingIcon(false);
      setUploadingBanner(false);
    }
  };

  const onCreateCategory = async (event) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    await createCategory(server.id, categoryName.trim());
    resetCategoryDraft();
    toast.success("Category created");
  };

  const onCreateChannel = async (event) => {
    event.preventDefault();
    if (!channelName.trim()) return;
    await createChannel(
      server.id,
      channelCategoryId === "none" ? null : channelCategoryId,
      channelName.trim().toLowerCase().replace(/\s+/g, "-"),
      channelType,
    );
    resetChannelDraft();
    toast.success("Channel created");
  };

  const onCreateRole = async (event) => {
    event.preventDefault();
    if (!roleName.trim()) return;
    const permissions = PERM_FLAGS.reduce((sum, item) => (selectedPerms[item.key] ? sum | item.value : sum), 0);
    await createRole(server.id, { name: roleName.trim(), color: roleColor, permissions });
    resetRoleDraft();
    toast.success("Role created");
  };

  const onAssignRole = async (event) => {
    event.preventDefault();
    if (!memberId || !roleToAssign) return;
    await assignRole(server.id, memberId, roleToAssign);
    resetMemberDraft();
    toast.success("Role assigned");
  };

  const onToggleRolePerm = async (role, flag) => {
    const enabled = Boolean(role.permissions & flag.value);
    const next = enabled ? role.permissions & ~flag.value : role.permissions | flag.value;
    await updateRole(server.id, role.id, { permissions: next });
  };

  const copyInvite = async (code) => {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success("Invite link copied");
    window.setTimeout(() => setCopiedCode(""), 1500);
  };

  const handleCreateInvite = async () => {
    const invite = await createInvite(server.id, { code: vanityCode.trim() || undefined });
    setInvites((current) => [invite, ...current]);
    setVanityCode("");
    await copyInvite(invite.code);
  };

  const handleDeleteInvite = async (inviteId) => {
    await deleteInvite(server.id, inviteId);
    setInvites((current) => current.filter((invite) => invite.id !== inviteId));
    toast.success("Invite revoked");
  };

  const settingsContent = (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-surface-1 p-2 md:w-72 md:flex-col md:gap-0 md:overflow-x-visible md:border-b-0 md:border-r md:p-4">
        <div className="mb-4 hidden px-2 md:block">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server Settings</p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-2xl text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, hsl(${server.color}), hsl(${server.color} / 0.72))` }}
            >
              {server.acronym}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{server.name}</p>
              <p className="text-xs text-muted-foreground">{server.memberIds.length} members</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 md:flex-col md:gap-0">
          {canManageServer && (
            <SettingsNavBtn active={tab === "overview"} icon={<Settings2 className="h-4 w-4" />} onClick={() => setTab("overview")}>
              Overview
            </SettingsNavBtn>
          )}
          {canManageChannels && (
            <SettingsNavBtn active={tab === "channels"} icon={<Hash className="h-4 w-4" />} onClick={() => setTab("channels")}>
              Channels
            </SettingsNavBtn>
          )}
          {canManageRoles && (
            <SettingsNavBtn active={tab === "roles"} icon={<Shield className="h-4 w-4" />} onClick={() => setTab("roles")}>
              Roles
            </SettingsNavBtn>
          )}
          {canManageRoles && (
            <SettingsNavBtn active={tab === "members"} icon={<Users className="h-4 w-4" />} onClick={() => setTab("members")}>
              Members
            </SettingsNavBtn>
          )}
          {canManageServer && (
            <SettingsNavBtn active={tab === "invites"} icon={<Link2 className="h-4 w-4" />} onClick={() => setTab("invites")}>
              Invites
            </SettingsNavBtn>
          )}
        </div>
      </aside>

      <div className="relative min-h-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-32">
          {canManageServer && <TabsContent value="overview" className="mt-0 flex flex-col gap-6">
            <PageIntro title="Overview" description="Core server identity changes stay in draft until you save them." />
            <section className="overflow-hidden rounded-3xl border border-border bg-surface-1">
              <div
                className="px-5 py-6 sm:px-6"
                style={draft.banner ? {
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.35)), url(${draft.banner})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                } : undefined}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar avatar={draft.icon} name={draft.name || "Server"} size={80} />
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-bold text-primary-foreground">{draft.name || "Server name"}</p>
                    <p className="text-sm text-primary-foreground/80">{server.memberIds.length} members</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2">
                  <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server Banner</label>
                        <p className="mt-1 text-sm text-muted-foreground">Used in invite previews and server settings preview.</p>
                      </div>
                      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                          <Upload data-icon="inline-start" />
                          {uploadingBanner ? "Uploading..." : "Upload Banner"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDraft((current) => ({ ...current, banner: "", bannerPublicId: "" }))}
                          disabled={!draft.banner}
                        >
                          <RotateCcw data-icon="inline-start" />
                          Clear Banner
                        </Button>
                      </div>
                    </div>
                    <div
                      className="h-32 rounded-2xl bg-gradient-primary"
                      style={draft.banner ? {
                        backgroundImage: `url(${draft.banner})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      } : undefined}
                    />
                  </div>
                </div>
                <Field label="Server Name" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hslTupleToHex(draft.color)}
                      onChange={(event) => setDraft((current) => ({ ...current, color: hexToHslTuple(event.target.value) }))}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                    />
                    <Input value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server Icon</label>
                        <p className="mt-1 text-sm text-muted-foreground">Used in the rail and invite previews.</p>
                      </div>
                      <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => iconInputRef.current?.click()} disabled={uploadingIcon}>
                          <Upload data-icon="inline-start" />
                          {uploadingIcon ? "Uploading..." : "Upload Icon"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDraft((current) => ({ ...current, icon: "", iconPublicId: "" }))}
                          disabled={!draft.icon}
                        >
                          <RotateCcw data-icon="inline-start" />
                          Clear Icon
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar avatar={draft.icon} name={draft.name || "Server"} size={64} />
                      <p className="text-sm text-muted-foreground">Upload an image or keep the generated initials fallback.</p>
                    </div>
                  </div>
                  <Field label="Server Icon URL" value={draft.icon} onChange={(value) => setDraft((current) => ({ ...current, icon: value }))} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Members" value={server.memberIds.length} />
              <StatCard label="Categories" value={server.categories.length} />
              <StatCard label="Channels" value={allChannels.length} />
            </section>
          </TabsContent>}

          {canManageChannels && <TabsContent value="channels" className="mt-0 flex flex-col gap-4">
            <PageIntro title="Channels" description="Create structure quickly, then keep the list readable." />
            <form onSubmit={onCreateCategory} className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-3 text-sm font-semibold">Create Category</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Product" />
              </div>
              <InlineActions dirty={categoryDraftDirty} resetLabel="Reset" saveLabel="Add Category" onReset={resetCategoryDraft} />
            </form>

            <form onSubmit={onCreateChannel} className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-3 text-sm font-semibold">Create Channel</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="channel-name" />
                <Select value={channelType} onValueChange={setChannelType}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={channelCategoryId} onValueChange={setChannelCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {server.categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <InlineActions dirty={channelDraftDirty} resetLabel="Reset" saveLabel="Create Channel" onReset={resetChannelDraft} />
            </form>

            <section className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-4 text-sm font-semibold">Existing Channels</p>
              <div className="flex flex-col gap-3">
                {server.categories.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="mb-3 text-sm font-semibold">{category.name}</div>
                    <div className="flex flex-col gap-2">
                      {category.channels.map((channel) => (
                        <div key={channel.id} className="flex items-center justify-between gap-3 rounded-xl bg-background/80 px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">#{channel.name}</p>
                            <p className="text-xs text-muted-foreground">{channel.type}</p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{channel.topic || "No topic"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>}

          {canManageRoles && <TabsContent value="roles" className="mt-0 flex flex-col gap-4">
            <PageIntro title="Roles" description="Permissions remain immediate because they are admin actions, not drafts." />
            <form onSubmit={onCreateRole} className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-3 text-sm font-semibold">Create Role</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="e.g. Moderator" />
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslTupleToHex(roleColor)}
                    onChange={(event) => setRoleColor(hexToHslTuple(event.target.value))}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                  />
                  <Input value={roleColor} onChange={(event) => setRoleColor(event.target.value)} placeholder="hsl tuple: 220 80% 65%" />
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PERM_FLAGS.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm">
                    <Checkbox
                      checked={Boolean(selectedPerms[perm.key])}
                      onCheckedChange={(checked) => setSelectedPerms((state) => ({ ...state, [perm.key]: Boolean(checked) }))}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
              <InlineActions dirty={roleDraftDirty} resetLabel="Reset" saveLabel="Create Role" onReset={resetRoleDraft} />
            </form>

            <section className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-4 text-sm font-semibold">Existing Roles</p>
              <div className="flex flex-col gap-3">
                {roles.map((role) => (
                  <div key={role.id} className="rounded-2xl border border-border bg-surface-2 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full" style={{ backgroundColor: `hsl(${role.color || "220 80% 65%"})` }} />
                        <span className="font-medium">{role.name}</span>
                      </div>
                      {!role.isDefault && !role.managed && (
                        <Button variant="destructive" size="sm" onClick={() => deleteRole(server.id, role.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PERM_FLAGS.map((perm) => (
                        <label key={perm.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox
                            checked={Boolean(role.permissions & perm.value)}
                            onCheckedChange={() => onToggleRolePerm(role, perm)}
                            disabled={role.managed}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>}

          {canManageRoles && <TabsContent value="members" className="mt-0 flex flex-col gap-4">
            <PageIntro title="Members" description="Assign roles from one place and keep the roster visible." />
            <form onSubmit={onAssignRole} className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-3 text-sm font-semibold">Assign Role</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.displayName} (@{member.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roleToAssign} onValueChange={setRoleToAssign}>
                  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <InlineActions dirty={memberDraftDirty} resetLabel="Reset" saveLabel="Assign Role" onReset={resetMemberDraft} />
            </form>

            <section className="rounded-3xl border border-border bg-surface-1 p-5">
              <p className="mb-4 text-sm font-semibold">Server Members</p>
              <div className="flex flex-col gap-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
                    <Avatar avatar={member.avatar} name={member.displayName} size={40} status={member.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium">{member.displayName}</p>
                        {member.id === server.ownerId && <Crown className="h-4 w-4 shrink-0 text-warning" />}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">@{member.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>}

          {canManageServer && <TabsContent value="invites" className="mt-0 flex flex-col gap-4">
            <PageIntro title="Invites" description="Create, copy, and revoke existing links from one full page instead of a tiny dialog." />
            <section className="rounded-3xl border border-border bg-surface-1 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Invite Links</p>
                  <p className="text-sm text-muted-foreground">Manage every active invite for this server.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-4">
                <p className="mb-2 text-sm font-medium">New Invite</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={vanityCode}
                    onChange={(event) => setVanityCode(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="Optional vanity code, e.g. pulse-dev"
                  />
                  <Button onClick={handleCreateInvite} disabled={!inviteDraftDirty && invitesLoading}>
                    Create Invite Link
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Leave blank for an auto-generated code. Vanity codes must be unique.</p>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {invitesLoading && <p className="text-sm text-muted-foreground">Loading invites...</p>}
                {!invitesLoading && invites.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No invite links yet.
                  </p>
                )}
                {invites.map((invite) => (
                  <div key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{window.location.origin}/invite/{invite.code}</p>
                      <p className="text-sm text-muted-foreground">
                        Uses: {invite.uses} {invite.maxUses ? `/ ${invite.maxUses}` : ""} {invite.expiresAt ? `• Expires ${new Date(invite.expiresAt).toLocaleString()}` : "• No expiration"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => copyInvite(invite.code)}>
                        {copiedCode === invite.code ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                        {copiedCode === invite.code ? "Copied" : "Copy"}
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteInvite(invite.id)}>
                        <Trash2 data-icon="inline-start" />
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>}
        </div>

        {dirty && (
          isMobile ? (
            <MobileSaveBar saving={saving} onReset={resetDraft} onSave={saveDraft} message="Unsaved server changes" />
          ) : (
            <SaveBar saving={saving} onReset={resetDraft} onSave={saveDraft} message="Unsaved server changes" />
          )
        )}
      </div>
    </Tabs>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={requestClose}>
          <SheetContent side="right" className="h-[100dvh] w-full max-w-none overflow-hidden border-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{server.name} settings</SheetTitle>
              <SheetDescription>Manage server details, channels, roles, members, and invites.</SheetDescription>
            </SheetHeader>
            {settingsContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={requestClose}>
          <DialogContent className="h-[92vh] max-w-6xl overflow-hidden rounded-2xl p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{server.name} settings</DialogTitle>
              <DialogDescription>Manage server details, channels, roles, members, and invites.</DialogDescription>
            </DialogHeader>
            {settingsContent}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved server changes</DialogTitle>
            <DialogDescription>Save or reset the server overview edits before closing settings.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetDraft}>Reset Changes</Button>
            <Button onClick={saveDraft} disabled={saving}>
              <Save data-icon="inline-start" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={Boolean(cropConfig)}
        onOpenChange={(nextOpen) => !nextOpen && setCropConfig(null)}
        file={cropConfig?.file || null}
        title={cropConfig?.kind === "banner" ? "Server Banner" : "Server Icon"}
        description={cropConfig?.kind === "banner" ? "Position the wide crop for your server header." : "Center your image inside the server icon frame."}
        aspect={cropConfig?.kind === "banner" ? 17 / 6 : 1}
        outputWidth={cropConfig?.kind === "banner" ? 1700 : 512}
        outputHeight={cropConfig?.kind === "banner" ? 600 : 512}
        onConfirm={handleCropConfirm}
      />
    </>
  );
};

const PageIntro = ({ title, description }) => (
  <div>
    <h2 className="text-2xl font-bold">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-3xl border border-border bg-surface-1 p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-2 text-3xl font-semibold">{value}</p>
  </div>
);

const Field = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

const InlineActions = ({ dirty, resetLabel, saveLabel, onReset }) => (
  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
    <Button type="button" variant="ghost" onClick={onReset} disabled={!dirty}>
      <RotateCcw data-icon="inline-start" />
      {resetLabel}
    </Button>
    <Button type="submit" disabled={!dirty}>
      <Save data-icon="inline-start" />
      {saveLabel}
    </Button>
  </div>
);

const SaveBar = ({ saving, onReset, onSave, message }) => (
  <div className="fixed inset-x-3 bottom-3 z-40 sm:left-[calc(50%+2rem)] sm:right-6">
    <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{message}</p>
        <p className="text-sm text-muted-foreground">Save to keep them, or reset to go back.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onReset} disabled={saving}>
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
        <Button onClick={onSave} disabled={saving}>
          <Save data-icon="inline-start" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  </div>
);

const MobileSaveBar = ({ saving, onReset, onSave, message }) => (
  <div className="border-t border-border bg-surface-1 px-4 py-3">
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">{message}</p>
        <p className="text-sm text-muted-foreground">Save to keep them, or reset to go back.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onReset} disabled={saving}>
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
        <Button onClick={onSave} disabled={saving}>
          <Save data-icon="inline-start" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  </div>
);

const SettingsNavBtn = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors md:w-full",
      active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
    )}
  >
    {icon}
    <span className="truncate">{children}</span>
  </button>
);

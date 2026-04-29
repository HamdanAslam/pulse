import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, LogOut, Palette, RotateCcw, Save, Settings2, Shield, Sliders, Upload, User as UserIcon, Volume2, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "./Avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { ImageCropDialog } from "./ImageCropDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { uploadImage } from "@/services/upload.service";
import { useIsMobile } from "@/hooks/useBreakpoint";
const NAV = [
    { id: "profile", label: "Profile", icon: Sliders, group: "user" },
    { id: "account", label: "My Account", icon: UserIcon, group: "user" },
    { id: "privacy", label: "Privacy & Safety", icon: Shield, group: "user" },
    { id: "appearance", label: "Appearance", icon: Palette, group: "app" },
    { id: "notifications", label: "Notifications", icon: Bell, group: "app" },
    { id: "voice", label: "Voice & Video", icon: Volume2, group: "app" },
];
const EMOJIS = ["🦊", "🐉", "🌌", "🌿", "🐙", "🔥", "⚡", "🌊", "🌙", "🪐", "🐺", "🦄", "🍄", "👾", "🎮", "🎧"];
const buildDraft = (user) => ({
    displayName: user?.displayName ?? "",
    username: user?.username ?? "",
    bio: user?.bio ?? "",
    avatar: user?.avatar ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user?.displayName || user?.username || "Pulse")}`,
    avatarPublicId: user?.avatarPublicId ?? "",
    banner: user?.banner ?? "",
    bannerPublicId: user?.bannerPublicId ?? "",
});
export const SettingsDialog = ({ open, onOpenChange, initialSection = "profile" }) => {
    const { user, logout, updateProfile } = useAuth();
    const { theme, setTheme, themes } = useTheme();
    const isMobile = useIsMobile();
    const nav = useNavigate();
    const fileInputRef = useRef(null);
    const bannerInputRef = useRef(null);
    const [section, setSection] = useState(initialSection);
    const [draft, setDraft] = useState(() => buildDraft(user));
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [cropConfig, setCropConfig] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        desktop: true,
        sound: true,
        mentionsOnly: false,
        emailDigest: false,
    });
    const [voiceSettings, setVoiceSettings] = useState({
        autoMute: false,
        noiseSuppression: true,
        echoCancellation: true,
    });
    const [privacySettings, setPrivacySettings] = useState({
        serverDMs: true,
        friendRequests: true,
        readReceipts: false,
    });
    const baseline = useMemo(() => buildDraft(user), [user]);
    const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
    useEffect(() => {
        if (!open)
            return;
        setSection(initialSection);
    }, [open, initialSection]);
    useEffect(() => {
        if (!user || !open)
            return;
        setDraft(buildDraft(user));
    }, [user, open]);
    useEffect(() => {
        if (!open || !dirty)
            return undefined;
        const onBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [open, dirty]);
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
    const saveDraft = async () => {
        setSaving(true);
        try {
            await updateProfile(draft);
            toast.success("Profile updated");
            setShowCloseWarning(false);
        }
        catch (error) {
            toast.error(error?.message || "Could not save profile changes");
        }
        finally {
            setSaving(false);
        }
    };
    const onLogout = async () => {
        if (dirty) {
            setShowCloseWarning(true);
            return;
        }
        onOpenChange(false);
        await logout();
        nav("/login");
    };
    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setCropConfig({ kind: "avatar", file });
        if (fileInputRef.current)
            fileInputRef.current.value = "";
    };
    const handleBannerUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setCropConfig({ kind: "banner", file });
        if (bannerInputRef.current)
            bannerInputRef.current.value = "";
    };
    const handleCropConfirm = async (blob) => {
        const target = cropConfig?.kind;
        if (!target || !cropConfig?.file)
            return;
        const croppedFile = new File([blob], cropConfig.file.name, { type: blob.type || cropConfig.file.type || "image/png" });
        if (target === "avatar")
            setUploadingAvatar(true);
        if (target === "banner")
            setUploadingBanner(true);
        try {
            const result = await uploadImage(croppedFile);
            if (target === "avatar") {
                setDraft((current) => ({
                    ...current,
                    avatar: result.url,
                    avatarPublicId: result.publicId || "",
                }));
                toast.success("Avatar ready to save");
            }
            else {
                setDraft((current) => ({
                    ...current,
                    banner: result.url,
                    bannerPublicId: result.publicId || "",
                }));
                toast.success("Banner ready to save");
            }
            setCropConfig(null);
        }
        catch (error) {
            toast.error(error?.message || "Image upload failed");
            throw error;
        }
        finally {
            setUploadingAvatar(false);
            setUploadingBanner(false);
        }
    };
    if (!user)
        return null;
    const sectionContent = (<>
      {section === "profile" && (<>
          <PageIntro title="Profile" description="Customize how you appear across Pulse."/>

          <section className="overflow-hidden rounded-3xl border border-border bg-surface-1">
            <div className="px-5 py-6 sm:px-6" style={draft.banner ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.35)), url(${draft.banner})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            } : undefined}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar avatar={draft.avatar} name={draft.displayName || draft.username} size={88} status="online"/>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-bold text-primary-foreground">{draft.displayName || "Your display name"}</p>
                  <p className="truncate text-sm text-primary-foreground/80">@{draft.username || "username"}</p>
                  {draft.bio && <p className="mt-2 line-clamp-2 text-sm text-primary-foreground/85">{draft.bio}</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6 p-5 sm:p-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Profile Banner</Label>
                    <p className="mt-1 text-sm text-muted-foreground">Shows up on your profile card and account preview.</p>
                  </div>
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload}/>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                      <Upload data-icon="inline-start"/>
                      {uploadingBanner ? "Uploading..." : "Upload Banner"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setDraft((current) => ({
                ...current,
                banner: "",
                bannerPublicId: "",
            }))} disabled={!draft.banner}>
                      <RotateCcw data-icon="inline-start"/>
                      Clear Banner
                    </Button>
                  </div>
                </div>
                <div className="h-32 rounded-2xl bg-gradient-primary" style={draft.banner ? {
                backgroundImage: `url(${draft.banner})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            } : undefined}/>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Avatar</Label>
                  <p className="mt-1 text-sm text-muted-foreground">Upload your own image, keep the generated default, or use an emoji.</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                    <Upload data-icon="inline-start"/>
                    {uploadingAvatar ? "Uploading..." : "Upload Avatar"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setDraft((current) => ({
                ...current,
                avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(current.displayName || current.username || "Pulse")}`,
                avatarPublicId: "",
            }))}>
                    <Settings2 data-icon="inline-start"/>
                    Use Default
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {EMOJIS.map((emoji) => (<button key={emoji} type="button" onClick={() => setDraft((current) => ({ ...current, avatar: emoji, avatarPublicId: "" }))} className={cn("flex aspect-square items-center justify-center rounded-2xl border text-2xl transition-colors", draft.avatar === emoji ? "border-primary bg-primary/10" : "border-border bg-surface-2 hover:border-primary/40")}>
                    {emoji}
                  </button>))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Display Name" value={draft.displayName} onChange={(value) => setDraft((current) => ({ ...current, displayName: value }))}/>
                <Field label="Username" value={draft.username} onChange={(value) => setDraft((current) => ({ ...current, username: value }))}/>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About Me</Label>
                <Textarea rows={5} placeholder="What should people know about you?" value={draft.bio} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}/>
              </div>
            </div>
          </section>
        </>)}

      {section === "account" && (<>
          <PageIntro title="My Account" description="Core account details and a live summary of how your profile is currently going to publish."/>
          <section className="overflow-hidden rounded-3xl border border-border bg-surface-1">
            <div className="h-28 bg-gradient-primary" style={draft.banner ? {
                backgroundImage: `url(${draft.banner})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            } : undefined}/>
            <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <Avatar avatar={draft.avatar} name={draft.displayName || draft.username} size={56} status="online"/>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{draft.displayName || "Your display name"}</p>
                  <p className="truncate text-sm text-muted-foreground">@{draft.username || "username"}</p>
                </div>
              </div>
              <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={onLogout}>
                <LogOut data-icon="inline-start"/>
                Log Out
              </Button>
            </div>
            <div className="grid gap-6 px-5 py-5 sm:px-6 md:grid-cols-[1.15fr_0.85fr]">
              <div className="flex flex-col gap-4">
                <Field label="Display Name" value={draft.displayName} onChange={(value) => setDraft((current) => ({ ...current, displayName: value }))}/>
                <Field label="Username" value={draft.username} onChange={(value) => setDraft((current) => ({ ...current, username: value }))}/>
                <Field label="Email" value={user.email} disabled onChange={() => { }}/>
              </div>
              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Public Preview</p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
                  <div className="h-20 bg-gradient-primary" style={draft.banner ? {
                backgroundImage: `url(${draft.banner})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            } : undefined}/>
                  <div className="-mt-6 px-4 pb-4">
                    <Avatar avatar={draft.avatar} name={draft.displayName || draft.username} size={48} status="online"/>
                    <div className="mt-3 min-w-0">
                      <p className="truncate font-semibold">{draft.displayName || "Your display name"}</p>
                      <p className="truncate text-sm text-muted-foreground">@{draft.username || "username"}</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{draft.bio || "Add a bio in the Profile section."}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>)}

      {section === "appearance" && (<>
          <PageIntro title="Appearance" description="Theme changes still apply instantly. These are app preferences, not profile edits."/>
          <div className="grid gap-4 sm:grid-cols-2">
            {themes.map((item) => {
                const active = item.id === theme;
                return (<button key={item.id} onClick={() => setTheme(item.id)} className={cn("overflow-hidden rounded-3xl border p-1 text-left transition-colors", active ? "border-primary bg-primary/5" : "border-border bg-surface-1 hover:border-primary/50")}>
                  <div className="h-28 rounded-[20px]" style={{ background: item.swatch }}/>
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {active && (<span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4"/>
                      </span>)}
                  </div>
                </button>);
            })}
          </div>
        </>)}

      {section === "notifications" && (<>
          <PageIntro title="Notifications" description="These toggles are local for now, but the layout is responsive and stable."/>
          <div className="flex flex-col gap-3">
            <ToggleRow label="Desktop notifications" desc="Show a popup for new messages." checked={notificationSettings.desktop} onCheckedChange={(value) => setNotificationSettings((current) => ({ ...current, desktop: value }))}/>
            <ToggleRow label="Sound on new message" desc="Play a short chime when a new message arrives." checked={notificationSettings.sound} onCheckedChange={(value) => setNotificationSettings((current) => ({ ...current, sound: value }))}/>
            <ToggleRow label="@mention only" desc="Only ping me when I am mentioned directly." checked={notificationSettings.mentionsOnly} onCheckedChange={(value) => setNotificationSettings((current) => ({ ...current, mentionsOnly: value }))}/>
            <ToggleRow label="Email digest" desc="Receive a weekly activity summary." checked={notificationSettings.emailDigest} onCheckedChange={(value) => setNotificationSettings((current) => ({ ...current, emailDigest: value }))}/>
          </div>
        </>)}

      {section === "voice" && (<>
          <PageIntro title="Voice & Video" description="Kept here for parity, even though voice channels are out of scope."/>
          <div className="flex flex-col gap-3">
            <ToggleRow label="Auto-mute on join" desc="Start muted when entering a voice session." checked={voiceSettings.autoMute} onCheckedChange={(value) => setVoiceSettings((current) => ({ ...current, autoMute: value }))}/>
            <ToggleRow label="Noise suppression" desc="Filter background noise from your microphone." checked={voiceSettings.noiseSuppression} onCheckedChange={(value) => setVoiceSettings((current) => ({ ...current, noiseSuppression: value }))}/>
            <ToggleRow label="Echo cancellation" desc="Reduce speaker feedback loops." checked={voiceSettings.echoCancellation} onCheckedChange={(value) => setVoiceSettings((current) => ({ ...current, echoCancellation: value }))}/>
          </div>
        </>)}

      {section === "privacy" && (<>
          <PageIntro title="Privacy & Safety" description="Safety controls stay grouped together instead of being scattered between tabs."/>
          <div className="flex flex-col gap-3">
            <ToggleRow label="Allow DMs from server members" desc="Anyone in your mutual servers can start a DM." checked={privacySettings.serverDMs} onCheckedChange={(value) => setPrivacySettings((current) => ({ ...current, serverDMs: value }))}/>
            <ToggleRow label="Friend requests from anyone" desc="Turn this off to limit requests." checked={privacySettings.friendRequests} onCheckedChange={(value) => setPrivacySettings((current) => ({ ...current, friendRequests: value }))}/>
            <ToggleRow label="Read receipts" desc="Let other people see when you have read a message." checked={privacySettings.readReceipts} onCheckedChange={(value) => setPrivacySettings((current) => ({ ...current, readReceipts: value }))}/>
          </div>
        </>)}
    </>);
    return (<>
      {isMobile ? (<Sheet open={open} onOpenChange={requestClose}>
          <SheetContent side="right" className="h-[100dvh] w-full max-w-none overflow-hidden border-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>User settings</SheetTitle>
              <SheetDescription>Manage your profile, account, privacy, and app preferences.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full min-h-0 flex-col bg-background">
              <div className="border-b border-border bg-surface-1 px-4 py-3">
                <p className="text-sm font-semibold">User Settings</p>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {NAV.map((item) => (<NavBtn key={item.id} active={section === item.id} icon={<item.icon className="h-4 w-4"/>} onClick={() => setSection(item.id)}>
                      {item.label}
                    </NavBtn>))}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-5 pb-32">
                  {sectionContent}
                </div>
              </div>
              {dirty && (<MobileSaveBar saving={saving} onReset={resetDraft} onSave={saveDraft} message="Unsaved profile changes"/>)}
            </div>
          </SheetContent>
        </Sheet>) : (<Dialog open={open} onOpenChange={requestClose}>
          <DialogContent className="left-[50%] top-[50%] h-[92vh] max-w-6xl overflow-hidden rounded-2xl border p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>User settings</DialogTitle>
              <DialogDescription>Manage your profile, account, privacy, and app preferences.</DialogDescription>
            </DialogHeader>
            <div className="flex h-full min-h-0 flex-col md:flex-row">
              <aside className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-border bg-surface-1 p-2 md:w-72 md:flex-col md:gap-0 md:overflow-x-visible md:border-b-0 md:border-r md:p-4">
              <div className="mb-3 hidden px-2 md:block">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Settings</p>
              </div>
              {NAV.filter((item) => item.group === "user").map((item) => (<NavBtn key={item.id} active={section === item.id} icon={<item.icon className="h-4 w-4"/>} onClick={() => setSection(item.id)}>
                  {item.label}
                </NavBtn>))}
              <div className="mx-2 my-3 hidden h-px bg-border md:block"/>
              {NAV.filter((item) => item.group === "app").map((item) => (<NavBtn key={item.id} active={section === item.id} icon={<item.icon className="h-4 w-4"/>} onClick={() => setSection(item.id)}>
                  {item.label}
                </NavBtn>))}
              <div className="mt-auto hidden px-2 pt-4 md:block">
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={onLogout}>
                  <LogOut data-icon="inline-start"/>
                  Log Out
                </Button>
              </div>
            </aside>

            <div className="relative min-h-0 flex-1 overflow-y-auto bg-background">
              <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-5 pb-28 sm:px-6 sm:py-6 sm:pb-32">
                {sectionContent}
              </div>

              {dirty && (<SaveBar saving={saving} onReset={resetDraft} onSave={saveDraft} message="Unsaved profile changes"/>)}
            </div>
          </div>
          </DialogContent>
        </Dialog>)}

      <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>Save or reset your edits before leaving user settings.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetDraft}>Reset Changes</Button>
            <Button onClick={saveDraft} disabled={saving}>
              <Save data-icon="inline-start"/>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropDialog open={Boolean(cropConfig)} onOpenChange={(nextOpen) => !nextOpen && setCropConfig(null)} file={cropConfig?.file || null} title={cropConfig?.kind === "banner" ? "Profile Banner" : "Profile Photo"} description={cropConfig?.kind === "banner" ? "Position the wide crop for your profile header." : "Center your image inside the profile photo frame."} aspect={cropConfig?.kind === "banner" ? 17 / 6 : 1} outputWidth={cropConfig?.kind === "banner" ? 1700 : 512} outputHeight={cropConfig?.kind === "banner" ? 600 : 512} onConfirm={handleCropConfirm}/>
    </>);
};
const PageIntro = ({ title, description }) => (<div>
    <h2 className="text-2xl font-bold">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>);
const NavBtn = ({ active, onClick, icon, children }) => (<button onClick={onClick} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors md:w-full", active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>
    {icon}
    <span className="truncate">{children}</span>
  </button>);
const Field = ({ label, value, onChange, disabled }) => (<div className="flex flex-col gap-1.5">
    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
    <Input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}/>
  </div>);
const ToggleRow = ({ label, desc, checked, onCheckedChange }) => (<div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-1 p-4">
    <div className="min-w-0">
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange}/>
  </div>);
const SaveBar = ({ saving, onReset, onSave, message }) => (<div className="fixed inset-x-3 bottom-3 z-40 sm:left-[calc(50%+2rem)] sm:right-6">
    <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-border bg-surface-1 px-4 py-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{message}</p>
        <p className="text-sm text-muted-foreground">Save to keep them, or reset to go back.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onReset} disabled={saving}>
          <RotateCcw data-icon="inline-start"/>
          Reset
        </Button>
        <Button onClick={onSave} disabled={saving}>
          <Save data-icon="inline-start"/>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  </div>);
const MobileSaveBar = ({ saving, onReset, onSave, message }) => (<div className="border-t border-border bg-surface-1 px-4 py-3">
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-semibold">{message}</p>
        <p className="text-sm text-muted-foreground">Save to keep them, or reset to go back.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onReset} disabled={saving}>
          <RotateCcw data-icon="inline-start"/>
          Reset
        </Button>
        <Button onClick={onSave} disabled={saving}>
          <Save data-icon="inline-start"/>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  </div>);

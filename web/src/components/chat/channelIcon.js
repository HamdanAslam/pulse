import { Hash, Megaphone, Volume2 } from "lucide-react";
export const channelIcon = (type) => type === "voice" ? Volume2 : type === "announcement" ? Megaphone : Hash;

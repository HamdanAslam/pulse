export function serializeUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || "",
    avatarPublicId: user.avatarPublicId || "",
    banner: user.banner || "",
    bannerPublicId: user.bannerPublicId || "",
    status: user.status || "offline",
    bio: user.bio || "",
  };
}

export function acronymFor(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return (parts.map((part) => part[0]?.toUpperCase() || "").join("") || "SV").slice(0, 2);
}

export function serializeMessage(message) {
  return {
    id: String(message._id),
    contextType: message.contextType,
    channelId: message.contextType === "server" ? String(message.channelId) : String(message.dmThreadId),
    authorId: String(message.authorId),
    content: message.content,
    createdAt: new Date(message.createdAt).getTime(),
    edited: Boolean(message.editedAt),
    replyTo: message.replyTo ? String(message.replyTo) : undefined,
    reactions: (message.reactions || []).map((reaction) => ({
      emoji: reaction.emoji,
      userIds: (reaction.userIds || []).map(String),
    })),
    attachments: (message.attachments || []).map((attachment) => ({
      type: attachment.type,
      url: attachment.url,
      name: attachment.name,
    })),
    embeds: (message.embeds || []).map((embed) => ({
      type: embed.type,
      sourceUrl: embed.sourceUrl,
      url: embed.url,
      title: embed.title,
      description: embed.description,
      siteName: embed.siteName,
      imageUrl: embed.imageUrl,
      width: embed.width || 0,
      height: embed.height || 0,
    })),
  };
}

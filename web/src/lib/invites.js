export const extractInviteCode = (value = "") => {
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const invitePathMatch = trimmed.match(/\/invite\/([a-z0-9-]+)(?:[/?#].*)?$/i);
  if (invitePathMatch) return invitePathMatch[1].toLowerCase();

  const genericUrlMatch = trimmed.match(/^https?:\/\/[^/]+\/([a-z0-9-]+)(?:[/?#].*)?$/i);
  if (genericUrlMatch) return genericUrlMatch[1].toLowerCase();

  return trimmed.replace(/[^a-z0-9-]/gi, "").toLowerCase();
};

export const extractInviteCodeFromText = (value = "") => {
  const text = String(value);
  const invitePathMatch = text.match(/https?:\/\/[^\s]*\/invite\/([a-z0-9-]+)(?:[/?#][^\s]*)?/i);
  if (invitePathMatch) return invitePathMatch[1].toLowerCase();

  const genericUrlMatch = text.match(/https?:\/\/[^\s/]+\/([a-z0-9-]+)(?:[/?#][^\s]*)?/i);
  if (genericUrlMatch) return genericUrlMatch[1].toLowerCase();

  const wwwUrlMatch = text.match(/www\.[^\s/]+\/([a-z0-9-]+)(?:[/?#][^\s]*)?/i);
  if (wwwUrlMatch) return wwwUrlMatch[1].toLowerCase();

  return "";
};

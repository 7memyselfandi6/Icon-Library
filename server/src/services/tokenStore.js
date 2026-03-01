const revokedTokens = new Map();

export const revokeToken = (token, expiresAtMs) => {
  revokedTokens.set(token, expiresAtMs);
};

export const isTokenRevoked = (token) => {
  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
};

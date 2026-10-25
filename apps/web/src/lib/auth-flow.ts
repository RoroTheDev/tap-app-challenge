const redirectFallbackCodes = [
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
];

export function authErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

export function shouldFallbackToRedirect(error: unknown) {
  const code = authErrorCode(error);
  return redirectFallbackCodes.some((fallbackCode) => code.includes(fallbackCode));
}

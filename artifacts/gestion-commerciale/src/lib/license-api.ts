const BASE = "/api/license";

export interface LicenseStatus {
  expiresAt: string;
  expired: boolean;
  daysRemaining: number;
  isTrial: boolean;
}

export interface LicenseKey {
  id: number;
  code: string;
  months: number;
  status: string;
  note: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

export async function fetchLicenseStatus(): Promise<LicenseStatus> {
  const r = await fetch(`${BASE}/status`);
  if (!r.ok) throw new Error("Impossible de vérifier la licence.");
  return r.json();
}

export async function redeemLicenseKey(code: string): Promise<LicenseStatus> {
  const r = await fetch(`${BASE}/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.success) {
    throw new Error(data.error ?? "Clé de licence invalide.");
  }
  return data;
}

export async function verifyAdminPassword(password: string): Promise<void> {
  const r = await fetch(`${BASE}/admin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.success) {
    throw new Error(data.error ?? "Mot de passe administrateur incorrect.");
  }
}

export async function fetchLicenseKeys(password: string): Promise<LicenseKey[]> {
  const r = await fetch(`${BASE}/admin/keys`, {
    headers: { "x-admin-password": password },
  });
  if (!r.ok) throw new Error("Accès refusé.");
  return r.json();
}

export async function createLicenseKey(
  password: string,
  months: number,
  note?: string,
): Promise<LicenseKey> {
  const r = await fetch(`${BASE}/admin/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": password },
    body: JSON.stringify({ months, note }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? "Erreur lors de la génération de la clé.");
  return data;
}

export async function changeAdminPassword(
  password: string,
  newPassword: string,
): Promise<void> {
  const r = await fetch(`${BASE}/admin/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": password },
    body: JSON.stringify({ newPassword }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.success) {
    throw new Error(data.error ?? "Erreur lors du changement de mot de passe.");
  }
}

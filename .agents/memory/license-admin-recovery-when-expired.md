---
name: License admin must stay reachable when expired (recovery path)
description: Why admin access and /license/admin/* routes are intentionally NOT blocked by the expiry gate
---

# Admin access is deliberately reachable even when the license is expired

The license gate blocks the whole app when expired (BlockedScreen), but BlockedScreen keeps an "Accès administrateur" button, and the server keeps `/license/*` (including `/license/admin/*`) reachable BEFORE `licenseGuard`. This is intentional, not a bug.

**Why:** the owner can disable the 30-day trial immediately (admin action that backdates expiry). If admin were also locked out when expired, an owner who disables the trial without a key on hand would be permanently bricked with no recovery. Password-protected admin access is the recovery path: log in → generate a key → redeem it.

**How to apply:** do NOT "harden" by gating admin routes/UI behind the expiry check or removing the admin button from BlockedScreen — that reintroduces the permanent-lockout footgun. The intended security boundary for admin is the admin password (scrypt-verified), not the expiry state. Business routes stay 403 when expired; admin/license routes stay open.

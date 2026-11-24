import { afterEach, describe, expect, it, vi } from "vitest";

// DJAZZI(03/10/2026): the control plane points an admin's account to the
// console (`admin.url` on /v1/me); the app shows a link in its settings.

vi.mock("../auth/tokens.js", () => ({
    getAccessToken: async () => "access-token",
}));
vi.mock("../config/rowboat.js", () => ({
    getRowboatConfig: async () => ({ billing: undefined }),
}));

import { getBillingInfo } from "./billing.js";

const me = (extra: Record<string, unknown> = {}) => ({
    user: { id: "u1", email: "a@example.com" },
    billing: {
        planId: null,
        status: null,
        trialExpiresAt: null,
        usage: {
            monthly: { sanctionedCredits: 0, usedCredits: 0, availableCredits: 0 },
            daily: { sanctionedCredits: 0, usedCredits: 0, availableCredits: 0, usageDay: "2026-10-03" },
        },
    },
    ...extra,
});

describe("getBillingInfo, Djazzi", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("hands on the console's address for an admin", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => Response.json(me({ admin: { url: "https://app.djazzi.com/admin" } }))));
        expect((await getBillingInfo()).adminUrl).toBe("https://app.djazzi.com/admin");
    });

    it("has none for anyone else, or a malformed one", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => Response.json(me())));
        expect((await getBillingInfo()).adminUrl).toBeNull();
        vi.stubGlobal("fetch", vi.fn(async () => Response.json(me({ admin: { url: 42 } }))));
        expect((await getBillingInfo()).adminUrl).toBeNull();
    });
});

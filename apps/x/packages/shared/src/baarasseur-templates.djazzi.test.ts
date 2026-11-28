import { describe, expect, it } from "vitest";
import {
    FORMER_TEMPLATE_IDS, TEMPLATE_PLAYBOOKS, TEMPLATES, isUnnamed, personaInstructions, templateOf, templateToBaarasseur,
    type Baarasseur,
} from "./baarasseur.js";

// DJAZZI(28/11/2026): the templates are jobs; the user names each bot, and
// each one reads the playbooks of its job in the skill library.
describe("the bot templates", () => {
    it("have no first name: a recruited bot is called by its title until the user names it", () => {
        const b = templateToBaarasseur(TEMPLATES.find((t) => t.id === "community-manager")!, [], "fr");
        expect(b).toMatchObject({ id: "community-manager", name: "Community manager", role: "Community manager" });
        expect(isUnnamed(b)).toBe(true);
        const prompt = personaInstructions(b);
        expect(prompt).toContain("You have no name yet");
        expect(prompt).toContain("suggest nothing unless they ask");
        const named = personaInstructions({ ...b, name: "Léa" });
        expect(named).not.toContain("You have no name yet");
        expect(named).toContain("# You are Léa, Community manager");
    });

    it("give every bot the playbooks of its job, former names and copies included", () => {
        expect(templateOf({ id: "sales-2" })?.id).toBe("sales");
        expect(templateOf({ id: "awa" })?.id).toBe("community-manager");
        expect(templateOf({ id: "my-own-bot" })).toBeUndefined();
        for (const old of Object.keys(FORMER_TEMPLATE_IDS)) expect(templateOf({ id: old }), old).toBeDefined();
        const awa: Baarasseur = { id: "awa", name: "Awa", role: "Community manager", mission: "", color: "rose", tools: [], memory: [], createdAt: "x" };
        const prompt = personaInstructions(awa);
        expect(prompt).toContain("## Your playbooks");
        expect(prompt).toContain("- marketing/social\n");
        expect(personaInstructions({ ...awa, id: "my-own-bot" })).not.toContain("## Your playbooks");
    });

    it("every template has playbooks, as <category>/<id>", () => {
        for (const t of TEMPLATES) {
            expect(TEMPLATE_PLAYBOOKS[t.id], t.id).toBeDefined();
            for (const p of TEMPLATE_PLAYBOOKS[t.id]) expect(p).toMatch(/^[a-z]+\/[a-z0-9-]+$/);
        }
    });
});

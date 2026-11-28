import z from "zod";

// DJAZZI(06/10/2026): the baarasseurs — named agents the user recruits
// (baara, work in Dioula, and « bosseurs »). Each one is the copilot with its
// own name, mission, tools, model and hours: it keeps every capability of the
// assistant, and its conversations carry the agent id `baarasseur-<id>`.
// They live in the workspace (config/baarasseurs.json), written by the app's
// Baarasseurs page and read by the core on every turn, so an edit applies to
// the next message.

export const BAARASSEURS_PATH = "config/baarasseurs.json";
export const BAARASSEUR_PREFIX = "baarasseur-";
/** A rule it keeps is a line, and it keeps a few: the prompt stays short. */
export const MEMORY_LIMIT = 30;
export const DOCUMENTS_LIMIT = 20;
/** Where its documents are kept, one folder each. */
export const DOCUMENTS_DIR = "baarasseurs";

// DJAZZI(11/10/2026): the approved avatar family uses stable ids so the
// phone and desktop keep the same choice in the workspace profile.
export const AVATAR_IDS = ["original", "bop", "moki", "nova", "tiko", "nimbo", "pixel", "zest", "ink", "street"] as const;
export type AgentAvatarId = typeof AVATAR_IDS[number];
export const AGENT_AVATARS: ReadonlyArray<{ id: AgentAvatarId; label: string }> = [
    { id: "original", label: "B" }, { id: "bop", label: "Bop" },
    { id: "moki", label: "Moki" }, { id: "nova", label: "Nova" },
    { id: "tiko", label: "Tiko" }, { id: "nimbo", label: "Nimbo" },
    { id: "pixel", label: "Pixel" }, { id: "zest", label: "Zest" },
    { id: "ink", label: "Ink" }, { id: "street", label: "Street" },
];

// DJAZZI(07/11/2026): the shapes a new agent picks (Grok Bot's way of
// making one: a shape, a colour, a name), all of the B's family: the same
// two round eyes. The phone draws them (agent-shape.tsx); an agent without
// one keeps its avatar.
export const SHAPE_IDS = ["b", "round", "pebble", "dome", "drop", "pill", "square", "arch", "bean", "cloud", "leaf", "kite"] as const;
export type AgentShapeId = typeof SHAPE_IDS[number];

export const BaarasseurScheduleSchema = z.object({
    every: z.enum(["day", "weekday", "week", "month"]),
    /** The day of the week (0 = Sunday) for "week", of the month (1–28) for "month". */
    day: z.number().int().min(0).max(28).optional(),
    hour: z.number().int().min(0).max(23),
});

export const BaarasseurSchema = z.object({
    id: z.string().regex(/^[a-z0-9-]{1,40}$/),
    name: z.string().min(1).max(40),
    role: z.string().max(60).default(""),
    mission: z.string().max(4000).default(""),
    /** One of the avatar tints the app offers. */
    color: z.string().max(20).default("clay"),
    // Missing or future avatars keep old profiles readable with their initials.
    avatar: z.enum(AVATAR_IDS).optional().catch(undefined),
    shape: z.enum(SHAPE_IDS).optional().catch(undefined),
    /** The tools it works with, as the app names them (Gmail, WhatsApp…). */
    tools: z.array(z.string().max(40)).max(20).default([]),
    model: z.string().optional(),
    provider: z.string().optional(),
    schedule: BaarasseurScheduleSchema.nullable().optional(),
    memory: z.array(z.string().max(300)).max(MEMORY_LIMIT).default([]),
    /** Its documents (08/10/2026): workspace paths it reads when the mission needs them. */
    documents: z.array(z.string().max(300)).max(DOCUMENTS_LIMIT).default([]),
    /** DJAZZI(26/11/2026): paused, it keeps its hours but does not run on its own. */
    paused: z.boolean().optional().catch(undefined),
    createdAt: z.string(),
});

// Written out rather than inferred, so every package reads the same shape.
export interface BaarasseurSchedule {
    every: "day" | "weekday" | "week" | "month";
    day?: number;
    hour: number;
}

export interface Baarasseur {
    id: string;
    name: string;
    role: string;
    mission: string;
    color: string;
    avatar?: AgentAvatarId;
    shape?: AgentShapeId;
    tools: string[];
    model?: string;
    provider?: string;
    schedule?: BaarasseurSchedule | null;
    memory: string[];
    documents?: string[];
    /** Paused: its hours are kept, its scheduled runs do not start. */
    paused?: boolean;
    createdAt: string;
}

export function baarasseurAgentId(id: string): string {
    return `${BAARASSEUR_PREFIX}${id}`;
}

export function baarasseurIdOf(agentId: string | null | undefined): string | null {
    return agentId?.startsWith(BAARASSEUR_PREFIX) ? agentId.slice(BAARASSEUR_PREFIX.length) : null;
}

/** Reads the file's text leniently: a broken entry is dropped, not the whole team. */
export function parseBaarasseurs(text: string | null | undefined): Baarasseur[] {
    if (!text) return [];
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return [];
    }
    const list = (raw as { baarasseurs?: unknown })?.baarasseurs;
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry) => {
        const parsed = BaarasseurSchema.safeParse(entry);
        return parsed.success ? [parsed.data as Baarasseur] : [];
    });
}

export function scheduleCron(s: BaarasseurSchedule): string {
    switch (s.every) {
        case "day": return `0 ${s.hour} * * *`;
        case "weekday": return `0 ${s.hour} * * 1-5`;
        case "week": return `0 ${s.hour} * * ${s.day ?? 1}`;
        case "month": return `0 ${s.hour} ${Math.max(1, s.day ?? 1)} * *`;
    }
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** When it next works on its own, on this machine's clock (the routine's cron runs on it). */
export function nextRunAt(s: BaarasseurSchedule, from: Date): Date {
    const at = new Date(from);
    at.setMinutes(0, 0, 0);
    at.setHours(s.hour);
    const fits = (d: Date) => {
        switch (s.every) {
            case "day": return true;
            case "weekday": return d.getDay() >= 1 && d.getDay() <= 5;
            case "week": return d.getDay() === (s.day ?? 1);
            case "month": return d.getDate() === Math.max(1, s.day ?? 1);
        }
    };
    // A month at most ahead: every schedule here fits within one.
    for (let i = 0; i < 32; i++) {
        if (at > from && fits(at)) return at;
        at.setDate(at.getDate() + 1);
        at.setHours(s.hour, 0, 0, 0);
    }
    return at;
}

/** In English for the prompt; the app words it in the user's language. */
export function scheduleWords(s: BaarasseurSchedule): string {
    const at = `at ${s.hour}:00`;
    switch (s.every) {
        case "day": return `every day ${at}`;
        case "weekday": return `every weekday ${at}`;
        case "week": return `every ${DAYS[s.day ?? 1]} ${at}`;
        case "month": return `on day ${Math.max(1, s.day ?? 1)} of every month ${at}`;
    }
}

/** What its scheduled run opens with. */
export const SCHEDULED_MESSAGE = "It is time for your scheduled run. Do your mission now, then report briefly: what you did, and what waits for my approval.";

/**
 * The part of the system prompt that makes the copilot this baarasseur.
 * What the user typed goes in as their words, fenced, never as our rules.
 */
export function personaInstructions(b: Baarasseur): string {
    const lines = [
        `# You are ${b.name}${b.role ? `, ${b.role}` : ""}`,
        "",
        `In this conversation you are not the general assistant: you are ${b.name}, a « baarasseur » the user recruited in Djazzi — a named colleague with one mission. Speak as ${b.name}, in the user's language, and keep to your mission; for anything far from it, say that the Djazzi assistant is better placed.`,
        "",
        "## Your mission, in the user's words",
        "<mission>",
        b.mission.trim() || "(No mission written yet: ask the user what you should take care of.)",
        "</mission>",
    ];
    // DJAZZI(07/11/2026): the first meeting, as Grok Bot's bots open: until it
    // remembers anything, it gets to know the user before working.
    if (b.memory.length === 0) {
        lines.push(
            "",
            "## First meeting",
            `You have not met the user yet. The app has already greeted them in your name and asked how they would like you to address them, so their first message may be that answer. Before working, get to know them with the essentials only, one short question at a time and never more than three in all: how to address them, what their activity is, and what they expect from you if your mission does not already say it. Save each answer with \`baarasseur-remember\` (id "${b.id}"), then get to work.`,
        );
    }
    // DJAZZI(07/11/2026): one made with « + » has only its first name; it
    // finds its title with the user, as the templates have one.
    if (!b.role.trim()) {
        lines.push(
            "",
            "## Your title",
            `You have no title yet. Once you know what the user expects from you, propose a short professional title (1 to 4 words, e.g. « Assistante commerciale »), and when they agree, set it with \`baarasseur-update\` (id "${b.id}", role).`,
        );
    }
    // DJAZZI(28/11/2026): a template has no first name; the user gives it one.
    if (isUnnamed(b) && b.role.trim()) {
        lines.push(
            "",
            "## Your name",
            `You have no name yet: the user knows you by your title. Early in your first exchange, ask them what they would like to call you — any name they like — and suggest nothing unless they ask. When they answer, set it with \`baarasseur-update\` (id "${b.id}", name), then use it. If they prefer your title, keep it.`,
        );
    } else {
        lines.push(
            "",
            "## Your name",
            `If the user wants to call you differently or change your role, call \`baarasseur-update\` with id "${b.id}", then answer under your new name.`,
        );
    }
    const playbooks = TEMPLATE_PLAYBOOKS[templateOf(b)?.id ?? ""] ?? [];
    if (playbooks.length > 0) {
        lines.push(
            "",
            "## Your playbooks",
            "Expert playbooks for your job are in Djazzi's skill library. Before a task one of them covers, read that one with `file-readText` (`library/<playbook>/SKILL.md`) and follow it, under its « In Djazzi » note; read only the one the task needs. If the file is missing, do the task with your own judgment. For other know-how, load the Skill library skill.",
            ...playbooks.map((p) => `- ${p}`),
        );
    }
    if (b.tools.length > 0) {
        lines.push(
            "",
            "## Your tools",
            `The user gave you these to work with: ${b.tools.join(", ")}. Prefer them; use another only when the mission truly needs it. If one is not connected yet, say so and tell the user where to connect it.`,
        );
    }
    lines.push(
        "",
        "## What you remember",
        ...(b.memory.length > 0 ? b.memory.map((m) => `- ${m}`) : ["(Nothing yet.)"]),
        `When the user gives you a lasting rule or fact for your mission, call \`baarasseur-remember\` with id "${b.id}" and the rule in one short line, then confirm it in one sentence.`,
    );
    const documents = b.documents ?? [];
    if (documents.length > 0) {
        lines.push(
            "",
            "## Your documents",
            "The user gave you these files, in the workspace. Read the one the task needs (parseFile for PDF, Word or Excel; the workspace tools for text) before answering from memory, and quote what you rely on.",
            ...documents.map((d) => `- ${d}`),
        );
    }
    // DJAZZI(26/11/2026): what waits for the user goes on the « À valider »
    // list of the Djazzi Bots page, not only in the conversation.
    lines.push(
        "",
        "## What needs the user's approval",
        `Never send, publish, post, pay or delete, nor do anything your mission says needs the user's agreement, before they say yes. When they are talking with you, ask them right here. In a scheduled run (nobody is watching), call \`baarasseur-ask-approval\` (id "${b.id}") with a one-line summary and the full draft instead: it goes on their list of things to approve in Djazzi, and their « yes » or « no » comes back to you.`,
    );
    if (b.schedule) {
        lines.push(
            "",
            "## Your hours",
            `You also work on your own, ${scheduleWords(b.schedule)}. A scheduled run has nobody watching: never send, publish, post, pay or delete during it. Prepare drafts instead, and end with a short report of what you did and what waits for the user's approval.`,
        );
    }
    return lines.join("\n");
}


// ---------------------------------------------------------------------------
// The recruiting kit, shared by the desktop and the phone (06/10/2026): the
// tools one can give, the templates of the site's carousel, the sentence →
// form step, and the save that keeps the team, its memory and its hours.
// Kept here, out of the apps' sources, so their i18n extractors never take a
// prompt or a template for interface text.

export type Lang = "fr" | "en";

/** The tools one can give, by the name the prompt and the chips use. */
export const TOOLS = [
    "Gmail", "Google Calendar", "WhatsApp", "Telegram", "Google Sheets", "Google Docs", "Google Drive",
    "Outlook", "Web search", "Browser", "Images and videos",
    // DJAZZI(12/11/2026): the social networks, for the community manager.
    "Instagram", "Facebook", "LinkedIn", "X",
] as const;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** The avatar tints, by name. */
export const COLORS = ["clay", "blue", "green", "violet", "rose", "amber", "teal"] as const;
/** More colours for a shape (07/11/2026); the tints above read them as clay. */
export const SHAPE_COLORS = ["white", "brown", "red", "orange", "amber", "green", "teal", "blue", "violet", "rose", "gray"] as const;

type Words = { fr: string; en: string };
export interface Template {
    /** Its job, never a first name (28/11/2026): the user names the bot themself. */
    id: string;
    color: string;
    role: Words;
    /** A few words on what it handles, under the role on the template's card. */
    summary: Words;
    mission: Words;
    tools: string[];
    schedule: BaarasseurSchedule | null;
}

// The site's carousel (control home-page.ts), as ready-to-recruit baarasseurs.
export const TEMPLATES: Template[] = [
    {
        "id": "sales",
        "color": "clay",
        "tools": [
            "Gmail",
            "WhatsApp",
            "Google Sheets"
        ],
        "schedule": {
            "every": "week",
            "day": 1,
            "hour": 8
        },
        "role": {
            "fr": "Commerciale",
            "en": "Sales"
        },
        "summary": {
            "fr": "Relances, devis, prospects",
            "en": "Follow-ups, quotes, prospects"
        },
        "mission": {
            "fr": "Chaque lundi, relance les prospects qui n’ont pas répondu depuis une semaine, avec un message court et poli. Prépare les devis à partir de ma grille de prix. Ne promets jamais de remise sans mon accord.",
            "en": "Every Monday, follow up with prospects who have not answered for a week, with a short, polite message. Prepare quotes from my price list. Never promise a discount without my approval."
        }
    },
    {
        "id": "accountant",
        "color": "blue",
        "tools": [
            "Google Sheets",
            "Gmail"
        ],
        "schedule": {
            "every": "month",
            "day": 5,
            "hour": 8
        },
        "role": {
            "fr": "Comptable SYSCOHADA",
            "en": "SYSCOHADA accountant"
        },
        "summary": {
            "fr": "Comptes, TVA, états financiers",
            "en": "Books, VAT, statements"
        },
        "mission": {
            "fr": "Tiens mes comptes selon le SYSCOHADA : classe les recettes et les dépenses, prépare la déclaration de TVA du mois et signale-moi tout écart.",
            "en": "Keep my books under SYSCOHADA: file income and expenses, prepare the month’s VAT return and point out anything that does not add up."
        }
    },
    {
        "id": "assistant",
        "color": "violet",
        "tools": [
            "Google Calendar",
            "Gmail"
        ],
        "schedule": {
            "every": "weekday",
            "hour": 7
        },
        "role": {
            "fr": "Assistante personnelle",
            "en": "Personal assistant"
        },
        "summary": {
            "fr": "Agenda, emails, rappels",
            "en": "Calendar, emails, reminders"
        },
        "mission": {
            "fr": "Chaque matin, résume-moi mon agenda du jour et les emails importants. Propose des réponses courtes, et rappelle-moi ce qui ne doit pas attendre.",
            "en": "Every morning, sum up my day’s agenda and the important emails. Suggest short replies, and remind me of what cannot wait."
        }
    },
    {
        "id": "shop",
        "color": "green",
        "tools": [
            "WhatsApp",
            "Google Sheets"
        ],
        "schedule": null,
        "role": {
            "fr": "Gestion de boutique",
            "en": "Shop manager"
        },
        "summary": {
            "fr": "Stocks et commandes WhatsApp",
            "en": "Stock and WhatsApp orders"
        },
        "mission": {
            "fr": "Suis mes stocks dans mon tableau et réponds aux commandes WhatsApp : prix, disponibilité, livraison. Préviens-moi quand un article passe sous 10 unités.",
            "en": "Keep track of my stock in my sheet and answer WhatsApp orders: price, availability, delivery. Tell me when an item drops below 10 units."
        }
    },
    {
        "id": "hr",
        "color": "rose",
        "tools": [
            "Google Drive",
            "Gmail"
        ],
        "schedule": null,
        "role": {
            "fr": "RH et paie",
            "en": "HR and payroll"
        },
        "summary": {
            "fr": "Bulletins, congés, contrats",
            "en": "Payslips, leave, contracts"
        },
        "mission": {
            "fr": "Prépare les bulletins de paie, suis les congés et les contrats de l’équipe, et rappelle-moi les échéances (fins de contrat, déclarations sociales).",
            "en": "Prepare payslips, track the team’s leave and contracts, and remind me of deadlines (contract ends, social security returns)."
        }
    },
    {
        "id": "logistics",
        "color": "amber",
        "tools": [
            "WhatsApp",
            "Google Calendar"
        ],
        "schedule": {
            "every": "day",
            "hour": 7
        },
        "role": {
            "fr": "Logistique",
            "en": "Logistics"
        },
        "summary": {
            "fr": "Livraisons, clients prévenus",
            "en": "Deliveries, customers kept informed"
        },
        "mission": {
            "fr": "Planifie les livraisons du jour par quartier, prépare un message pour prévenir chaque client de l’heure de passage, et signale les retards.",
            "en": "Plan the day’s deliveries by area, prepare a message telling each customer when we will come, and flag delays."
        }
    },
    {
        "id": "designer",
        "color": "teal",
        "tools": [
            "Images and videos",
            "Google Drive"
        ],
        "schedule": {
            "every": "week",
            "day": 1,
            "hour": 9
        },
        "role": {
            "fr": "Designer",
            "en": "Designer"
        },
        "summary": {
            "fr": "Visuels et posts de la semaine",
            "en": "Visuals and the week’s posts"
        },
        "mission": {
            "fr": "Chaque semaine, propose 3 publications pour mes réseaux : le texte et le visuel, dans mes couleurs. Rien n’est publié sans mon accord.",
            "en": "Every week, suggest 3 posts for my social media: the text and the visual, in my colours. Nothing is posted without my approval."
        }
    },
    {
        "id": "analyst",
        "color": "blue",
        "tools": [
            "Google Sheets",
            "Web search"
        ],
        "schedule": null,
        "role": {
            "fr": "Analyste data",
            "en": "Data analyst"
        },
        "summary": {
            "fr": "Chiffres, tableaux, tendances",
            "en": "Figures, tables, trends"
        },
        "mission": {
            "fr": "Lis mes ventes et dis-moi, en 5 points maximum, ce qui marche, ce qui baisse et quoi changer.",
            "en": "Read my sales and tell me, in 5 points at most, what works, what is dropping and what to change."
        }
    },
    // DJAZZI(12/11/2026): the social networks, run with the person's approval (the founder's call): the bot prepares, the person says yes, then it goes out.
    {
        "id": "community-manager",
        "color": "rose",
        "tools": [
            "Instagram",
            "Facebook",
            "LinkedIn",
            "X",
            "Images and videos"
        ],
        "schedule": {
            "every": "weekday",
            "hour": 9
        },
        "role": {
            "fr": "Community manager",
            "en": "Community manager"
        },
        "summary": {
            "fr": "Posts, commentaires, messages",
            "en": "Posts, comments, messages"
        },
        "mission": {
            "fr": "Gère mes réseaux sociaux. Chaque matin de semaine, prépare les publications du jour pour chaque réseau : le texte adapté, le visuel proposé et la meilleure heure. Lis les nouveaux commentaires et messages, et prépare une réponse courte et polie, dans mon ton. Chaque vendredi, fais-moi un point en 5 lignes : ce qui a le mieux marché, ce qui a moins marché, et quoi publier la semaine suivante. Ne publie, ne réponds et n’envoie jamais rien sans mon accord : tout reste en brouillon jusqu’à ce que je dise oui.",
            "en": "Run my social media. Every weekday morning, prepare the day’s posts for each network: the text fitted to it, the suggested visual and the best time. Read the new comments and messages, and prepare a short, polite reply in my tone. Every Friday, give me a 5-line review: what worked best, what worked less, and what to post next week. Never post, reply or send anything without my approval: everything stays a draft until I say yes."
        }
    },
    // DJAZZI(28/11/2026): bots for precise jobs, each with its playbooks (TEMPLATE_PLAYBOOKS).
    {
        "id": "founder",
        "color": "amber",
        "tools": [
            "Web search",
            "Google Docs",
            "Google Sheets"
        ],
        "schedule": null,
        "role": {
            "fr": "Création d’entreprise",
            "en": "Business starter"
        },
        "summary": {
            "fr": "Projet, offre, prix, lancement",
            "en": "Plan, offer, pricing, launch"
        },
        "mission": {
            "fr": "Aide-moi à créer et lancer mon entreprise. À partir de mon idée, construis avec moi le projet étape par étape : le client visé, l’offre, les prix, la concurrence, le nom et l’image, le plan de lancement et les premiers chiffres à suivre. Pose-moi une question à la fois, garde ce que nous décidons, et dis-moi franchement ce qui te paraît fragile. N’invente aucun chiffre : ce que tu ne sais pas, demande-le-moi ou dis-moi comment le trouver.",
            "en": "Help me start and launch my business. From my idea, build the project with me step by step: the target customer, the offer, the prices, the competition, the name and image, the launch plan and the first figures to track. Ask me one question at a time, keep what we decide, and tell me frankly what looks fragile. Never invent a figure: what you do not know, ask me or tell me how to find it."
        }
    },
    {
        "id": "seo",
        "color": "teal",
        "tools": [
            "Web search",
            "Browser",
            "Google Docs"
        ],
        "schedule": {
            "every": "month",
            "day": 1,
            "hour": 9
        },
        "role": {
            "fr": "Référencement web",
            "en": "SEO and website"
        },
        "summary": {
            "fr": "Google, site, pages qui vendent",
            "en": "Search, website, pages that sell"
        },
        "mission": {
            "fr": "Fais que mes clients me trouvent sur internet. Vérifie comment mon site et ma fiche Google apparaissent, propose les corrections une par une en commençant par les plus utiles, et rédige les pages, les textes et les articles qui répondent à ce que mes clients cherchent. Chaque mois, fais-moi un point court : ce qui a progressé et quoi faire ensuite. Ne modifie et ne publie rien sur mon site sans mon accord.",
            "en": "Make my customers find me online. Check how my website and my Google listing show up, suggest fixes one at a time, the most useful first, and write the pages, texts and articles that answer what my customers search for. Every month, give me a short review: what improved and what to do next. Never change or publish anything on my website without my approval."
        }
    },
    {
        "id": "customer-service",
        "color": "violet",
        "tools": [
            "WhatsApp",
            "Gmail",
            "Google Calendar"
        ],
        "schedule": {
            "every": "weekday",
            "hour": 9
        },
        "role": {
            "fr": "Service client",
            "en": "Customer service"
        },
        "summary": {
            "fr": "Réponses, avis, rendez-vous",
            "en": "Replies, reviews, appointments"
        },
        "mission": {
            "fr": "Occupe-toi de mes clients. Chaque matin de semaine, prépare des réponses courtes, polies et dans leur langue à leurs nouveaux messages, propose des rendez-vous selon mon agenda, et après une vente réussie, prépare une demande d’avis. Note les questions qui reviennent souvent pour qu’on y réponde une fois pour toutes. N’envoie rien et ne promets ni remboursement ni geste commercial sans mon accord.",
            "en": "Take care of my customers. Every weekday morning, prepare short, polite replies in their language to their new messages, suggest appointments from my calendar, and after a successful sale, prepare a review request. Note the questions that keep coming back so we answer them once and for all. Never send anything, and never promise a refund or a discount without my approval."
        }
    }
];

/**
 * DJAZZI(28/11/2026): each template's playbooks in the skill library
 * (instance library.ts, `library/<category>/<id>/SKILL.md`): the bot reads
 * the one a task needs, so it works as an expert of its job would.
 */
export const TEMPLATE_PLAYBOOKS: Record<string, string[]> = {
    "sales": ["marketing/prospecting", "marketing/cold-email", "marketing/email-sequence", "sales/contract-and-proposal-writer", "sales/pricing-strategist", "marketing/offers", "operations/chase-late-payments"],
    "accountant": ["finance/month-end-close", "finance/financial-analyst", "operations/chase-late-payments", "business/founder-cfo"],
    "assistant": ["operations/inbox-triage", "operations/meetings", "operations/book-appointments", "operations/weekly-review", "operations/short-reports", "operations/write-like-a-person"],
    "shop": ["operations/procurement-optimizer", "operations/vendor-management", "operations/reply-in-their-language", "operations/ask-for-reviews", "marketing/offers"],
    "hr": ["business/chro-advisor", "business/culture-architect", "operations/team-communications", "business/change-management"],
    "logistics": ["operations/process-mapper", "operations/capacity-planner", "operations/vendor-management", "operations/reply-in-their-language"],
    "designer": ["design/brand", "design/banner-design", "marketing/graphic-designer", "marketing/brand-guidelines", "design/impeccable", "marketing/youtube-thumbnail"],
    "analyst": ["marketing/analytics", "marketing/campaign-analytics", "product/product-analytics", "research/market-research", "marketing/social-media-analyzer"],
    "community-manager": ["marketing/social", "marketing/social-content", "marketing/content-strategy", "marketing/community-marketing", "marketing/hook-generator", "marketing/post-writer", "marketing/reels-scripting", "marketing/copywriting", "marketing/marketing-ideas"],
    "founder": ["business/founder-plan", "business/founder-offer", "business/founder-pricing", "business/founder-competitors", "business/founder-brand", "business/founder-launch", "business/founder-cfo", "business/founder-marketing", "business/founder-ops", "marketing/business-name-fit", "research/market-research"],
    "seo": ["marketing/seo-audit", "marketing/local-seo-manager", "marketing/ai-seo", "marketing/site-architecture", "marketing/page-cro", "marketing/schema-markup", "marketing/copywriting", "marketing/youtube-seo"],
    "customer-service": ["operations/reply-in-their-language", "operations/ask-for-reviews", "operations/book-appointments", "sales/customer-success-manager", "sales/support-ops", "marketing/churn-prevention", "operations/write-like-a-person"],
};

/** The templates' first names until 28/11/2026: bots recruited then keep their template. */
export const FORMER_TEMPLATE_IDS: Record<string, string> = {
    mariama: "sales", ibrahim: "accountant", adjoua: "assistant", aminata: "shop", fatou: "hr",
    moussa: "logistics", zara: "designer", kofi: "analyst", awa: "community-manager",
};

/** The template a bot was recruited from, by its id (« sales », « sales-2 », the former « mariama »). */
export function templateOf(b: Pick<Baarasseur, "id">): Template | undefined {
    const base = b.id.replace(/-\d+$/, "");
    const id = FORMER_TEMPLATE_IDS[base] ?? base;
    return TEMPLATES.find((t) => t.id === id);
}

/** Its name is still its title: the user has not named it yet. */
export function isUnnamed(b: Pick<Baarasseur, "name" | "role">): boolean {
    return b.name.trim().toLowerCase() === b.role.trim().toLowerCase();
}

/** A readable, unique id from the name: « Aminata » → aminata, then aminata-2. */
export function idFor(name: string, taken: string[]): string {
    const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "baarasseur";
    let id = base;
    for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
    return id;
}

export function templateToBaarasseur(t: Template, taken: string[], lang: Lang): Baarasseur {
    return {
        // DJAZZI(28/11/2026): no first name, the user gives one (personaInstructions).
        id: idFor(t.id, taken), name: t.role[lang], role: t.role[lang], mission: t.mission[lang], color: t.color,
        avatar: "original", tools: t.tools, schedule: t.schedule, memory: [], createdAt: new Date().toISOString(),
    };
}

export function blankBaarasseur(taken: string[]): Baarasseur {
    return { id: idFor("baarasseur", taken), name: "", role: "", mission: "", color: "clay", avatar: "original", tools: [], schedule: null, memory: [], createdAt: new Date().toISOString() };
}

const DESCRIBE = [
    "You help a business recruit a « baarasseur »: an AI colleague with one mission, whom the user names themself.",
    "From the user's sentence, answer ONLY with a JSON object, no prose, no code fence:",
    "{\"name\": the same words as role (the user gives the bot its name later), \"role\": 1 to 4 words, \"mission\": 2 to 4 sentences in the second person saying what to do, how, and what never to do without approval,",
    " \"tools\": a subset of $TOOLS, \"schedule\": null or {\"every\": \"day\"|\"weekday\"|\"week\"|\"month\", \"day\": 0-6 for week (0 = Sunday) or 1-28 for month, \"hour\": 0-23}}.",
    "Write name, role and mission in $LANG."
];
const LANGUAGES: Record<Lang, string> = { fr: "French, with « tu »", en: "English" };

/** Asks the model to fill the form from a sentence (llm:generate's system). */
export function describeSystem(lang: Lang): string {
    return DESCRIBE.join("\n").replace("$TOOLS", JSON.stringify(TOOLS)).replace("$LANG", LANGUAGES[lang]);
}

/** Reads the form the model filled, keeping only known tools and sane hours. */
export function parseDescribed(text: string): Partial<Baarasseur> | null {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        const raw = JSON.parse(match[0]) as Record<string, unknown>;
        const out: Partial<Baarasseur> = {};
        if (typeof raw.name === "string") out.name = raw.name.slice(0, 40);
        if (typeof raw.role === "string") out.role = raw.role.slice(0, 60);
        if (typeof raw.mission === "string") out.mission = raw.mission.slice(0, 4000);
        if (Array.isArray(raw.tools)) out.tools = raw.tools.filter((t): t is string => (TOOLS as readonly string[]).includes(t as string));
        const s = raw.schedule as Record<string, unknown> | null | undefined;
        if (s === null) out.schedule = null;
        else if (s && ["day", "weekday", "week", "month"].includes(s.every as string) && typeof s.hour === "number") {
            out.schedule = {
                every: s.every as BaarasseurSchedule["every"],
                hour: Math.min(23, Math.max(0, Math.round(s.hour))),
                ...(typeof s.day === "number" ? { day: Math.min(28, Math.max(0, Math.round(s.day))) } : {}),
            };
        }
        return out;
    } catch {
        return null;
    }
}

/** Said to it during a try-out, after its persona: no tools, nothing sent. */
export const TRYOUT_NOTE = "## This is a try-out\nThe user is trying you out before recruiting you. You have no tools here: answer as you would, say what you would do and with which tool, but do not claim to have done it.";

/** Its scheduled run's first message, shown in its conversation. */
export const SCHEDULED_MESSAGES: Record<Lang, string> = {
    fr: "C’est l’heure de ton passage automatique. Fais ta mission maintenant, puis fais-moi un court rapport : ce que tu as fait, et ce qui attend mon accord.",
    en: SCHEDULED_MESSAGE,
};

/** The try-out's request: its persona, the note, and the exchange so far. */
export function tryoutRequest(b: Baarasseur, turns: Array<{ role: "user" | "assistant"; text: string }>) {
    const name = b.name.trim() || "Baarasseur";
    const transcript = turns.map((t) => `${t.role === "user" ? "USER" : name}: ${t.text}`).join("\n\n");
    return {
        prompt: `${transcript}\n\n${name}:`,
        system: `${personaInstructions({ ...b, name })}\n\n${TRYOUT_NOTE}`,
        ...(b.model ? { model: b.model, provider: b.provider } : {}),
    };
}

/** What the app's IPC or the phone's RPC offers: one call by channel. */
export type Invoke = (channel: string, args: unknown) => Promise<unknown>;

/**
 * Writes the team, then its hours: a removed one loses its schedule, a
 * changed one starts afresh. The file is read again first, so a rule a
 * baarasseur kept meanwhile (the core writes its memory) is not lost.
 * Returns the team as written.
 */
export async function saveTeam(
    invoke: Invoke,
    change: (current: Baarasseur[]) => Baarasseur[],
    touched: { id: string; removed?: boolean },
    lang: Lang,
): Promise<Baarasseur[]> {
    let current: Baarasseur[] = [];
    try {
        const r = await invoke("workspace:readFile", { path: BAARASSEURS_PATH, encoding: "utf8" }) as { data?: string };
        current = parseBaarasseurs(r?.data);
    } catch {
        // No file yet: the first recruit.
    }
    const next = change(current);
    await invoke("workspace:writeFile", {
        path: BAARASSEURS_PATH, data: JSON.stringify({ baarasseurs: next }, null, 2), opts: { mkdirp: true },
    });
    const agentName = baarasseurAgentId(touched.id);
    const b = next.find((x) => x.id === touched.id);
    await invoke("agent-schedule:deleteAgent", { agentName }).catch(() => {});
    if (!touched.removed && b?.schedule) {
        await invoke("agent-schedule:updateAgent", {
            agentName,
            entry: {
                schedule: { type: "cron", expression: scheduleCron(b.schedule) },
                // DJAZZI(26/11/2026): paused, the entry stays with its hours, off.
                enabled: !b.paused,
                startingMessage: SCHEDULED_MESSAGES[lang],
                description: `${b.name}${b.role ? ` · ${b.role}` : ""}`,
            },
        });
    }
    return next;
}

/** Saves one: rules kept since the form opened stay, unless the person removed them (`forgotten`). */
export function upsertChange(b: Baarasseur, forgotten: string[] = []) {
    return (current: Baarasseur[]): Baarasseur[] => {
        const stored = current.find((x) => x.id === b.id);
        if (!stored) return [...current, b];
        const memory = [...b.memory, ...stored.memory.filter((m) => !b.memory.includes(m) && !forgotten.includes(m))];
        return current.map((x) => (x.id === b.id ? { ...b, memory } : x));
    };
}


// ---------------------------------------------------------------------------
// DJAZZI(26/11/2026): the Djazzi Bots page — the catalogue's categories, what
// waits for the user's approval, and how much each bot works. Kept here so
// the desktop and the phone read the same files the same way.

export type BotCategory = "sales" | "finance" | "assistant" | "shop" | "hr" | "content" | "data" | "business";
export const BOT_CATEGORIES: ReadonlyArray<{ id: BotCategory; label: Words }> = [
    { id: "sales", label: { fr: "Ventes", en: "Sales" } },
    { id: "finance", label: { fr: "Comptabilité", en: "Finance" } },
    { id: "assistant", label: { fr: "Assistant", en: "Assistant" } },
    { id: "shop", label: { fr: "Boutique", en: "Shop" } },
    { id: "hr", label: { fr: "RH", en: "HR" } },
    { id: "content", label: { fr: "Contenu", en: "Content" } },
    { id: "data", label: { fr: "Données", en: "Data" } },
    { id: "business", label: { fr: "Entreprise", en: "Business" } },
];
/** Each template's category; one not listed falls under the assistant. */
export const TEMPLATE_CATEGORY: Record<string, BotCategory> = {
    sales: "sales", accountant: "finance", assistant: "assistant", shop: "shop", hr: "hr",
    logistics: "shop", designer: "content", analyst: "data", "community-manager": "content",
    founder: "business", seo: "content", "customer-service": "sales",
};
export const templateCategory = (t: Pick<Template, "id">): BotCategory => TEMPLATE_CATEGORY[t.id] ?? "assistant";
/** The page's ideas to start from: the one picked is also the sentence Djazzi prepares the bot from. */
export const BOT_IDEAS: ReadonlyArray<Words> = [
    { fr: "Relancer mes clients chaque lundi", en: "Follow up with my customers every Monday" },
    { fr: "Trier ma boîte mail chaque matin", en: "Sort my inbox every morning" },
    { fr: "Suivre mes stocks", en: "Keep track of my stock" },
    { fr: "Résumer mes réunions", en: "Sum up my meetings" },
];
/** How a decided one reads in the activity. */
export const DECIDED_WORDS: Record<"approved" | "refused", Words> = {
    approved: { fr: "Validé", en: "Approved" },
    refused: { fr: "Refusé", en: "Refused" },
};
/** The two the page puts forward, « Choisis par Djazzi ». */
export const FEATURED_TEMPLATES = ["accountant", "shop"] as const;

/** What a bot asked the user to approve (written by the core, decided in the app). */
export const APPROVALS_PATH = "config/baarasseurs-approvals.json";
/** Kept: the pending ones, and the latest decisions for the activity. */
export const APPROVALS_LIMIT = 200;

export const BaarasseurApprovalSchema = z.object({
    id: z.string(),
    /** The baarasseur's id (not the agent id). */
    bot: z.string(),
    /** The chat session it asked from, to answer there; null for a headless run. */
    sessionId: z.string().nullable().default(null),
    runId: z.string().default(""),
    summary: z.string().max(300),
    detail: z.string().max(8000).default(""),
    createdAt: z.string(),
    status: z.enum(["pending", "approved", "refused"]).default("pending"),
    decidedAt: z.string().optional(),
});
export type BaarasseurApproval = z.infer<typeof BaarasseurApprovalSchema>;

/** Reads the list leniently: a broken entry is dropped, not the list. */
export function parseApprovals(text: string | null | undefined): BaarasseurApproval[] {
    if (!text) return [];
    try {
        const raw = JSON.parse(text) as { approvals?: unknown };
        if (!Array.isArray(raw.approvals)) return [];
        return raw.approvals.flatMap((entry) => {
            const parsed = BaarasseurApprovalSchema.safeParse(entry);
            return parsed.success ? [parsed.data] : [];
        });
    } catch {
        return [];
    }
}

/** The list once one is added: newest last, the oldest decided ones go first when full. */
export function withApproval(list: BaarasseurApproval[], next: BaarasseurApproval): BaarasseurApproval[] {
    const all = [...list, next];
    while (all.length > APPROVALS_LIMIT) {
        const i = all.findIndex((a) => a.status !== "pending");
        all.splice(i >= 0 ? i : 0, 1);
    }
    return all;
}

/** The user's answer, said to the bot in its conversation. */
export function approvalAnswer(a: Pick<BaarasseurApproval, "summary" | "detail" | "sessionId">, approved: boolean, lang: Lang): string {
    const fr = lang === "fr";
    const said = approved
        ? (fr ? `Oui, c’est validé : ${a.summary}. Tu peux le faire maintenant.` : `Yes, approved: ${a.summary}. You can do it now.`)
        : (fr ? `Non, ne le fais pas : ${a.summary}. Garde-le en brouillon et dis-moi ce que tu proposes à la place.` : `No, don't do it: ${a.summary}. Keep it as a draft and tell me what you suggest instead.`);
    // Asked from a scheduled run, the answer opens a new conversation: the draft goes with it.
    if (a.sessionId || !a.detail) return said;
    return `${said}\n\n${fr ? "Ce que tu avais préparé :" : "What you had prepared:"}\n${a.detail}`;
}

/** How much each bot worked, by month (« 2026-11 »), counted by the core on this machine. */
export const USAGE_PATH = "config/baarasseurs-usage.json";
export interface BotUsage { inputTokens: number; outputTokens: number }
export type UsageByMonth = Record<string, Record<string, BotUsage>>;

export function parseUsage(text: string | null | undefined): UsageByMonth {
    if (!text) return {};
    try {
        const raw = JSON.parse(text) as { months?: unknown };
        return raw.months && typeof raw.months === "object" ? (raw.months as UsageByMonth) : {};
    } catch {
        return {};
    }
}

export const usageMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Adds one model call to its bot's month; keeps the last 12 months. */
export function addUsage(months: UsageByMonth, bot: string, at: Date, input: number, output: number): UsageByMonth {
    const key = usageMonth(at);
    const month = { ...(months[key] ?? {}) };
    const cur = month[bot] ?? { inputTokens: 0, outputTokens: 0 };
    month[bot] = {
        inputTokens: cur.inputTokens + Math.max(0, Math.round(input || 0)),
        outputTokens: cur.outputTokens + Math.max(0, Math.round(output || 0)),
    };
    const next: UsageByMonth = { ...months, [key]: month };
    for (const old of Object.keys(next).sort().slice(0, -12)) delete next[old];
    return next;
}

/** A copy of one, under a free name, without its memory of the user. */
export function duplicateOf(b: Baarasseur, taken: string[], lang: Lang): Baarasseur {
    const name = `${b.name} ${lang === "fr" ? "(copie)" : "(copy)"}`.slice(0, 40);
    // A copy with hours starts paused: two bots must not do the same work before it is changed.
    return { ...b, id: idFor(name, taken), name, memory: [], paused: Boolean(b.schedule), createdAt: new Date().toISOString() };
}

"""Builds Djazzi's skill library from the sources in library-sources.json.

Usage: python3 -I skill-library.py <cache dir> <output dir>

Each source is fetched once at its pinned commit (sparse, blobless, only the
folders it lends), into <cache dir>. The output holds one folder per
category, one folder per skill (its SKILL.md with Djazzi's notes on top, and
its text files), an INDEX.md per category, the library's INDEX.md, SOURCES.md
and every licence. The instance copies it into the workdir (seed.ts) and the
« Skill library » skill tells the agents how to look things up in it.
Do not edit the output by hand: change the sources or this script, run it again.
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCES = json.loads((HERE / "library-sources.json").read_text())["sources"]
CACHE = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]).resolve()

CATEGORIES = {
    "marketing": "Marketing, social media, content, copywriting, SEO, ads, email",
    "sales": "Selling: prospecting, sales process, deals, growth, customer success",
    "business": "Running and starting a business: strategy, offer, pricing, plans, advice for a manager",
    "finance": "Finance: accounting views, budgets, cash, forecasts, financial analysis",
    "operations": "Operations and productivity: processes, projects, planning, customer follow-up",
    "research": "Research: market and user research, competitors, sources, synthesis",
    "product": "Product: discovery, specs, roadmaps, user experience research",
    "compliance": "Quality and compliance: regulations, audits, data protection, standards",
    "design": "Design: interfaces, brand, layout, animation, design review",
    "creative": "Creative production: music, video with ffmpeg, 3D with Blender",
    "code": "Software engineering: architecture, debugging, tests, reviews, web and mobile, games",
}

# Know-how only: the agents read these files, they do not run the skills' scripts.
TEXT = {".md", ".txt", ".csv", ".tsv", ".json", ".yaml", ".yml"}
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "evals", "tests", "test", "dist", "build"}
MAX_FILE = 100_000      # bytes: anything bigger is data, not know-how
MAX_SKILL = 200_000     # bytes per skill, SKILL.md first, then other .md, then the rest
MAX_SUMMARY = 220

DJAZZI = """> **In Djazzi (read first).** This skill comes from the Djazzi skill library: {repo} ({license}), credited in `library/SOURCES.md`.
> - **Context before questions.** Start from what Djazzi already knows: « About the User », your mission and what you remember, and the user's files in `knowledge/` (search them with `file-grep`). Where the text asks for a context file Djazzi does not have (a product-marketing context, a brand file…), use that instead. Ask only what is still missing.
> - **Their language, their market.** Answer in the user's language, with their own country, city, customers, products and prices. Djazzi's users run all kinds of businesses in many countries: ask which channels and tools they actually use instead of assuming.
> - **Never invent figures.** No statistic, price, result, rate or testimonial the user did not give. A typical number quoted below is a habit to test, not a fact about them.
> - **Nothing goes out without a yes.** Draft, then ask before publishing, sending, scheduling, paying, deleting or changing anything outside the chat: a bot asks with `baarasseur-ask-approval`, the assistant asks in the chat.
> - **Written for other tools.** When the text names a command, script, product, plugin or skill Djazzi does not have, do that step with your own tools or skip it and say so. Never install or run anything without the user's agreement. Files it mentions next to its SKILL.md are in this same folder.
"""


def run(*args: str, cwd: Path) -> None:
    subprocess.run(args, cwd=cwd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def fetch(src: dict) -> Path:
    """The source at its pinned commit, with only the folders it lends."""
    repo = CACHE / src["repo"].replace("/", "_")
    marker = repo / ".djazzi-commit"
    if marker.exists() and marker.read_text() == src["commit"]:
        return repo
    shutil.rmtree(repo, ignore_errors=True)
    repo.mkdir(parents=True)
    run("git", "init", "-q", cwd=repo)
    run("git", "remote", "add", "origin", f"https://github.com/{src['repo']}.git", cwd=repo)
    folders = [k for k in src["take"] if k]
    run("git", "sparse-checkout", "set", "--no-cone", "/" + src["licenseFile"], *[f"/{f}/" for f in folders], cwd=repo)
    run("git", "fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", src["commit"], cwd=repo)
    run("git", "-c", "advice.detachedHead=false", "checkout", "-q", "FETCH_HEAD", cwd=repo)
    marker.write_text(src["commit"])
    return repo


def frontmatter(text: str) -> tuple[dict, str, str]:
    """(fields, raw frontmatter block, body). A tiny YAML subset: scalars, quoted, folded."""
    if not text.startswith("---"):
        return {}, "", text
    end = text.find("\n---", 3)
    if end < 0:
        return {}, "", text
    raw = text[: end + 4]
    body = text[end + 4:].lstrip("\n")
    fields: dict = {}
    key = None
    for line in raw.splitlines()[1:-1]:
        m = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if m:
            key, value = m.group(1), m.group(2).strip()
            fields[key] = "" if value in (">", "|", ">-", "|-") else value.strip("'\"")
        elif key and line.startswith((" ", "\t")):
            fields[key] = (fields[key] + " " + line.strip()).strip()
    return fields, raw, body


def summary_of(fields: dict, body: str) -> str:
    text = fields.get("description") or next((l for l in body.splitlines() if l.strip() and not l.startswith("#")), "")
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= MAX_SUMMARY else text[: MAX_SUMMARY - 1].rsplit(" ", 1)[0] + "…"


def skill_dirs(root: Path, src: dict) -> list[tuple[Path, str]]:
    """(skill folder, category) for every SKILL.md this source lends."""
    found = []
    for prefix, category in src["take"].items():
        base = root / prefix if prefix else root
        if not base.is_dir():
            raise SystemExit(f"{src['repo']}: no folder {prefix!r}")
        for skill_md in sorted(base.rglob("SKILL.md")):
            if any(part in SKIP_DIRS for part in skill_md.parent.relative_to(root).parts):
                continue
            found.append((skill_md.parent, category))
    return found


def copy_skill(folder: Path, dest: Path, src: dict) -> int:
    nested = {p.parent for p in folder.rglob("SKILL.md") if p.parent != folder}
    files = []
    for path in folder.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT or path.name.startswith("."):
            continue
        rel = path.relative_to(folder)
        if any(part in SKIP_DIRS or part.startswith(".") for part in rel.parts[:-1]):
            continue
        if any(n in path.parents for n in nested):
            continue  # a skill of its own
        if path.stat().st_size > MAX_FILE:
            continue
        files.append(path)
    order = lambda p: (p.name != "SKILL.md", p.suffix != ".md", str(p))
    total = 0
    for path in sorted(files, key=order):
        size = path.stat().st_size
        if path.name != "SKILL.md" and total + size > MAX_SKILL:
            continue
        target = dest / path.relative_to(folder)
        target.parent.mkdir(parents=True, exist_ok=True)
        if path == folder / "SKILL.md":
            _, raw, body = frontmatter(path.read_text(errors="replace"))
            note = DJAZZI.format(repo=src["repo"], license=src["license"])
            target.write_text((raw + "\n\n" if raw else "") + note + "\n" + body)
        else:
            shutil.copyfile(path, target)
        total += size
    return total


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    shutil.rmtree(OUT, ignore_errors=True)
    (OUT / "licenses").mkdir(parents=True)
    index: dict[str, list[tuple[str, str]]] = {c: [] for c in CATEGORIES}
    taken: set[str] = set()
    seen: set[str] = set()
    credits = []
    for src in SOURCES:
        root = fetch(src)
        lic_name = src["repo"].replace("/", "_") + ".txt"
        shutil.copyfile(root / src["licenseFile"], OUT / "licenses" / lic_name)
        count = 0
        for folder, category in skill_dirs(root, src):
            if folder.name in src.get("exclude", []):
                continue
            skill_id = re.sub(r"[^a-z0-9-]+", "-", folder.name.lower()).strip("-")
            if skill_id in taken:
                continue  # the earlier, more specialised source keeps the name: two versions would confuse the agent
            taken.add(skill_id)
            text = (folder / "SKILL.md").read_text(errors="replace")
            digest = hashlib.sha256(text.encode()).hexdigest()
            if digest in seen:
                continue  # the same skill filed twice
            seen.add(digest)
            fields, _, body = frontmatter(text)
            copy_skill(folder, OUT / category / skill_id, src)
            index[category].append((skill_id, summary_of(fields, body)))
            count += 1
        credits.append(f"- **{src['repo']}** — {src['license']}, commit `{src['commit'][:12]}`, {count} skill{'s' if count != 1 else ''}. "
                       f"Licence: `licenses/{lic_name}`. https://github.com/{src['repo']}")

    lines = ["# Djazzi skill library", "",
             "Expert playbooks a Djazzi agent reads when a task needs them. Each category's `INDEX.md` lists its skills,",
             "one line each: `id` — what it is for. The skill itself is `<category>/<id>/SKILL.md`.", ""]
    for category, entries in index.items():
        if not entries:
            continue
        entries.sort()
        lines.append(f"- `{category}/` ({len(entries)}): {CATEGORIES[category]}")
        cat = [f"# {category}", "", CATEGORIES[category] + ".", "",
               f"Read a skill with `file-readText` on `library/{category}/<id>/SKILL.md`.", ""]
        cat += [f"- `{i}` — {s}" for i, s in entries]
        (OUT / category / "INDEX.md").write_text("\n".join(cat) + "\n")
    (OUT / "INDEX.md").write_text("\n".join(lines) + "\n")
    (OUT / "SOURCES.md").write_text(
        "# Sources\n\nEvery skill in this library is borrowed under a free licence and adapted for Djazzi "
        "(a note on top of each SKILL.md; the text below it is the author's). Thank you to their authors.\n\n"
        + "\n".join(credits) + "\n")
    digest = hashlib.sha256()
    for path in sorted(OUT.rglob("*")):
        if path.is_file():
            digest.update(path.relative_to(OUT).as_posix().encode())
            digest.update(path.read_bytes())
    (OUT / "VERSION").write_text(digest.hexdigest()[:16] + "\n")
    print("ok", sum(len(e) for e in index.values()), "skills", {c: len(e) for c, e in index.items()})


main()

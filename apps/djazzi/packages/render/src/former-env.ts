// BAARALI → DJAZZI (24/11/2026): the servers already running on Fly keep
// their secrets under the former name until they are set again
// (`fly secrets set DJAZZI_…`). Imported first by main.ts, so every module
// and every child process reads the new names only.
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('BAARALI_')) continue;
  const current = `DJAZZI_${name.slice('BAARALI_'.length)}`;
  if (process.env[current] === undefined) process.env[current] = value;
  delete process.env[name];
}
export {};

// Starts the REAL api for the flow tests: a fresh database, migrated, with the owner made by the
// real seed command, and then the API itself. Playwright runs this as a web server and waits for
// /health. Everything it needs arrives as environment variables from playwright.config.ts.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const { FLOW_DATABASE, FLOW_API_PORT, FLOW_OWNER, FLOW_TENANT } = process.env;
const apiDir = path.resolve(process.env.FLOW_API_DIR ?? '../api');

if (!existsSync(path.join(apiDir, 'package.json'))) {
  console.error(
    `The flow tests need the api repo next to web (looked in ${apiDir}).\n` +
      'In a devflow slot: devflow-wt new <slug> api web',
  );
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')} failed`);
    process.exit(result.status ?? 1);
  }
}

run('dropdb', ['--if-exists', FLOW_DATABASE]);
run('createdb', [FLOW_DATABASE]);

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://localhost:5432/${FLOW_DATABASE}`,
  API_PORT: FLOW_API_PORT,
  // The website reads the API from its own server, so no browser origin needs to be allowed.
  CORS_ORIGINS: 'http://127.0.0.1:1',
  // Only for this throwaway database: long enough for the production check, worth nothing anywhere else.
  JWT_SECRET: 'flow-tests-only-secret-not-used-anywhere-else-0123456789',
};

// `db:migrate` builds first, so dist/ is fresh for the seed command and the server below.
run('npm', ['run', 'db:migrate'], { cwd: apiDir, env });

const owner = JSON.parse(FLOW_OWNER);
const tenant = JSON.parse(FLOW_TENANT);
run(
  'node',
  [
    'dist/cli/seed.js',
    '--organization', tenant.organization,
    '--site', tenant.site,
    '--host', tenant.host,
    '--email', owner.email,
    '--name', owner.name,
  ],
  { cwd: apiDir, env: { ...env, SEED_ADMIN_PASSWORD: owner.password } },
);

const server = spawn('node', ['dist/main.js'], { cwd: apiDir, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));

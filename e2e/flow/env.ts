/**
 * Where the tests find their servers. Shared by playwright.config.ts and the specs.
 *
 * The real API runs on its own port and database, so it never touches a dev server or a dev
 * database. A devflow slot sets DEVFLOW_SLOT and the ports; the main checkout uses defaults.
 */
const apiPort = Number(process.env.DEVFLOW_PORT_API ?? 4090);

export const webPort = Number(process.env.DEVFLOW_PORT_WEB ?? 3090);
export const baseURL = `http://127.0.0.1:${webPort}`;

export const flowApiPort = apiPort + 600;
export const flowApiUrl = `http://127.0.0.1:${flowApiPort}`;
export const flowDatabase = process.env.DEVFLOW_SLOT ? `cms_wt${process.env.DEVFLOW_SLOT}_webflow` : 'cms_webflow';

/** Nothing listens here: it is where the site looks for the API when the real one is not started, so "the API is down" is real. */
export const downApiUrl = `http://127.0.0.1:${apiPort + 700}`;

/**
 * A site is visited by its address, and `*.localhost` always reaches this machine, so a test can
 * give each site its own host without any setup: `http://corrick.localhost:3090/about`.
 */
export const siteUrl = (host: string, path = '/') => `http://${host}:${webPort}${path}`;

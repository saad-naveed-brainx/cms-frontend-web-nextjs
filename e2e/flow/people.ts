/**
 * The one person the real-flow tests sign in as. They are created, before any test runs, by the
 * real seed command of the api repo (start-api.mjs), together with an organisation they own, so
 * these values live only in the tests. Each test then makes the sites it needs through the real API.
 */
export const owner = {
  email: 'olivia@orchard.test',
  name: 'Olivia Orchard',
  password: 'orchard-flow-password',
};

export const ownerTenant = {
  organization: 'Orchard Holdings',
  site: 'Orchard Bakery',
  host: 'orchard.test',
};

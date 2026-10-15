// cms-web under pm2 on the live server (the api repo's deploy/README.md, step 4):
// `pm2 start deploy/pm2.config.cjs` in this repo, after `npm run build`.
module.exports = {
  apps: [
    {
      name: 'nodepress-web',
      cwd: `${__dirname}/..`,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      env: { NODE_ENV: 'production' },
    },
  ],
};

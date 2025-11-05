// let date = require('moment')().format('YYYYMMDD')
// let commit = require('child_process').execSync('git rev-parse HEAD').toString().slice(0, 5)
// let version = `"${date}-${commit}"`

// console.log(`current version is ${version}`)

module.exports = {
  NODE_ENV: '"development"',
  // VERSION: version,
  USE_SENTRY: '0',
  VUE_APP_GOOGLE_CLIENT_ID: JSON.stringify(process.env.VUE_APP_GOOGLE_CLIENT_ID || ''),
  VUE_APP_GOOGLE_CLIENT_SECRET: JSON.stringify(process.env.VUE_APP_GOOGLE_CLIENT_SECRET || ''),
  VUE_APP_GOOGLE_REDIRECT_URI: JSON.stringify(process.env.VUE_APP_GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback')
}

const merge = require('webpack-merge')
const devEnv = require('./dev.env')

module.exports = merge(devEnv, {
  NODE_ENV: '"production"',
  VUE_APP_GOOGLE_CLIENT_ID: JSON.stringify(process.env.VUE_APP_GOOGLE_CLIENT_ID || ''),
  VUE_APP_GOOGLE_CLIENT_SECRET: JSON.stringify(process.env.VUE_APP_GOOGLE_CLIENT_SECRET || ''),
  VUE_APP_GOOGLE_REDIRECT_URI: JSON.stringify(process.env.VUE_APP_GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback')
})

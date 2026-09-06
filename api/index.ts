// Express application instance
const app = require('../server/dist/index');

const handler = app.default || app;

module.exports = handler;
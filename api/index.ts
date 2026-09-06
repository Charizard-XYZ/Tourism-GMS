// Express application instance
const app = require('../server/src/index');

// Handle both ES module default export and CommonJS module.exports
const handler = app.default || app;

module.exports = handler;
module.exports.default = handler;

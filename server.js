// SkillLoop Server - Local Development
// server.js (for running locally with: node server.js)

const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const createApp = require('./src/app');
const { initSocket } = require('./src/socket');

const app = createApp();
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`✓ SkillLoop running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✓ Socket.IO ready');
});
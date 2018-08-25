const fs = require('fs'),
    configPath = './config.json';
const parsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
module.exports = parsed;
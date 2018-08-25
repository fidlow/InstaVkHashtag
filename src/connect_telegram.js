const options = require('./options');
const TelegramBot = require('node-telegram-bot-api');
const token = options.telegram.token;
const bot = new TelegramBot(token);

bot.getMe().then(function () {
    console.log('ON Telegram');
});


module.exports = bot;
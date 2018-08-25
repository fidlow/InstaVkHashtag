const bot = require('./connect_telegram');
const postgres = require('./connect_db');

bot.onText(/\/addlocation (.+)/, function (msg, match) {
    postgres.db.one('INSERT INTO location(name, chatid) VALUES($1, $2::text) RETURNING name', [match[1], msg.chat.id])
        .then(function (results) {
            console.log('Add location ' + results['name']);
            bot.sendMessage(msg.chat.id, 'Add location ' + results['name']);
        })
        .catch(function (error) {
            console.log(error);
        });
});
bot.onText(/\/deletealllocation/, function (msg) {
    postgres.db.result("delete FROM location where chatid=$1::text;", msg.chat.id)
        .then(function (results) {
            console.log('Remove ' + results.rowCount + ' locations');
            bot.sendMessage(msg.chat.id, 'Remove ' + results.rowCount + ' locations');
        })
        .catch(function (error) {
            console.log(error);
        });
});
bot.onText(/\/deletelocation (.+)/, function (msg, match) {
    postgres.db.oneOrNone("delete FROM location WHERE name=$1 and chatid=$2::text RETURNING *;", [match[1], msg.chat.id])
        .then(function (results) {
            if(results !== null){
                console.log('Remove location ' + results['name']);
                bot.sendMessage(msg.chat.id, 'Remove location ' + results['name']);
            } else {
                bot.sendMessage(msg.chat.id, 'Location was not found');
            }
        })
        .catch(function (error) {
            console.log(error);
        });
});
bot.onText(/\/getlocations/, function (msg) {
    postgres.db.many('SELECT name FROM location WHERE chatid=$1::text;', msg.chat.id)
        .then(function (results) {
            if(results !== null){
                var res='';
                results.forEach(result => {
                    res = res + result['name'] + '\n';
                });
                bot.sendMessage(msg.chat.id, res);
            } else {
                bot.sendMessage(msg.chat.id, 'No location');
            }
        })
        .catch(function (error) {
            console.log(error);
        });
});
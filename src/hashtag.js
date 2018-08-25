const bot = require('./connect_telegram');
const postgres = require('./connect_db');

bot.onText(/\/addhashtag (.+)/, function (msg, match) {
    postgres.db.one('INSERT INTO Hashtag(hashtagname, chatid) VALUES($1, $2::text) RETURNING hashtagname', [match[1], msg.chat.id])
        .then(function (results) {
            console.log('Add hashtag #' + results['hashtagname']);
            bot.sendMessage(msg.chat.id, 'Add hashtag #' + results['hashtagname']);
        })
        .catch(function (error) {
            console.log(error.name, ":", error.message);
            bot.sendMessage(msg.chat.id, 'Hashtag '+ match[1] +' exist');
        });
});
bot.onText(/\/deleteallhashtag/, function (msg) {
    postgres.db.result("delete FROM Hashtag where chatid=$1::text;", msg.chat.id)
        .then(function (results) {
            console.log('Remove ' + results.rowCount + ' hashtags');
            bot.sendMessage(msg.chat.id, 'Remove ' + results.rowCount + ' hashtags');
        })
        .catch(function (error) {
            console.log(error);
        });
});
bot.onText(/\/deletehashtag (.+)/, function (msg, match) {
    postgres.db.oneOrNone("delete FROM Hashtag WHERE hashtagname=$1 and chatid=$2::text RETURNING *;", [match[1], msg.chat.id])
        .then(function (results) {
            if(results !== null){
                console.log('Remove hashtag #' + results['hashtagname']);
                bot.sendMessage(msg.chat.id, 'Remove hashtag #' + results['hashtagname']);
            } else {
                bot.sendMessage(msg.chat.id, 'Hashtag was not found');
            }
        })
        .catch(function (error) {
            console.log(error);
        });
});
bot.onText(/\/gethashtags/, function (msg) {
    postgres.db.many('SELECT hashtagname FROM Hashtag WHERE chatid=$1::text;', msg.chat.id)
        .then(function (results) {
            if(results !== null){
                var res='';
                results.forEach(result => {
                    res = res + result['hashtagname'] + '\n';
                });
                bot.sendMessage(msg.chat.id, res);
            } else {
                bot.sendMessage(msg.chat.id, 'No hashtags');
            }
        })
        .catch(function (error) {
            console.log(error);
        });
});
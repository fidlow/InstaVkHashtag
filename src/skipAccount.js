const postgres = require('./connect_db');
const bot = require('./connect_telegram');

function isInSkipAccountDB(accountname, socialname) {
    return new Promise(function(resolve, reject) {
        postgres.db.oneOrNone('SELECT Count(*) FROM skipaccount WHERE name=$1::text AND social_network=$2::text;', [accountname, socialname])
            .then(function (results) {
                resolve(results['count']);
            })
            .catch(function (error) {
                reject(error);
            });
    });
}
function writeInSkipAccountDB(accountname, socialname, chatid) {
    postgres.db.one('INSERT INTO skipaccount(name, social_network, chatid) VALUES($1, $2::text, $3::text) RETURNING name,social_network,chatid ', [accountname ,socialname, chatid])
        .then(function (results) {
            console.log('Ban account '+ results['social_network'] + ': ' + results['name']);
            bot.sendMessage(chatid, 'Ban account '+ results['social_network'] + ': ' + results['name']);
        })
        .catch(function (error) {
            console.log(error);
        });
}
function deleteFromSkipAccountDB(name, socialname, chatid) {
    postgres.db.oneOrNone("delete FROM skipaccount WHERE name=$1 and social_network=$2::text and chatid=$3::text RETURNING *;", [name, socialname, chatid])
        .then(function (results) {
            if(results !== null){
                console.log('Unban account ' + results['name']);
                bot.sendMessage(chatid, 'Unban account ' + results['name']);
            } else {
                bot.sendMessage(chatid, 'Account was not found');
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}
bot.onText(/\/getskipa/, function (msg) {
    postgres.db.many('SELECT name, social_network FROM skipaccount WHERE chatid=$1::text;', msg.chat.id)
        .then(function (results) {
            if(results !== null){
                var res='';
                results=results.sort();
                results.forEach(result => {
                    res = res + result['social_network'] + ': ' +  result['name'] +  '\n';
                });
                bot.sendMessage(msg.chat.id, res);
            } else {
                bot.sendMessage(msg.chat.id, 'No account');
            }
        })
        .catch(function (error) {
            console.log(error);
        });
});
var CallbackData;
bot.on('callback_query', (msg) => {
    switch (msg.data){
        case 'av':
            writeInSkipAccountDB(CallbackData[0], 'vk', CallbackData[1]);
            break;
        case 'ai':
            writeInSkipAccountDB(CallbackData[0], 'instagram', CallbackData[1]);
            break;
        case 'dv':
            deleteFromSkipAccountDB(CallbackData[0], 'vk', CallbackData[1]);
            break;
        case 'di':
            deleteFromSkipAccountDB(CallbackData[0], 'instagram', CallbackData[1]);
            break;
    }
    bot.answerCallbackQuery(msg.id);
});
bot.onText(/\/deleteskipa (.+)/, function (msg, match) {
    CallbackData = [match[1], msg.chat.id];
    const opt = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: `vk`, callback_data:'dv'},
                    {text: `instagram`, callback_data:'di'}]
            ]
        })
    };
    bot.sendMessage(msg.chat.id, 'Из какой социальной сети?',opt);
});
bot.onText(/\/addskipa (.+)/, function (msg, match) {
    CallbackData = [match[1], msg.chat.id];
    const opt = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: `vk`, callback_data:'av'},
                    {text: `instagram`, callback_data:'ai'}]
            ]
        })
    };
    bot.sendMessage(msg.chat.id, 'Из какой социальной сети?',opt);
});

bot.onText(/\/addskipasi (.+)/, function (msg, match) {
    let accounts =  match[1].split(" ");
    accounts.forEach((account) => {
        writeInSkipAccountDB(account, 'instagram', msg.chat.id);
    });
});

function skippingAccount(Media, socialname) {
    return new Promise(function(resolve) {
        var k=Media.length;
        var filteredMedia = [];
        Media.forEach(function (post) {
            isInSkipAccountDB(post[3], socialname).then((res) => {
                if (res === '0') {
                    filteredMedia.push(post);
                }
                if(k===1){
                    resolve(filteredMedia);
                }
                k--;
            });
        });
    });
}

module.exports = skippingAccount;
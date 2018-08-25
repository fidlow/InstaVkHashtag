const instagram = require('./connect_instagram');
const postgres = require('./connect_db');
const bot = require('./connect_telegram');
const mediaDB = require('./mediaDB');
const skippingAccount = require('./skipAccount');
const requestHTTP = require('request');

function GetHashtagMedia(hashtags, countmedia, chatid){
        uniqueHashtagMedia(hashtags, countmedia)
        .then((MediaInstagram)=> {
            return skippingAccount(MediaInstagram, 'instagram');
        })
        .then((filteredMediaInstagram)=> {
            return checkFollowers(filteredMediaInstagram);
        })
        .then((MediaInstagramWithFollowers)=> {
            sendMediaFromInstagram(chatid, MediaInstagramWithFollowers);
        });
}

function uniqueHashtagMedia(dbresults) {
    return new Promise(function(resolve, reject) {
        let getMediaFromInstagram = dbresults.reduce((previousPromise, dbresult) => {
            return previousPromise
                .then(mediaArray => {
                    return instagram.TagMedia(dbresult['hashtagname'])
                        .then(mediaByHashtag => {
                            Array.prototype.push.apply(mediaArray,mediaByHashtag);
                            return mediaArray;
                        });
            });
        }, Promise.resolve([]));
        getMediaFromInstagram.then(allPosts => {            
            return allPosts.filter((value, index, self) => self.findIndex(t => t.params.code === value.params.code) === index);
        }).then(uniquePosts => {
            let Media = [];
            uniquePosts.forEach((item,i) => {
                let ID = item.params.code;
                Media[i] = [];
                //Get ID for write to DB
                Media[i][0] = ID;
                //Create text
                if (item.params.mediaType === 2) {
                    Media[i][1] = 'Video\n';
                } else if (item.params.mediaType === 8) {
                    Media[i][1] = 'Carousel\n';
                }
                else {
                    Media[i][1] = '';
                }
                if(item.params.account.fullName!==undefined) {
                    Media[i][1] += item.params.account.fullName + ' 🤴 ' + item.params.account.username  + '\n';
                }
                else Media[i][1] += '🤴 ' + item.params.account.username  + '\n';
                Media[i][1] += item.params.caption + '\nhttps://www.instagram.com/p/' + item.params.code;
                Media[i][1]= Media[i][1].replace(/[<>]/gi,"!");
                if(Media[i][1].length <= 2) Media[i][1] = "short text";
                //Get media links 
                Media[i][2] = [];
                if (item.params.mediaType !== 8)
                {
                    Media[i][2].push(item.params.images[0].url);
                } else {
                    item.params.images.forEach(function (image) {
                        Media[i][2].push(image[0].url);
                    });
                }
                //Get account name for ban filter
                Media[i][3] = item.params.account.username;
            });
            resolve(Media);
        }).catch(error => {
            console.error('Error instagram 5:', error.name, ":", error.message);
        });
    });
}

function checkFollowers(filteredMediaInstagram) {
    return new Promise(function(resolve, reject) {
        //plug
        resolve(filteredMediaInstagram);
    });
}
function sendMediaFromInstagram(chatId, Media) {
    Media.forEach((post,i) => {
        mediaDB.isInMediaDB(post[0], 'instagram').then(res => {
            if (res === '0') {
                setTimeout(()=> {
                    let text = post[1];
                    if(text==='undefined') text = ' ';

                    function sendMessageAfterSendPhoto() {
                        bot.sendMessage(chatId, text, {parse_mode: 'HTML', disable_web_page_preview: true})
                            .then(()=> {
                                console.log('Загружен в telegram пост instagram ', post[0]);
                            }).catch(()=>{
                            mediaDB.deleteInDB(post[0], 'instagram');
                        });
                    }
                    if(post[2].length>1){
                        let InputMediaPhoto = post[2].map(photoURL => {
                            let photo = requestHTTP(photoURL);
                            return { media: photo, type: 'photo'};
                        });
                        bot.sendMediaGroup(chatId, InputMediaPhoto).then(()=>{
                            sendMessageAfterSendPhoto();
                        }).catch((err)=> {
                            mediaDB.deleteInDB(post[0], 'instagram');
                            bot.sendMessage(chatId, "mediaInstagram \n" + err.message + "\n" + text, {parse_mode: 'HTML', disable_web_page_preview: true});
                            console.error('Error telegram 4:', err.name, ":", err.message);
                        });
                    } else {
                        let photo = requestHTTP(post[2][0]);
                        bot.sendPhoto(chatId, photo).then(()=>{
                            sendMessageAfterSendPhoto();
                        }).catch((err)=> {
                            bot.sendMessage(chatId, err.message, {parse_mode: 'HTML', disable_web_page_preview: true});
                            console.error('Error telegram 5:', err.name, ":", err.message);
                            mediaDB.deleteInDB(post[0], 'instagram');
                        });
                    }
                }, i * 20);
                mediaDB.writeInDB(post[0], 'instagram');
            }
        }).catch((error) => {
            console.error('Error instagram 6:', error.name, ":", error.message);
        });
    });
}

bot.onText(/\/deleteinstagrammedia/, function (msg) {
    postgres.db.result("delete FROM InstagramMedia;")
        .then(function (results) {
            console.log('Удалено ' + results.rowCount + ' медиа из Инстаграма');
            bot.sendMessage(msg.chat.id, 'Удалено ' + results.rowCount + ' медиа из БД Инстаграма');
        })
        .catch(function (error) {
            console.log(error);
        });
});


function GetLocationMedia(locations, countmedia, chatid){
    uniqueLocationMedia(locations, countmedia)
    .then((MediaInstagram)=> {
        return skippingAccount(MediaInstagram, 'instagram');
    })
    .then((filteredMediaInstagram)=> {
        sendMediaFromInstagram(chatid, filteredMediaInstagram);
    });
}

function uniqueLocationMedia(dbresults) {
    return new Promise(function(resolve, reject) {
        let getMediaFromInstagram = dbresults.reduce((previousPromise, dbresult) => {
            return previousPromise
                .then(mediaArray => {
                    return instagram.LocationMedia(dbresult['name'])
                        .then(mediaByHashtag => {
                            Array.prototype.push.apply(mediaArray,mediaByHashtag);
                            return mediaArray;
                        });
                });
        }, Promise.resolve([]));
        getMediaFromInstagram.then(allPosts => {
            return allPosts.filter((value, index, self) => self.findIndex(t => t.params.code === value.params.code) === index);
        }).then(uniquePosts => {
            let Media = [];
            uniquePosts.forEach((item,i) => {
                let ID = item.params.code;
                Media[i] = [];
                //Get ID for write to DB
                Media[i][0] = ID;
                //Create text
                if (item.params.mediaType === 2) {
                    Media[i][1] = 'Видео\n';
                } else if (item.params.mediaType === 8) {
                    Media[i][1] = 'Карусель\n';
                }
                else {
                    Media[i][1] = '';
                }
                if(item.params.account.fullName!==undefined) {
                    Media[i][1] += item.params.account.fullName + ' 🤴 ' + item.params.account.username  + '\n';
                }
                else Media[i][1] += '🤴 ' + item.params.account.username  + '\n';
                Media[i][1] += item.params.caption + '\nhttps://www.instagram.com/p/' + item.params.code;
                Media[i][1]= Media[i][1].replace(/[<>]/gi,"!");
                if(Media[i][1].length <= 2) Media[i][1] === "сработала проверка на короткий текст";
                //Get media links 
                Media[i][2] = [];
                if (item.params.mediaType !== 8)
                {
                    Media[i][2].push(item.params.images[0].url);
                } else {
                    item.params.images.forEach(function (image) {
                        Media[i][2].push(image[0].url);
                    });
                }
                //Get account name for ban filter
                Media[i][3] = item.params.account.username;
            });
            resolve(Media);
        }).catch(error => {
            console.error('Error instagram 5:', error.name, ":", error.message);
        });
    });
}

module.exports.GetHashtagMedia = GetHashtagMedia;
module.exports.GetLocationMedia = GetLocationMedia;
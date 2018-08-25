const vk = require('./connect_vk');
const postgres = require('./connect_db');
const bot = require('./connect_telegram');
const mediaDB = require('./mediaDB');
const requestHTTP = require('request');
const skippingAccount = require('./skipAccount');

function GetVKMedia(results, countmedia, chatid){
    uniqueMediafromVK(results, countmedia)
        .then((MediaVK)=> {
            return skippingAccount(MediaVK, 'vk');
        })
        .then((MediaVkWithoutBanned)=> {
            return MediaVkWithoutBanned.filter(filterVkinInstagramDB);
        })
        .then((MediaVKfiltredByInstagramDB)=> {
            return filterVkByVkDB(MediaVKfiltredByInstagramDB);
        })
        .then((filteredMediaVK)=>{
            sendMediaFromVK(chatid, filteredMediaVK);
        });
}

function uniqueMediafromVK(dbresults, countmedia) {
    return new Promise(function(resolve){
        let getMediaFromVK = dbresults.reduce((previousPromise, dbresult) => {
            return previousPromise
                .then(mediaArray => {
                    return vk.api.newsfeed.search({ q: '#' + dbresult['hashtagname'], extended: 1, count: countmedia })
                            .then((mediaByHashtag) => {
                                if(mediaArray[0] === undefined) {
                                    mediaArray[0] = [];
                                    mediaArray[1] = [];
                                    mediaArray[2] = [];
                                }
                                Array.prototype.push.apply(mediaArray[0],mediaByHashtag.items);
                                Array.prototype.push.apply(mediaArray[1],mediaByHashtag.profiles);
                                Array.prototype.push.apply(mediaArray[2],mediaByHashtag.groups);
                                return mediaArray;
                            });
                });
        }, Promise.resolve([]));
        getMediaFromVK.then(allPosts => {
            allPosts[0] = allPosts[0].filter((value, index, self) => self.findIndex(t => t.from_id === value.from_id && t.id === value.id) === index);
            return allPosts;
        }).then(uniquePosts => {
            let Media = [];
            uniquePosts[0].forEach((item,i) => {
                let ID = item.from_id + '_' + item.id;
                Media[i] = [];
                //Get ID for write to DB
                Media[i][0] = ID;
                //Create text
                if (item.from_id > 0) {
                    let profilesFound = uniquePosts[1].filter(function (profile) {
                        return profile.id === item.from_id;
                    });
                    Media[i][1] = profilesFound[0].first_name + ' ' + profilesFound[0].last_name;
                } else {
                    let groupsFound = uniquePosts[2].filter(function (group) {
                        return group.id === -item.from_id;
                    });
                    Media[i][1] = groupsFound[0].name;
                }
                Media[i][1] += item.text + '\n' +
                    'vk.com/wall' + ID + '\n';
                Media[i][1]= Media[i][1].replace(/[<>]/gi,"");
                //Get full item
                Media[i][2] = item;
                //Get account name for ban filter
                Media[i][3] = item.from_id + '';
            });
            resolve(Media);
        }).catch(error => {
            console.error('Error vk 5:', error.name, ":", error.message);
        });
    });
}
function filterVkinInstagramDB (post) {
    if(post[2].post_source.type === "api" && post[2].post_source.platform === "instagram"){
        let instagramurl = post[2].post_source.url.slice(28, 39);
        postgres.db.oneOrNone('SELECT instagramid FROM instagrammedia WHERE instagramid=$1::text;', instagramurl)
            .then(function (results) {
                return results === null;
            })
            .catch(function (error) {
                Error('Error filterVkinInstagramDB');
            });
    } else {
        return true;
    }
}

function filterVkinSkipAccountDB (post) {
    mediaDB.is(post[0], 'vk').then(res => {
        if (res === '0') {
            filteredMediaVK.push(post);
            if(k===1){
                resolve(filteredMediaVK);
            }
            k--;
        } else {
            if(k===1){
                resolve(filteredMediaVK);
            }
            k--;
        }
    }).
    catch((error) => {
        console.error('Error vk 6:', error.name, ":", error.message);
    });
}

function filterVkByVkDB (MediaVK) {
    return new Promise(function(resolve, reject) {
        var k=MediaVK.length;
        var filteredMediaVK = [];
        MediaVK.forEach(function (post) {
            mediaDB.isInMediaDB(post[0], 'vk').then(res => {
                if (res === '0') {
                    filteredMediaVK.push(post);
                    if(k===1){
                        resolve(filteredMediaVK);
                    }
                    k--;
                } else {
                    if(k===1){
                        resolve(filteredMediaVK);
                    }
                    k--;
                }
            }).
            catch((error) => {
                console.error('Error vk 6:', error.name, ":", error.message);
            });
        });
    });
}
function sendMediaFromVK(chatId, MediaVK){
    MediaVK.forEach(function (post, i) {
        setTimeout(()=> {
            let text = post[1];
            let k=1;
            let photo = '', type='';
            if(post[2].attachments!==undefined){
                for (let attachment of post[2].attachments) {
                    if (attachment.type === 'photo') {
                        photo = requestHTTP(attachment.photo.photo_604);
                        type = ''; // type = 'Photo';
                    } else if (attachment.type === 'video') {
                        if(attachment.video.photo_640!==undefined)
                        {
                            photo = attachment.video.photo_640;
                        } else if (attachment.video.photo_800!==undefined) {
                            photo =  attachment.video.photo_800;
                        } else {
                            photo =  attachment.video.photo_320;
                        }
                        photo = requestHTTP(photo, function (error, response) {
                            if(error){
                                console.log(text);
                                console.log('error:', error); // Print the error if one occurred
                                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                            }
                        });
                        type = 'Video';
                    } else {
                        if (k === post[2].attachments.length) {
                            setTimeout(()=> {
                                bot.sendMessage(chatId, text, {parse_mode: 'HTML', disable_web_page_preview: true});
                            }, 1000);
                        }
                        k++;
                        continue;
                    }
                    if (k < post[2].attachments.length) {
                        bot.sendPhoto(chatId, photo, {caption: type});
                    } else if (k === post[2].attachments.length) {
                        bot.sendPhoto(chatId, photo, {caption: type}).then(()=>{
                            bot.sendMessage(chatId, text, {parse_mode: 'HTML', disable_web_page_preview: true});
                        });
                    }
                    k++;
                }
            }
            else {
                bot.sendMessage(chatId, text, {parse_mode: 'HTML', disable_web_page_preview: true});
            }
        }, i * 10);
        mediaDB.writeInDB(post[0], 'vk');
    });

}

bot.onText(/\/deletevkmedia/, function (msg) {
    postgres.db.result("delete FROM VKMedia;")
        .then(function (results) {
            console.log('Remove ' + results.rowCount + ' VK media');
            bot.sendMessage(msg.chat.id, 'Remove ' + results.rowCount + ' VK media');
        })
        .catch(function (error) {
            console.log(error);
        });
});

module.exports = GetVKMedia;
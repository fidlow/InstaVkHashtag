const options = require('./options');
const vkio = new require('vk-io');
const vk = new vkio.VK();
vk.setOptions(options.vk);

function TagMedia (hashtag,countmedia){
    return new Promise(function(resolve, reject) {
        vk.api.newsfeed.search({ q: '#' + hashtag, extended: 1, count: countmedia })
            .then((array) => {
                resolve(array);
            }).catch((err)=>{
                reject(err);
        });
    });
}

const auth = vk.auth.implicitFlowUser();
auth.run()
    .then((account) => {
        vk.setOptions({
            token: account.token
        });
    })
    .catch((error) => {
        console.error(error);
    });
vk.api.newsfeed.search({ q: '#love', extended: 1, count: 5 }).then((array) => {
    console.log('ON ВКонтакте.');
}).catch(()=>{
    console.log('OFF ВКонтакте.');
});


module.exports = vk;
module.exports.TagMedia = TagMedia;
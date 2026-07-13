const ytSearch = require('yt-search');
async function test() {
    const r = await ytSearch('test');
    console.log(Object.keys(r.videos[0]));
    console.log('thumbnail:', r.videos[0].thumbnail);
    console.log('image:', r.videos[0].image);
}
test();

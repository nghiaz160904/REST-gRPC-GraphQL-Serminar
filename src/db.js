const mongoose = require('mongoose');
const Article = require('./models/article');
const Comment = require('./models/comment');
const Client = require('./models/client');

async function createArticle(id) {
    let article = new Article({
        _id: id,                // ensure numeric id
        title: `Title ${id}`,
        description: `Description ${id}`
    });
    await article.save();
    for (let i = 0; i < 5; i++) {
        const comment = new Comment({
            author: `Author ${i}`,
            text: `Comment text ${i}`,
            article: article._id
        });
        await comment.save();
    }
}

// Giả sử hiện tại createArticles nhận vào 'count' và đang insert theo batch.
// Thêm tham số onProgress và gọi sau mỗi lần insertMany.
async function createArticles(count, onProgress) {
    const progress = (typeof onProgress === 'function') ? onProgress : () => {};
    const BATCH_SIZE = 1000; // mỗi lần báo tiến độ 1000
    let inserted = 0;

    while (inserted < count) {
        const size = Math.min(BATCH_SIZE, count - inserted);
        const startIndex = inserted + 1;

        // Numeric IDs: startIndex .. startIndex+size-1
        const ids = Array.from({ length: size }, (_, idx) => startIndex + idx);

        // Tạo docs Article đúng schema
        const articleDocs = ids.map(id => ({
            _id: id,
            title: `Title ${id}`,
            description: `Description ${id}`
        }));

        // Insert batch Articles (use Mongoose to get timestamps)
        await Article.insertMany(articleDocs, { ordered: false });

        // Tạo 5 comment cho mỗi article trong batch
        const commentDocs = [];
        for (let i = 0; i < ids.length; i++) {
            const articleId = ids[i];
            for (let j = 0; j < 5; j++) {
                commentDocs.push({
                    author: `Author ${j}`,
                    text: `Comment text ${j}`,
                    article: articleId
                });
            }
        }
        if (commentDocs.length > 0) {
            await Comment.collection.insertMany(commentDocs, { ordered: false });
        }

        inserted += size;
        progress(inserted); // báo tiến độ: 1000, 2000, ...
    }
}

async function createClient(dni, iban) {
    let client = new Client({dni, iban});
    await client.save();
}

async function createClients() {
    await Client.deleteMany();
    await createClient("06580190M", "ES4404877434913522416372");
    await createClient("25705158J", "ES3121006658118742431683");
    await createClient("31156553V", "ES8614654119472154778266");
}

module.exports = async function(numArticles, onProgress) {
    await createArticles(numArticles, onProgress);
    await createClients();
}

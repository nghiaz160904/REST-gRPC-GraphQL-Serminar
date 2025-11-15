const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: String,
  text: String,
  article: { type: Number, ref: 'Article', required: true } // was ObjectId
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);

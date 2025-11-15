const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  _id: { type: Number, required: true }, // numeric id 1,2,...
  title: String,
  description: String
}, { timestamps: true }); // adds createdAt, updatedAt

module.exports = mongoose.model('Article', ArticleSchema);

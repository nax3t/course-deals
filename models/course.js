const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const courseSchema = new Schema({
  title:  String,
  affiliateUrl: String,
  thumbnailUrl: String,
  listPrice: String,
  percentOff: String,
  ogPrice: String,
  rating: String,
  category: String,
  review: String,
  reviewAuthor: String,
  categories: String
});

module.exports = mongoose.model('Course', courseSchema);
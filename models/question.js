const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Schema = mongoose.Schema;

var schema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  title: {type: String, trim: true, required: true},
  content: {type: String, trim: true, required: true},
  location: {type: String, trim: true, required: true},

  start_at: {type: Date, default: Date.now},
  end_at: {type: Date, default: Date.now},

  group_name: {type: String, trim: true, required: true},
  group_explain: {type: String, trim: true, required: true},

  eventType: {type: String},
  eventTopic: {type: String},
  event_price: {type: String},
  price: {type: String, default:0},

  tags: [String],
  numLikes: {type: Number, default: 0},
  numAnswers: {type: Number, default: 0},
  numReads: {type: Number, default: 0},
  img: {type: String},  // 이미지의 path를 저장하기 위해 추가
  createdAt: {type: Date, default: Date.now}
}, {
  toJSON: { virtuals: true},
  toObject: {virtuals: true}
});
schema.plugin(mongoosePaginate);
var Question = mongoose.model('Question', schema);

module.exports = Question;

const express = require('express');
const Question = require('../models/question');
const User = require('../models/user');
const Answer = require('../models/answer');
const catchErrors = require('../lib/async-error');

// 새로 추가된 패키지
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');

module.exports = io => {
  const router = express.Router();

  function validateForm(form, options) {
    var title = form.title || ""; //title
    var location = form.location || ""; //location
    var start_at = form.start_at || ""; //start_at
    var end_at = form.end_at || ""; //end_at
    var content = form.content || ""; //content
    var group_name = form.group_name || "";
    var group_explain = form.group_explain || "";
    var eventType = form.eventType || "";
    var eventTopic = form.eventTopic || "";
    var event_price = form.event_price || "";
    var price = form.price || "";

    if (!title) { return '이벤트명을 입력해주세요!'; }
    if (!location) { return '이벤트의 장소를 입력해주세요!'; }
    if (!start_at) { return '시작 시간을 입력해주세요!'; }
    if (!end_at) { return '도착 시간을 입력해주세요!'; }
    if (!content) { return '이벤트의 상세 내용을 입력해주세요!'; }
    if (!group_name) { return '등록 조직 이름을 입력해주세요!'; }
    if (!group_explain) { return '등록 조직 설명을 입력해주세요!'; }

    return null;
  }

  // 동일한 코드가 users.js에도 있습니다. 이것은 나중에 수정합시다.
  function needAuth(req, res, next) {
    if (req.isAuthenticated()) {
      next();
    } else {
      req.flash('danger', 'Please signin first.');
      res.redirect('/signin');
    }
  }

  /* GET questions listing. */
  router.get('/', catchErrors(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    var query = {};
    const term = req.query.term;
    if (term) {
      query = {$or: [
        {title: {'$regex': term, '$options': 'i'}},
        {content: {'$regex': term, '$options': 'i'}},
        {location: {'$regex': term, '$options': 'i'}},
        {group_name: {'$regex': term, '$options': 'i'}},
        {group_explain: {'$regex': term, '$options': 'i'}}
      ]};
    }
    const questions = await Question.paginate(query, {
      sort: {createdAt: -1},
      populate: 'author',
      page: page, limit: limit
    });
    res.render('questions/index', {questions: questions, term: term, query: req.query});
  }));

  router.get('/new', needAuth, (req, res, next) => {
    res.render('questions/new', {question: {}});
  });

  router.get('/:id/edit', needAuth, catchErrors(async (req, res, next) => {
    const question = await Question.findById(req.params.id);
    res.render('questions/edit', {question: question});
  }));

  router.get('/:id', catchErrors(async (req, res, next) => {
    const question = await Question.findById(req.params.id).populate('author');
    const answers = await Answer.find({question: question.id}).populate('author');
    question.numReads++;    // TODO: 동일한 사람이 본 경우에 Read가 증가하지 않도록???

    await question.save();
    res.render('questions/show', {question: question, answers: answers});
  }));

  router.put('/:id', catchErrors(async (req, res, next) => {
    const question = await Question.findById(req.params.id);

    if (!question) {
      req.flash('danger', 'Not exist question');
      return res.redirect('back');
    }
    question.title = req.body.title;
    question.location = req.body.location;
    question.start_at = req.body.start_at;
    question.end_at = req.body.end_at;
    question.content = req.body.content;
    question.group_name = req.body.group_name;
    question.group_explain = req.body.group_explain;
    question.eventType = req.body.eventType;
    question.eventTopic = req.body.eventTopic;
    question.event_price = req.body.event_price;
    question.price = req.body.price;

    await question.save();
    req.flash('success', 'Successfully updated');
    res.redirect('/questions');
  }));

  router.delete('/:id', needAuth, catchErrors(async (req, res, next) => {
    await Question.findOneAndRemove({_id: req.params.id});
    req.flash('success', 'Successfully deleted');
    res.redirect('/questions');
  }));


  const mimetypes = {
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/png": "png"
  };
  const upload = multer({
    dest: 'tmp',
    fileFilter: (req, file, cb) => {
      var ext = mimetypes[file.mimetype];
      if (!ext) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  }); // tmp라는 폴더를 미리 만들고 해야 함.

  router.post('/', needAuth,
        upload.single('img'), // img라는 필드를 req.file로 저장함.
        catchErrors(async (req, res, next) => {
    const user = req.user;
    const err = validateForm(req.body);
    if (err) {
      req.flash('danger', err);
      return res.redirect('back');
    }
    var question = new Question({
      title: req.body.title,
      author: user._id,
      content: req.body.content,
      location: req.body.location,
      start_at: req.body.start_at,
      end_at: req.body.end_at,
      group_name: req.body.group_name,
      group_explain: req.body.group_explain,
      eventType: req.body.eventType,
      eventTopic: req.body.eventTopic,
      event_price: req.body.event_price,
      price: req.body.price
    });
/*    if (req.file) {
      const dest = path.join(__dirname, '../public/images/uploads/');  // 옮길 디렉토리
      console.log("File ->", req.file); // multer의 output이 어떤 형태인지 보자.
      const filename = req.file.filename + "." + mimetypes[req.file.mimetype];
      await fs.move(req.file.path, dest + filename);
      question.img = "/images/uploads/" + filename;
    }*/
    await question.save();
    req.flash('success', 'Successfully posted');
    res.redirect('/questions');
  }));

  router.post('/:id/answers', needAuth, catchErrors(async (req, res, next) => {
    const user = req.user;
    const question = await Question.findById(req.params.id);

    if (!question) {
      req.flash('danger', 'Not exist question');
      return res.redirect('back');
    }

    var answer = new Answer({
      author: user._id,
      question: question._id,
      content: req.body.content
    });
    await answer.save();
    question.numAnswers++;
    await question.save();

    const url = `/questions/${question._id}#${answer._id}`;
    io.to(question.author.toString())
      .emit('answered', {url: url, question: question});
    console.log('SOCKET EMIT', question.author.toString(), 'answered', {url: url, question: question})
    req.flash('success', 'Successfully answered');
    res.redirect(`/questions/${req.params.id}`);
  }));

  return router;
};

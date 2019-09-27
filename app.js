const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');

const indexRouter = require('./routes/index');

const app = express();

// configure sessions/session store
const MongoDBStore = require('connect-mongo')(session);
const store = new MongoDBStore({
  mongooseConnection: mongoose.connection,
  touchAfter: 24 * 3600,
  secret: process.env.COOKIE_SECRET
});
// Catch errors
store.on('error', function(error) {
  console.log('STORE ERROR!!!', error);
});
app.use(session({
  secret: process.env.COOKIE_SECRET,
  cookie: { httpOnly: true, expires: Date.now() + 1000 * 60 * 60, maxAge: 1000 * 60 * 60},
  store,
  resave: true,
  saveUninitialized: false
}));

// Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());
const dbUri = process.env.DBURI || 'mongodb://localhost:27017/course-deals';
// define user schema and model and configure passport
mongoose.connect(dbUri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true,
	useFindAndModify: false
}).then(success => {
	console.log('Connected to DB!');
}).catch(err => {
	console.log(err.message);
});
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const UserSchema = new Schema({admin:Boolean});
UserSchema.plugin(passportLocalMongoose);
const User = mongoose.model('User', UserSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

async function createOneUser() {
	let admin = await User.findOne({'username': 'admin'});
	if (!admin) {
		try {
			const user = new User({username: 'admin', admin: true});
			await user.setPassword(process.env.ADMINPW);
			await user.save();
			console.log('Admin user created!');
		} catch(err) {
			console.log(err.message);
		};
	} else {
		console.log('Admin user already exists!');
	}
}
createOneUser();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// flash messages
app.use(function(req, res, next) {
	res.locals.error = req.session.error || '';
	res.locals.success = req.session.success || '';
	req.session.error ? delete req.session.error : null;
	req.session.success ? delete req.session.success : null;
	next();
});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

if(process.env.NODE_ENV === 'development') {
	require('dotenv').config();
}

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const methodOverride = require('method-override');
const categories = require('./categories');
const indexRouter = require('./routes/index');
const updateCourses = require('./updateCourses');

const app = express();

app.locals.categories = categories;
// connect to mongodb
const dbUri = process.env.DBURI || 'mongodb://localhost:27017/course-deals';
mongoose.connect(dbUri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useCreateIndex: true,
	useFindAndModify: false
}).then(success => {
	console.log('Connected to database!');
	// updateCourses();
}).catch(err => {
	console.log('DATABASE CONNECTION ERROR!', err.message);
});
// configure sessions/session store
const MongoStore = require('connect-mongo')(session);
const options = {
	mongooseConnection: mongoose.connection,
	secret: process.env.COOKIE_SECRET || 'foo'
};
app.use(session({
  secret: process.env.COOKIE_SECRET || 'foo',
  store: new MongoStore(options),
  saveUninitialized: false, // don't create session until something stored
  resave: false, //don't save session if unmodified
}));

// Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());
// define user schema and model and configure passport
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const UserSchema = new Schema({admin:Boolean});
UserSchema.plugin(passportLocalMongoose);
const User = mongoose.model('User', UserSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// force https
function requireHTTPS(req, res, next) {
  // The 'x-forwarded-proto' check is for Heroku
  if(process.env.NODE_ENV !== 'development') {
  	let www = !req.subdomains.includes('www') ? 'www' : '';
	  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
	    return res.redirect(`https://${www}${req.get('host')}${req.url}`);
	  }
  }
  next();
}

app.use(requireHTTPS);

// async function createOneUser() {
// 	let admin = await User.findOne({'username': 'admin'});
// 	if (!admin) {
// 		try {
// 			const user = new User({username: 'admin', admin: true});
// 			await user.setPassword(process.env.ADMINPW);
// 			await user.save();
// 			console.log('Admin user created!');
// 		} catch(err) {
// 			console.log(err.message);
// 		};
// 	} else {
// 		await admin.setPassword(process.env.ADMINPW);
// 		await admin.save();
// 		console.log('Admin user already exists!');
// 	}
// }
// createOneUser();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// flash messages
app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	res.locals.error = req.session.error || '';
	res.locals.success = req.session.success || '';
	req.session.error ? delete req.session.error : null;
	req.session.success ? delete req.session.success : null;
	next();
});

app.use(methodOverride('_method'));

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

// // NOTES: Need to add courseId to all existing courses!
// // update course ratings
// const Course = require('./models/course');
// const rp =  require('request-promise');

// (async function() {
// 	try {
// 		let courses = await Course.find();
// 		for(const course of courses) {
// 			if(course.courseId) {
// 				rp.get(`https://www.udemy.com/api-2.0/courses/${course.courseId}?fields[course]=avg_rating`)
// 					.then(res => {
// 						let course = JSON.parse(res);
// 						console.log(course.avg_rating);
// 					})
// 					.catch(err => {
// 						console.log(err)
// 					});
// 			}
// 		}
// 	} catch(err) {
// 		console.log(err);
// 	}
// })();
// //

module.exports = app;

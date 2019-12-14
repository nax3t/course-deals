const express = require('express');
const router = express.Router();
const passport = require('passport');
// const getCourseInfo = require('../getCourseInfo');
const Course = require('../models/course');
// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const pluginStealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(pluginStealth());

router.get('/', async function(req, res, next) {
	try {
		const courses = await Course.find();
	  res.render('index', { title: 'Top Rated Technology Courses on Udemy', courses });
	} catch(err) {
		res.status(500).send('Oops, something broke!');
	}
});

router.get('/courses', function(req, res, next) {
  res.redirect('/');
});

router.get('/courses/new', isAdminLoggedIn, function(req, res, next) {
// router.get('/courses/new', function(req, res, next) {
  res.render('new', { title: 'New Course' });
});

router.post('/courses', isAdminLoggedIn, async function(req, res, next) {
// router.post('/courses', async function(req, res, next) {
	let courseInfo;
	let { affiliateUrl } = req.body;
	try {
			// puppeteer usage as normal
			const browser = await puppeteer.launch({ 
				headless: true,
				'args' : [
		    '--no-sandbox',
		    '--disable-setuid-sandbox'
		  ]});
		  const page = await browser.newPage()
		  await page.setViewport({ width: 800, height: 600 })
		  await page.goto(affiliateUrl)
		  await page.waitForSelector('.course-price-text > span + span > span');
		  const title = await page.$eval('h1[data-purpose=lead-title]', e => e.innerText);
		  // await page.screenshot({ path: title, fullPage: true })
		  const thumbnailUrl = await page.$eval('div[data-purpose=introduction-asset] img', e => e.src);
		  const listPrice = await page.$eval('.course-price-text > span + span > span', e => e.innerText);
		  const ogPrice = await page.$eval('div[data-purpose=course-old-price-text] > span + span > s > span', e => e.innerText);
		  const percentOff = await page.$eval('div[data-purpose=discount-percentage] > span + span', e => e.innerText);
		  const rating = await page.$eval('div[data-purpose=ratings] div.rate-count > span > span', e => e.innerText);
		  await browser.close()
		  courseInfo = {title, listPrice, percentOff, ogPrice, thumbnailUrl, rating};
			courseInfo.affiliateUrl = req.body.affiliateUrl;
		  await Course.create(courseInfo);
		  req.session.success = 'Course created successfully!';
		  res.redirect('/');
	} catch(err) {
	  req.session.error = err.message;
	  res.redirect('/courses/new');
	}
});

router.get('/courses/:id/edit', isAdminLoggedIn, function(req, res, next) {
	Course.findById(req.params.id)
		.then(course => {
		  res.render('edit', { title: 'Edit Course', course });
		})
		.catch(err => {
			throw new Error(err);
		});
});

router.put('/courses/:id', isAdminLoggedIn, function(req, res, next) {
	let { categories } = req.body;
	if (Array.isArray(categories)) { 
		categories = categories.join(' ');
		req.body.categories = categories;
	}
	Course.findByIdAndUpdate(req.params.id, req.body, {new:true})
		.then(course => {
			console.log('Course:', course);
		  res.redirect('/');
		})
		.catch(err => {
			throw new Error(err);
		});
});


router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Admin Login' });
});


router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

// router.get('/courses/update', isAdminLoggedIn, async function(req, res, next) {
// 	const courses = await Course.find();
//   try {
// 		for (const course of courses) {	
// 			// puppeteer usage as normal
// 			const browser = await puppeteer.launch({ 
// 				headless: true,
// 				'args' : [
// 		    '--no-sandbox',
// 		    '--disable-setuid-sandbox'
// 		  ]});
// 		  const page = await browser.newPage()
// 		  await page.setViewport({ width: 800, height: 600 })
// 		  await page.goto(course.affiliateUrl)
// 		  await page.waitForSelector('.course-price-text > span + span > span');
// 		  const title = await page.$eval('h1[data-purpose=lead-title]', e => e.innerText);
// 		  // await page.screenshot({ path: title, fullPage: true })
// 		  const thumbnailUrl = await page.$eval('div[data-purpose=introduction-asset] img', e => e.src);
// 		  const listPrice = await page.$eval('.course-price-text > span + span > span', e => e.innerText);
// 		  const ogPrice = await page.$eval('div[data-purpose=course-old-price-text] > span + span > s > span', e => e.innerText);
// 		  const percentOff = await page.$eval('div[data-purpose=discount-percentage] > span + span', e => e.innerText);
// 		  const rating = await page.$eval('div[data-purpose=ratings] div.rate-count > span > span', e => e.innerText);
// 		  await browser.close()
// 		  courseInfo = {title, listPrice, percentOff, ogPrice, thumbnailUrl, rating};
// 		  await Course.findByIdAndUpdate(course._id, courseInfo);
// 		}
//   } catch(err) {
//     req.session.error = err.message;
//     res.redirect('/courses');
//   }
//   req.session.success = 'Courses updated successfully!';
//   res.redirect('/courses');
// });

router.post('/login', passport.authenticate('local'), function(req, res, next) {
	req.session.success = 'Welcome! ' + req.user.username;
  res.redirect('/');
});

function isAdminLoggedIn(req, res, next) {
	if(req.isAuthenticated() && req.user.admin) {
		return next();
	}
	req.session.error = 'Restricted Access!'
	res.redirect('/login');
}

module.exports = router;

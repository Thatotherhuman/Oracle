const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/portfolio', (req, res) => {
  res.render('portfolio');
});

app.get('/solaris', (req, res) => {
  res.render('solaris');
});

app.get('/solaris/sell', (req, res) => {
  res.render('solaris-sell');
});

app.get('/solaris/buy', (req, res) => {
  res.render('solaris-buy');
});

app.get('/profile', (req, res) => {
  res.render('profile');
});

app.get('/ekyc', (req, res) => {
  res.render('ekyc-start');
});

app.get('/ekyc/details', (req, res) => {
  res.render('ekyc-details');
});

app.get('/ekyc/face', (req, res) => {
  res.render('ekyc-face');
});

app.get('/ekyc/identity', (req, res) => {
  res.render('ekyc-identity');
});

app.get('/ekyc/review', (req, res) => {
  res.render('ekyc-review');
});

app.get('/ekyc/success', (req, res) => {
  res.render('ekyc-success');
});

app.listen(port, () => {
  console.log(`Mobile app homepage running at http://localhost:${port}`);
});

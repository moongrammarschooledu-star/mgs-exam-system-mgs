require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const classRoutes = require('./routes/classes');
const sectionRoutes = require('./routes/sections');
const subjectRoutes = require('./routes/subjects');
const examRoutes = require('./routes/exams');
const dashboardRoutes = require('./routes/dashboard');
const studentRoutes = require('./routes/students');
const promotionRoutes = require('./routes/promotions');
const settingRoutes = require('./routes/settings');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static frontend (dashboard UI)
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'mgs-exam-system' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/settings', settingRoutes);

app.use('/api', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
// Only bind a port for local/traditional hosting. On Vercel the exported
// app is wrapped as a serverless function and listen() is neither needed
// nor wanted.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`MGS Exam System running on port ${PORT}`);
  });
}

module.exports = app;

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { auth, repairer, adminOnly } = require('../middleware/auth');

router.get('/', reportController.getReports);
router.get('/map', reportController.getReportsForMap);
router.get('/pending', auth, adminOnly, reportController.getPendingReports);
router.get('/:id', reportController.getReportById);
router.post('/', auth, reportController.createReport);
router.post('/:id/vote', auth, reportController.voteReport);
router.put('/:id/status', auth, repairer, reportController.updateStatus);
router.put('/:id/assign', auth, repairer, reportController.assignReport);
router.put('/:id/approve', auth, adminOnly, reportController.approveReport);
router.put('/:id/reject', auth, adminOnly, reportController.rejectReport);

module.exports = router;


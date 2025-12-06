const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, repairer, adminOnly } = require('../middleware/auth');

router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.get('/dashboard', auth, repairer, userController.getDashboard);
router.get('/my-reports', auth, userController.getMyReports);
router.post('/create-repairer', auth, adminOnly, userController.createRepairer);
router.get('/repairers', auth, adminOnly, userController.getRepairers);

module.exports = router;


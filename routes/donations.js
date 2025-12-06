const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const { auth, repairer } = require('../middleware/auth');

router.post('/', auth, donationController.createDonation);
router.get('/report/:reportId', donationController.getDonationsByReport);
router.get('/my-donations', auth, donationController.getMyDonations);
router.get('/stats', auth, repairer, donationController.getDonationStats);

module.exports = router;


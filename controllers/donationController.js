const Donation = require('../models/Donation');
const Report = require('../models/Report');
const User = require('../models/User');

// @desc    Crear donación
// @route   POST /api/donations
// @access  Private
exports.createDonation = async (req, res) => {
  try {
    const { reportId, amount, anonymous, message } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    if (!report.approved) {
      return res.status(400).json({ message: 'No se pueden hacer donaciones a reportes pendientes de aprobación' });
    }

    // Crear donación (mock por ahora)
    const donation = await Donation.create({
      report: reportId,
      donor: req.user.id,
      amount: parseFloat(amount),
      anonymous: anonymous || false,
      message: message || '',
      paymentMethod: 'mock',
      paymentStatus: 'completed',
      transactionId: `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    // Actualizar total donado del reporte
    report.totalDonated += parseFloat(amount);
    report.donations.push(donation._id);
    
    // Cambiar estado si alcanza el costo estimado
    if (report.totalDonated >= report.estimatedCost && report.estimatedCost > 0) {
      report.status = 'funded';
    } else if (report.status === 'reported') {
      report.status = 'fundraising';
    }
    
    await report.save();

    // Actualizar estadísticas del usuario
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 
        donationsCount: 1,
        totalDonated: parseFloat(amount),
      },
    });

    await donation.populate('donor', 'name email');
    await donation.populate('report', 'title location');

    res.status(201).json(donation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener donaciones de un reporte
// @route   GET /api/donations/report/:reportId
// @access  Public
exports.getDonationsByReport = async (req, res) => {
  try {
    const donations = await Donation.find({ report: req.params.reportId })
      .populate('donor', 'name email')
      .sort('-createdAt');

    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener donaciones del usuario
// @route   GET /api/donations/my-donations
// @access  Private
exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id })
      .populate('report', 'title location status')
      .sort('-createdAt');

    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener estadísticas de donaciones
// @route   GET /api/donations/stats
// @access  Private (Admin/Repairer)
exports.getDonationStats = async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const totalAmount = await Donation.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const donationsByReport = await Donation.aggregate([
      {
        $group: {
          _id: '$report',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { total: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      totalDonations,
      totalAmount: totalAmount[0]?.total || 0,
      topReports: donationsByReport,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


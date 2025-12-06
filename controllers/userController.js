const User = require('../models/User');
const Report = require('../models/Report');
const Donation = require('../models/Donation');

// @desc    Obtener perfil del usuario
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Actualizar perfil del usuario
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, address },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener dashboard de reparador/admin
// @route   GET /api/users/dashboard
// @access  Private (Admin/Repairer)
exports.getDashboard = async (req, res) => {
  try {
    const user = req.user;

    // Reportes asignados al reparador
    const assignedReports = await Report.find({ assignedTo: user.id })
      .populate('reportedBy', 'name email')
      .sort('-createdAt');

    // Estadísticas generales
    const totalReports = await Report.countDocuments();
    const reportsByStatus = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalDonated = await Donation.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Reportes listos para reparar (funded y aprobados)
    const readyToRepair = await Report.find({ 
      status: 'funded',
      assignedTo: { $exists: false },
      approved: true,
    })
      .populate('reportedBy', 'name email')
      .sort('-priority')
      .limit(10);

    // Reportes pendientes de aprobación (solo para admin)
    let pendingReports = [];
    if (user.role === 'admin') {
      pendingReports = await Report.find({ approved: false })
        .populate('reportedBy', 'name email')
        .sort('-createdAt')
        .limit(20);
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      assignedReports,
      statistics: {
        totalReports,
        reportsByStatus,
        totalDonated: totalDonated[0]?.total || 0,
      },
      readyToRepair,
      pendingReports,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener mis reportes
// @route   GET /api/users/my-reports
// @access  Private
exports.getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reportedBy: req.user.id })
      .populate('assignedTo', 'name email')
      .sort('-createdAt');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Crear reparador (solo admin)
// @route   POST /api/users/create-repairer
// @access  Private (Admin only)
exports.createRepairer = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden crear reparadores' });
    }

    const { name, email, password, phone, address } = req.body;

    // Validar que el usuario no exista
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Crear reparador
    const repairer = await User.create({
      name,
      email,
      password,
      phone,
      address,
      role: 'repairer',
      isVerified: true,
    });

    res.status(201).json({
      message: 'Reparador creado exitosamente',
      repairer: {
        id: repairer._id,
        name: repairer.name,
        email: repairer.email,
        role: repairer.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener lista de reparadores (solo admin)
// @route   GET /api/users/repairers
// @access  Private (Admin only)
exports.getRepairers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden ver reparadores' });
    }

    const repairers = await User.find({ role: 'repairer' })
      .select('-password')
      .sort('name');

    // Obtener estadísticas de cada reparador
    const repairersWithStats = await Promise.all(
      repairers.map(async (repairer) => {
        const assignedCount = await Report.countDocuments({ assignedTo: repairer._id });
        const completedCount = await Report.countDocuments({
          assignedTo: repairer._id,
          status: 'completed',
        });

        return {
          ...repairer.toObject(),
          assignedReports: assignedCount,
          completedReports: completedCount,
        };
      })
    );

    res.json(repairersWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


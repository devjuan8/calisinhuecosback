const Report = require('../models/Report');
const User = require('../models/User');
const Donation = require('../models/Donation');
const jwt = require('jsonwebtoken');

// @desc    Crear reporte
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res) => {
  try {
    const report = await Report.create({
      ...req.body,
      reportedBy: req.user.id,
    });

    // Incrementar contador de reportes del usuario
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { reportsCount: 1 },
    });

    await report.populate('reportedBy', 'name email');

    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener todos los reportes
// @route   GET /api/reports
// @access  Public
exports.getReports = async (req, res) => {
  try {
    const { status, neighborhood, sort = '-createdAt', limit = 50, page = 1, includePending } = req.query;
    
    const query = {};
    
    // Solo mostrar reportes aprobados a menos que sea admin y pida ver pendientes
    const isAdmin = req.user && (req.user.role === 'admin');
    if (!isAdmin || includePending !== 'true') {
      query.approved = true;
    }
    
    if (status) query.status = status;
    if (neighborhood) query['location.neighborhood'] = new RegExp(neighborhood, 'i');

    const reports = await Report.find(query)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvedBy', 'name email')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener reporte por ID
// @route   GET /api/reports/:id
// @access  Public (pero verifica token opcionalmente)
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvedBy', 'name email')
      .populate({
        path: 'donations',
        populate: {
          path: 'donor',
          select: 'name email',
        },
      });

    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    // Verificar si hay un token y si el usuario es admin
    let isAdmin = false;
    if (req.user) {
      isAdmin = req.user.role === 'admin';
    } else {
      // Intentar verificar token de forma opcional
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          if (user && user.role === 'admin') {
            isAdmin = true;
          }
        } catch (error) {
          // Token inválido, continuar sin autenticación
        }
      }
    }

    // Solo admins pueden ver reportes no aprobados
    if (!report.approved && !isAdmin) {
      return res.status(403).json({ message: 'Este reporte está pendiente de aprobación' });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Votar por un reporte (priorizar)
// @route   POST /api/reports/:id/vote
// @access  Private
exports.voteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    // Solo se puede votar por reportes aprobados
    if (!report.approved) {
      return res.status(400).json({ message: 'No se puede votar por un reporte pendiente de aprobación' });
    }

    // Verificar si el usuario ya votó
    const hasVoted = report.votes.some(
      vote => vote.user.toString() === req.user.id.toString()
    );

    if (hasVoted) {
      return res.status(400).json({ message: 'Ya has votado por este reporte' });
    }

    // Agregar voto
    report.votes.push({ user: req.user.id });
    report.votesCount += 1;
    
    // Calcular prioridad basada en votos y tiempo
    const daysSinceReport = Math.floor((Date.now() - report.createdAt) / (1000 * 60 * 60 * 24));
    report.priority = Math.min(10, report.votesCount + Math.floor(daysSinceReport / 7));

    await report.save();

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Actualizar estado del reporte
// @route   PUT /api/reports/:id/status
// @access  Private (Admin/Repairer)
exports.updateStatus = async (req, res) => {
  try {
    const { status, notes, completionImages } = req.body;
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    report.status = status;
    if (notes) report.notes = notes;
    if (completionImages) report.completionImages = completionImages;
    
    if (status === 'completed') {
      report.completedAt = new Date();
    }

    await report.save();

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Asignar reporte a reparador
// @route   PUT /api/reports/:id/assign
// @access  Private (Admin/Repairer)
exports.assignReport = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    // Si es admin, puede asignar a cualquier reparador
    // Si es repairer, solo puede asignarse a sí mismo
    let targetRepairer = req.user.id;
    
    if (req.user.role === 'admin' && assignedTo) {
      // Verificar que el usuario asignado sea un reparador
      const User = require('../models/User');
      const repairer = await User.findById(assignedTo);
      if (!repairer || repairer.role !== 'repairer') {
        return res.status(400).json({ message: 'Solo se pueden asignar reportes a reparadores' });
      }
      targetRepairer = assignedTo;
    }

    report.assignedTo = targetRepairer;
    report.status = 'in_progress';

    await report.save();
    await report.populate('assignedTo', 'name email');

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener reportes por ubicación (para mapa)
// @route   GET /api/reports/map
// @access  Public
exports.getReportsForMap = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query; // radius en km

    let query = { approved: true }; // Solo reportes aprobados en el mapa
    
    if (lat && lng) {
      // Búsqueda por radio (simplificada)
      const latRange = radius / 111; // 1 grado ≈ 111 km
      const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));
      
      query['location.coordinates.lat'] = {
        $gte: parseFloat(lat) - latRange,
        $lte: parseFloat(lat) + latRange,
      };
      query['location.coordinates.lng'] = {
        $gte: parseFloat(lng) - lngRange,
        $lte: parseFloat(lng) + lngRange,
      };
    }

    const reports = await Report.find(query)
      .select('title location status priority votesCount totalDonated createdAt approved')
      .limit(1000);

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Aprobar reporte
// @route   PUT /api/reports/:id/approve
// @access  Private (Admin only)
exports.approveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    if (report.approved) {
      return res.status(400).json({ message: 'El reporte ya está aprobado' });
    }

    report.approved = true;
    report.approvedBy = req.user.id;
    report.approvedAt = new Date();
    report.rejectionReason = null;

    await report.save();
    await report.populate('approvedBy', 'name email');

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rechazar reporte (elimina de la BD)
// @route   PUT /api/reports/:id/reject
// @access  Private (Admin only)
exports.rejectReport = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    if (report.approved) {
      return res.status(400).json({ message: 'No se puede rechazar un reporte ya aprobado' });
    }

    // Eliminar todas las donaciones asociadas al reporte
    await Donation.deleteMany({ report: report._id });

    // Decrementar contador de reportes del usuario que lo creó
    if (report.reportedBy) {
      await User.findByIdAndUpdate(report.reportedBy, {
        $inc: { reportsCount: -1 },
      });
    }

    // Eliminar el reporte de la base de datos
    await Report.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Reporte rechazado y eliminado exitosamente',
      rejectionReason: rejectionReason || 'Reporte rechazado por el administrador'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtener reportes pendientes de aprobación
// @route   GET /api/reports/pending
// @access  Private (Admin only)
exports.getPendingReports = async (req, res) => {
  try {
    const reports = await Report.find({ approved: false })
      .populate('reportedBy', 'name email')
      .sort('-createdAt');

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


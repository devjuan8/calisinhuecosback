const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: [true, 'El reporte es requerido'],
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El donante es requerido'],
  },
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [1000, 'El monto mínimo es $1.000'],
  },
  paymentMethod: {
    type: String,
    enum: ['mock', 'card', 'nequi', 'daviplata', 'transfer'],
    default: 'mock',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  },
  transactionId: {
    type: String,
    trim: true,
  },
  anonymous: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    trim: true,
    maxlength: [200, 'El mensaje no puede exceder 200 caracteres'],
  },
}, {
  timestamps: true,
});

// Índices
donationSchema.index({ report: 1 });
donationSchema.index({ donor: 1 });
donationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);


const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true,
  },
  location: {
    address: {
      type: String,
      required: [true, 'La dirección es requerida'],
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'La latitud es requerida'],
      },
      lng: {
        type: Number,
        required: [true, 'La longitud es requerida'],
      },
    },
    neighborhood: {
      type: String,
      required: [true, 'El barrio es requerido'],
      trim: true,
    },
  },
  images: [{
    type: String,
  }],
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['reported', 'fundraising', 'funded', 'in_progress', 'completed', 'cancelled'],
    default: 'reported',
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
  },
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  votesCount: {
    type: Number,
    default: 0,
  },
  estimatedCost: {
    type: Number,
    default: 0,
  },
  totalDonated: {
    type: Number,
    default: 0,
  },
  donations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donation',
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  completedAt: {
    type: Date,
  },
  completionImages: [{
    type: String,
  }],
  notes: {
    type: String,
    trim: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Índices para búsquedas eficientes
reportSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lng': 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ priority: -1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ approved: 1 });

module.exports = mongoose.model('Report', reportSchema);


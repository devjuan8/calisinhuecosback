// Handler para Vercel Serverless Functions
const app = require('../server');

// Exportar como handler para Vercel
module.exports = (req, res) => {
  return app(req, res);
};


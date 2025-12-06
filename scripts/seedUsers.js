const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Cargar variables de entorno
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cali-sin-huecos';

const users = [
  {
    name: 'Usuario Regular',
    email: 'usuario@cali.com',
    password: '123456',
    role: 'user',
    phone: '3001234567',
    address: 'Calle 5 #10-20, Cali',
  },
  {
    name: 'Samuel Merchán',
    email: 'samuel@cali.com',
    password: '123456',
    role: 'repairer',
    phone: '3007654321',
    address: 'Calle 10 #5-30, Cali',
    isVerified: true,
  },
  {
    name: 'Administrador',
    email: 'admin@cali.com',
    password: '123456',
    role: 'admin',
    phone: '3009876543',
    address: 'Calle 15 #20-40, Cali',
    isVerified: true,
  },
];

async function seedUsers() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Limpiar usuarios existentes (opcional - comenta si no quieres borrar)
    // await User.deleteMany({});
    // console.log('🗑️  Usuarios existentes eliminados');

    console.log('🌱 Creando usuarios...');

    for (const userData of users) {
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️  Usuario ${userData.email} ya existe, omitiendo...`);
        continue;
      }

      const user = await User.create(userData);
      console.log(`✅ Usuario creado: ${user.name} (${user.email}) - Rol: ${user.role}`);
    }

    console.log('\n✨ ¡Usuarios creados exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach(user => {
      console.log(`\n👤 ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Rol: ${user.role}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedUsers();


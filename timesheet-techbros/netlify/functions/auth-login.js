const jwt = require('jsonwebtoken');

// Clave secreta para JWT (configurar en Netlify Environment Variables)
const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-techbros-secret-key-2025';

// Base de datos de usuarios (en producción usar una base de datos real)
const users = [
  {
    id: 1,
    username: 'juan_perez',
    password: 'password123', // En producción, usar bcrypt
    completeName: 'Juan Pérez',
    position: 'Driver',
    phoneNumber: '+34123456789',
    active: true
  },
  {
    id: 2,
    username: 'maria_garcia',
    password: 'password456',
    completeName: 'María García',
    position: 'Engineer',
    phoneNumber: '+34987654321',
    active: true
  },
  {
    id: 3,
    username: 'admin_test',
    password: 'test123',
    completeName: 'Usuario de Prueba',
    position: 'Engineer',
    phoneNumber: '+34555123456',
    active: true
  },
  {
    id: 4,
    username: 'carlos_lopez',
    password: 'carlos2025',
    completeName: 'Carlos López',
    position: 'Driver',
    phoneNumber: '+34666789123',
    active: true
  },
  {
    id: 5,
    username: 'ana_martinez',
    password: 'ana2025',
    completeName: 'Ana Martínez',
    position: 'Engineer',
    phoneNumber: '+34777456789',
    active: true
  }
];

exports.handler = async (event, context) => {
  // Manejar CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        message: 'Method not allowed' 
      })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Validar campos requeridos
    if (!username || !password) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          message: 'Username and password are required' 
        })
      };
    }

    // Buscar usuario
    const user = users.find(u => 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password &&
      u.active === true
    );

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          message: 'Invalid credentials' 
        })
      };
    }

    // Generar JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        position: user.position
      }, 
      JWT_SECRET, 
      { expiresIn: '30d' } // Token válido por 30 días
    );

    // Remover password del objeto user antes de enviar
    const { password: _, ...userWithoutPassword } = user;

    // Log del login exitoso
    console.log(`Login exitoso: ${username} - ${new Date().toISOString()}`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        token: token,
        user: userWithoutPassword,
        message: 'Login successful'
      })
    };

  } catch (error) {
    console.error('Error en auth-login:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      })
    };
  }
};
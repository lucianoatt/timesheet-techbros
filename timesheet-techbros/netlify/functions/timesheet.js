const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-techbros-secret-key-2025';

// Simulación de base de datos en memoria (en producción usar MongoDB, PostgreSQL, etc.)
let timesheetData = [];

function verifyToken(authHeader) {
  try {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return null;
    
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verificando token:', error.message);
    return null;
  }
}

exports.handler = async (event, context) => {
  // Manejar CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      },
      body: ''
    };
  }

  // Verificar autenticación
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const user = verifyToken(authHeader);

  if (!user) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Unauthorized - Invalid token' })
    };
  }

  try {
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // Validar datos requeridos
      if (!data.date || !data.time || !data.description) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Missing required fields: date, time, description' 
          })
        };
      }

      // Crear registro con ID único y timestamp
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        userId: user.userId,
        username: user.username,
        timestamp: new Date().toISOString(),
        serverTime: new Date().toLocaleString('es-ES', {
          timeZone: 'Europe/Madrid'
        })
      };

      // Agregar a la "base de datos"
      timesheetData.push(record);

      console.log(`Timesheet record created: ${record.id} - ${user.username} - ${data.description}`);

      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          id: record.id,
          message: 'Timesheet record created successfully',
          record: record
        })
      };
    }

    if (event.httpMethod === 'GET') {
      // Obtener parámetros de consulta
      const params = event.queryStringParameters || {};
      
      // Filtrar registros por usuario
      let userRecords = timesheetData.filter(record => 
        record.userId === user.userId || record.username === user.username
      );

      // Filtros adicionales
      if (params.user && user.position === 'admin') {
        // Solo admins pueden ver datos de otros usuarios
        userRecords = timesheetData.filter(record => record.user === params.user);
      }

      if (params.date) {
        userRecords = userRecords.filter(record => record.date === params.date);
      }

      if (params.month && params.year) {
        const targetDate = `${params.year}-${params.month.padStart(2, '0')}`;
        userRecords = userRecords.filter(record => 
          record.date.startsWith(targetDate)
        );
      }

      // Ordenar por fecha y hora (más recientes primero)
      userRecords.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB - dateA;
      });

      console.log(`Timesheet records retrieved: ${userRecords.length} records for ${user.username}`);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: userRecords,
          count: userRecords.length,
          user: user.username
        })
      };
    }

    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error in timesheet function:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
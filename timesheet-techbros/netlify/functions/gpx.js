const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-techbros-secret-key-2025';

// Base de datos en memoria para datos GPS
let gpxData = [];

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
      
      // Validar datos GPS requeridos
      if (!data.latitude || !data.longitude || !data.date || !data.time) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Missing required GPS fields: latitude, longitude, date, time' 
          })
        };
      }

      // Validar coordenadas GPS
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Invalid GPS coordinates' 
          })
        };
      }

      // Crear registro GPS
      const record = {
        id: `gpx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        latitude: lat,
        longitude: lng,
        userId: user.userId,
        username: user.username,
        timestamp: new Date().toISOString(),
        accuracy: data.accuracy || null,
        altitude: data.altitude || null,
        speed: data.speed || null
      };

      // Agregar a la base de datos
      gpxData.push(record);

      // Log para debugging (sin mostrar ubicación exacta por privacidad)
      console.log(`GPS point recorded: ${record.id} - ${user.username} - ${data.date} ${data.time}`);

      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          id: record.id,
          message: 'GPS point recorded successfully'
        })
      };
    }

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      
      // Filtrar por usuario
      let userRecords = gpxData.filter(record => 
        record.userId === user.userId || record.username === user.username
      );

      // Filtros adicionales
      if (params.user && user.position === 'admin') {
        userRecords = gpxData.filter(record => record.user === params.user);
      }

      if (params.date) {
        userRecords = userRecords.filter(record => record.date === params.date);
      }

      if (params.filename) {
        userRecords = userRecords.filter(record => record.filename === params.filename);
      }

      // Limitar resultados para evitar respuestas muy grandes
      const limit = parseInt(params.limit) || 1000;
      if (userRecords.length > limit) {
        userRecords = userRecords.slice(0, limit);
      }

      // Ordenar por fecha y hora
      userRecords.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA - dateB;
      });

      console.log(`GPX records retrieved: ${userRecords.length} points for ${user.username}`);

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
          user: user.username,
          limited: userRecords.length === limit
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
    console.error('Error in GPX function:', error);
    
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
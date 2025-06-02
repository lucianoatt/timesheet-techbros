const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-techbros-secret-key-2025';

// Base de datos en memoria para gastos
let expenseData = [];

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

function validateAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && num <= 10000; // Límite razonable de €10,000
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
      if (!data.description || !data.amount || !data.date || !data.time) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Missing required fields: description, amount, date, time' 
          })
        };
      }

      // Validar monto
      if (!validateAmount(data.amount)) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Invalid amount. Must be between 0 and 10000 euros' 
          })
        };
      }

      // Validar descripción
      if (data.description.length < 3 || data.description.length > 200) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Description must be between 3 and 200 characters' 
          })
        };
      }

      // Crear registro de gasto
      const record = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: data.description.trim(),
        amount: parseFloat(data.amount),
        date: data.date,
        time: data.time,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        userId: user.userId,
        username: user.username,
        timestamp: new Date().toISOString(),
        currency: 'EUR',
        category: data.category || 'General',
        receipt: data.receipt || null
      };

      // Agregar a la base de datos
      expenseData.push(record);

      console.log(`Expense recorded: ${record.id} - ${user.username} - €${record.amount} - ${record.description}`);

      return {
        statusCode: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          id: record.id,
          amount: record.amount,
          message: 'Expense recorded successfully',
          record: {
            id: record.id,
            description: record.description,
            amount: record.amount,
            date: record.date,
            time: record.time
          }
        })
      };
    }

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      
      // Filtrar por usuario
      let userRecords = expenseData.filter(record => 
        record.userId === user.userId || record.username === user.username
      );

      // Filtros adicionales
      if (params.user && user.position === 'admin') {
        userRecords = expenseData.filter(record => record.user === params.user);
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

      if (params.category) {
        userRecords = userRecords.filter(record => 
          record.category === params.category
        );
      }

      // Calcular totales
      const totalAmount = userRecords.reduce((sum, record) => sum + record.amount, 0);
      const monthlyTotals = {};
      
      userRecords.forEach(record => {
        const monthKey = record.date.substring(0, 7); // YYYY-MM
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + record.amount;
      });

      // Ordenar por fecha y hora (más recientes primero)
      userRecords.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB - dateA;
      });

      console.log(`Expense records retrieved: ${userRecords.length} records for ${user.username} - Total: €${totalAmount.toFixed(2)}`);

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
          totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimals
          monthlyTotals: monthlyTotals,
          user: user.username,
          currency: 'EUR'
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
    console.error('Error in expenses function:', error);
    
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
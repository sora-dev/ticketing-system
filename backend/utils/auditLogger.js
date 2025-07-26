const AuditLog = require('../models/AuditLog');

// Helper function to extract IP address
const getClientIP = (req) => {
  // Try multiple methods to get the real IP
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (clientIP) {
    return clientIP;
  }
  
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
         req.remoteAddress ||
         'unknown';
};

const logAuditEvent = async ({
  userId,
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent,
  req // Add req parameter for better IP extraction
}) => {
  try {
    const finalIP = ipAddress || (req ? getClientIP(req) : 'unknown');
    
    const auditLog = new AuditLog({
      user: userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: finalIP,
      userAgent
    });
    
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

module.exports = { logAuditEvent };
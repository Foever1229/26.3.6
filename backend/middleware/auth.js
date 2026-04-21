const jwt = require('jsonwebtoken');
const Response = require('../utils/response');

// JWT验证中间件
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return Response.error(res, '未提供认证令牌', 401, 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return Response.error(res, '令牌无效或已过期', 401, 401);
    }
};

// 角色权限验证
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return Response.error(res, '未认证', 401, 401);
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return Response.error(res, '权限不足', 403, 403);
        }
        
        next();
    };
};

module.exports = { authMiddleware, roleMiddleware };

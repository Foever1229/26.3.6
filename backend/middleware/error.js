const Response = require('../utils/response');

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error('错误:', err);

    // MySQL错误处理
    if (err.code === 'ER_DUP_ENTRY') {
        return Response.error(res, '数据已存在，请勿重复添加', 409);
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW') {
        return Response.error(res, '关联数据不存在', 400);
    }

    // JWT错误
    if (err.name === 'JsonWebTokenError') {
        return Response.error(res, '无效的令牌', 401, 401);
    }

    if (err.name === 'TokenExpiredError') {
        return Response.error(res, '令牌已过期', 401, 401);
    }

    // 默认错误响应
    const message = err.message || '服务器内部错误';
    const statusCode = err.statusCode || 500;
    
    return Response.error(res, message, statusCode, statusCode);
};

// 404处理
const notFoundHandler = (req, res) => {
    return Response.error(res, '接口不存在', 404, 404);
};

module.exports = { errorHandler, notFoundHandler };

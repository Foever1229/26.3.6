// 统一响应格式
class Response {
    static success(res, data = null, message = '操作成功') {
        return res.json({
            code: 200,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    static error(res, message = '操作失败', code = 500, statusCode = 200) {
        return res.status(statusCode).json({
            code,
            message,
            data: null,
            timestamp: new Date().toISOString()
        });
    }

    static page(res, list, pagination) {
        return res.json({
            code: 200,
            message: '查询成功',
            data: {
                list,
                pagination: {
                    page: pagination.page,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    totalPages: Math.ceil(pagination.total / pagination.pageSize)
                }
            },
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = Response;

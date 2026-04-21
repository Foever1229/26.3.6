const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Response = require('../utils/response');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// 辅助函数：执行SQL查询
const query = async (sql, params) => {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (error) {
        console.error('SQL执行错误:', error.message);
        console.error('SQL:', sql);
        console.error('参数:', params);
        throw error;
    }
};

// 获取用户列表（管理员权限）
router.get('/', authMiddleware, roleMiddleware(['admin']), async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', roleId = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (u.Username LIKE ? OR u.RealName LIKE ? OR u.Department LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        if (roleId) {
            whereClause += ' AND u.RoleID = ?';
            params.push(roleId);
        }

        // 查询总数
        const countResult = await query(
            `SELECT COUNT(*) as total FROM User u ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // 查询数据
        const rows = await query(
            `SELECT u.UserID, u.Username, u.RealName, u.Department, u.Phone, u.Email,
                    u.CreateTime, r.RoleName, r.RoleCode
             FROM User u
             LEFT JOIN Role r ON u.RoleID = r.RoleID
             ${whereClause}
             ORDER BY u.CreateTime DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 获取单个用户
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        const users = await query(
            `SELECT u.UserID, u.Username, u.RealName, u.Department, u.Phone, u.Email,
                    u.CreateTime, u.RoleID, r.RoleName
             FROM User u
             LEFT JOIN Role r ON u.RoleID = r.RoleID
             WHERE u.UserID = ?`,
            [req.params.id]
        );

        if (users.length === 0) {
            return Response.error(res, '用户不存在', 404);
        }

        Response.success(res, users[0]);
    } catch (error) {
        next(error);
    }
});

// 创建用户（管理员权限）
router.post('/', authMiddleware, roleMiddleware(['admin']), async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const username = req.body.username || req.body.Username;
        const password = req.body.password || req.body.Password;
        const realName = req.body.realName || req.body.RealName;
        const roleId = req.body.roleId || req.body.RoleID;
        const department = req.body.department || req.body.Department;
        const phone = req.body.phone || req.body.Phone;
        const email = req.body.email || req.body.Email;

        if (!username || !password || !roleId) {
            return Response.error(res, '用户名、密码和角色不能为空', 400);
        }

        const result = await query(
            `INSERT INTO User (Username, Password, RealName, RoleID, Department, Phone, Email)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, password, realName || null, roleId, department || null, phone || null, email || null]
        );

        Response.success(res, { userId: result.insertId }, '用户创建成功');
    } catch (error) {
        next(error);
    }
});

// 更新用户
router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
        console.log('更新用户 - 请求体:', req.body);
        console.log('当前用户:', req.user);

        // 兼容前端字段名（大写开头）
        const username = req.body.username || req.body.Username;
        const realName = req.body.realName || req.body.RealName;
        const roleId = req.body.roleId || req.body.RoleID;
        const department = req.body.department || req.body.Department;
        const phone = req.body.phone || req.body.Phone;
        const email = req.body.email || req.body.Email;
        const userId = req.params.id;

        console.log('提取的字段:', { username, realName, roleId, department, phone, email, userId });

        // 非管理员只能修改自己的信息
        if (req.user.role !== 'admin' && parseInt(userId) !== req.user.userId) {
            return Response.error(res, '权限不足', 403);
        }

        // 构建更新字段
        const updates = [];
        const params = [];

        if (username !== undefined && username !== null) {
            updates.push('Username = ?');
            params.push(username);
        }
        if (realName !== undefined && realName !== null) {
            updates.push('RealName = ?');
            params.push(realName);
        }
        if (department !== undefined) {
            updates.push('Department = ?');
            params.push(department);
        }
        if (phone !== undefined) {
            updates.push('Phone = ?');
            params.push(phone);
        }
        if (email !== undefined) {
            updates.push('Email = ?');
            params.push(email);
        }

        // 只有管理员可以修改角色
        if (roleId !== undefined && roleId !== null && req.user.role === 'admin') {
            updates.push('RoleID = ?');
            params.push(roleId);
        }

        console.log('更新字段:', updates);
        console.log('参数:', params);

        if (updates.length === 0) {
            return Response.error(res, '没有需要更新的字段', 400);
        }

        params.push(userId);

        await query(
            `UPDATE User SET ${updates.join(', ')} WHERE UserID = ?`,
            params
        );

        Response.success(res, null, '用户更新成功');
    } catch (error) {
        console.error('更新用户错误:', error);
        next(error);
    }
});

// 删除用户（管理员权限）
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res, next) => {
    try {
        await query('DELETE FROM User WHERE UserID = ?', [req.params.id]);
        Response.success(res, null, '用户删除成功');
    } catch (error) {
        next(error);
    }
});

// 获取角色列表
router.get('/roles/list', authMiddleware, async (req, res, next) => {
    try {
        const roles = await query('SELECT * FROM Role ORDER BY RoleID');
        Response.success(res, roles);
    } catch (error) {
        next(error);
    }
});

module.exports = router;

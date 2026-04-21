const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const Response = require('../utils/response');
const { authMiddleware } = require('../middleware/auth');

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

// 用户登录
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return Response.error(res, '用户名和密码不能为空', 400);
        }

        // 查询用户
        const users = await query(
            `SELECT u.*, r.RoleName, r.RoleCode
             FROM User u
             LEFT JOIN Role r ON u.RoleID = r.RoleID
             WHERE u.Username = ?`,
            [username]
        );

        if (users.length === 0) {
            return Response.error(res, '用户名或密码错误', 401);
        }

        const user = users[0];

        // 验证密码（这里使用明文密码比对，生产环境建议使用bcrypt）
        if (password !== user.Password) {
            return Response.error(res, '用户名或密码错误', 401);
        }

        // 生成JWT
        const token = jwt.sign(
            { 
                userId: user.UserID, 
                username: user.Username,
                realName: user.RealName,
                role: user.RoleCode,
                roleName: user.RoleName
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // 记录登录日志
        await query(
            'INSERT INTO SystemLog (UserID, Username, Operation, Module, Content, IPAddress) VALUES (?, ?, ?, ?, ?, ?)',
            [user.UserID, user.Username, '登录', '认证', '用户登录系统', req.ip]
        );

        Response.success(res, {
            token,
            user: {
                userId: user.UserID,
                username: user.Username,
                realName: user.RealName,
                role: user.RoleCode,
                roleName: user.RoleName,
                department: user.Department
            }
        }, '登录成功');

    } catch (error) {
        next(error);
    }
});

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res, next) => {
    try {
        const users = await query(
            `SELECT u.UserID, u.Username, u.RealName, u.Department, u.Phone, u.Email,
                    u.CreateTime, r.RoleName, r.RoleCode
             FROM User u
             LEFT JOIN Role r ON u.RoleID = r.RoleID
             WHERE u.UserID = ?`,
            [req.user.userId]
        );

        if (users.length === 0) {
            return Response.error(res, '用户不存在', 404);
        }

        Response.success(res, users[0]);
    } catch (error) {
        next(error);
    }
});

// 修改密码
router.post('/change-password', authMiddleware, async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return Response.error(res, '原密码和新密码不能为空', 400);
        }

        // 验证原密码
        const users = await query(
            'SELECT Password FROM User WHERE UserID = ?',
            [req.user.userId]
        );

        if (users.length === 0 || users[0].Password !== oldPassword) {
            return Response.error(res, '原密码错误', 400);
        }

        // 更新密码
        await query(
            'UPDATE User SET Password = ? WHERE UserID = ?',
            [newPassword, req.user.userId]
        );

        Response.success(res, null, '密码修改成功');
    } catch (error) {
        next(error);
    }
});

module.exports = router;

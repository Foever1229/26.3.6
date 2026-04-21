const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/error');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const researchRoutes = require('./routes/research');
const teachingRoutes = require('./routes/teaching');
const studentRoutes = require('./routes/students');
const dashboardRoutes = require('./routes/dashboard');
const enrollmentRoutes = require('./routes/enrollment');


const app = express();
const PORT = process.env.PORT || 3000;

// 中间件 - 增加请求头大小限制
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/teaching', teachingRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/enrollment', enrollmentRoutes);


// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`API地址: http://localhost:${PORT}`);
    
    // 测试数据库连接
    testConnection();
});

module.exports = app;

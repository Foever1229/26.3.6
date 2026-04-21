const express = require('express');
const router = express.Router();
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

// ==================== 教学任务 ====================

// 获取教学任务列表
router.get('/tasks', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', semester = '', teacherId = '', myTasks = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (CourseName LIKE ? OR CourseCode LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        if (semester) {
            whereClause += ' AND Semester = ?';
            params.push(semester);
        }

        if (teacherId) {
            whereClause += ' AND TeacherID = ?';
            params.push(teacherId);
        }

        // 教师查看自己的任务（用于编辑时）
        if (myTasks === 'true' && req.user.role === 'teacher') {
            whereClause += ' AND TeacherID = ?';
            params.push(req.user.userId);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM TeachingTask ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT t.*, u.RealName as CreatorName
             FROM TeachingTask t
             LEFT JOIN User u ON t.UserID = u.UserID
             ${whereClause}
             ORDER BY t.Semester DESC, t.CourseName
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建教学任务
router.post('/tasks', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const courseName = req.body.courseName || req.body.CourseName;
        const courseCode = req.body.courseCode || req.body.CourseCode;
        const teacherId = req.body.teacherId || req.body.TeacherID;
        const teacherName = req.body.teacherName || req.body.TeacherName;
        const hours = req.body.hours || req.body.Hours;
        const credits = req.body.credits || req.body.Credits;
        const semester = req.body.semester || req.body.Semester;
        const academicYear = req.body.academicYear || req.body.AcademicYear;

        // 如果没有提供TeacherID，使用当前用户ID
        const finalTeacherId = teacherId || req.user.userId;
        
        // 如果没有提供Semester，使用当前学期（根据当前月份判断）
        const now = new Date();
        const month = now.getMonth() + 1; // 0-11，转为1-12
        const currentYear = now.getFullYear();
        // 2-7月为春季学期，8-1月为秋季学期
        const currentSemester = semester || (month >= 2 && month <= 7 ? '春季' : '秋季');
        const currentAcademicYear = academicYear || (month >= 2 && month <= 7 ? `${currentYear-1}-${currentYear}` : `${currentYear}-${currentYear+1}`);

        const result = await query(
            `INSERT INTO TeachingTask (CourseName, CourseCode, TeacherID, TeacherName,
             Hours, Credits, Semester, AcademicYear, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [courseName || null, courseCode || null, finalTeacherId, teacherName || null, hours || 0, credits || 0, currentSemester, currentAcademicYear, req.user.userId]
        );

        Response.success(res, { taskId: result.insertId }, '教学任务添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新教学任务
router.put('/tasks/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canEditAll = role === 'admin' || role === 'office';

        // 先检查权限
        if (!canEditAll) {
            const tasks = await query(
                'SELECT * FROM TeachingTask WHERE TaskID = ? AND TeacherID = ?',
                [req.params.id, userId]
            );
            if (tasks.length === 0) {
                return Response.error(res, '无权修改此教学任务', 403);
            }
        }

        // 兼容前端字段名（大写开头）
        const courseName = req.body.courseName || req.body.CourseName;
        const courseCode = req.body.courseCode || req.body.CourseCode;
        const teacherId = req.body.teacherId || req.body.TeacherID;
        const teacherName = req.body.teacherName || req.body.TeacherName;
        const hours = req.body.hours || req.body.Hours;
        const credits = req.body.credits || req.body.Credits;
        const semester = req.body.semester || req.body.Semester;
        const academicYear = req.body.academicYear || req.body.AcademicYear;

        // 如果没有提供TeacherID，使用当前用户ID
        const finalTeacherId = teacherId || req.user.userId;
        
        // 如果没有提供Semester，使用当前学期
        const now = new Date();
        const month = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const currentSemester = semester || (month >= 2 && month <= 7 ? '春季' : '秋季');
        const currentAcademicYear = academicYear || (month >= 2 && month <= 7 ? `${currentYear-1}-${currentYear}` : `${currentYear}-${currentYear+1}`);

        await query(
            `UPDATE TeachingTask SET CourseName = ?, CourseCode = ?, TeacherID = ?,
             TeacherName = ?, Hours = ?, Credits = ?, Semester = ?, AcademicYear = ?
             WHERE TaskID = ?`,
            [courseName || null, courseCode || null, finalTeacherId, teacherName || null, hours || 0, credits || 0, currentSemester, currentAcademicYear, req.params.id]
        );

        Response.success(res, null, '教学任务更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除教学任务
router.delete('/tasks/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canDeleteAll = role === 'admin' || role === 'office';

        // 先检查权限
        if (!canDeleteAll) {
            const tasks = await query(
                'SELECT * FROM TeachingTask WHERE TaskID = ? AND TeacherID = ?',
                [req.params.id, userId]
            );
            if (tasks.length === 0) {
                return Response.error(res, '无权删除此教学任务', 403);
            }
        }

        await query('DELETE FROM TeachingTask WHERE TaskID = ?', [req.params.id]);
        Response.success(res, null, '教学任务删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 课程管理 ====================

// 获取课程列表
router.get('/courses', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', courseType = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (CourseName LIKE ? OR CourseCode LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        if (courseType) {
            whereClause += ' AND CourseType = ?';
            params.push(courseType);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM Course ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT * FROM Course ${whereClause} ORDER BY CourseCode LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建课程
router.post('/courses', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const courseName = req.body.courseName || req.body.CourseName;
        const courseCode = req.body.courseCode || req.body.CourseCode;
        const courseType = req.body.courseType || req.body.CourseType;
        const credits = req.body.credits || req.body.Credits;
        const hours = req.body.hours || req.body.Hours;
        const major = req.body.major || req.body.Major;
        const grade = req.body.grade || req.body.Grade;
        const semester = req.body.semester || req.body.Semester;
        const description = req.body.description || req.body.Description;

        const result = await query(
            `INSERT INTO Course (CourseName, CourseCode, CourseType, Credits, Hours, Major, Grade, Semester, Description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [courseName || null, courseCode || null, courseType || null, credits || 0, hours || 0, major || null, grade || null, semester || null, description || null]
        );

        Response.success(res, { courseId: result.insertId }, '课程添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新课程
router.put('/courses/:id', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const courseName = req.body.courseName || req.body.CourseName;
        const courseCode = req.body.courseCode || req.body.CourseCode;
        const courseType = req.body.courseType || req.body.CourseType;
        const credits = req.body.credits || req.body.Credits;
        const hours = req.body.hours || req.body.Hours;
        const major = req.body.major || req.body.Major;
        const grade = req.body.grade || req.body.Grade;
        const semester = req.body.semester || req.body.Semester;
        const description = req.body.description || req.body.Description;

        // 验证必填字段
        if (!courseName) {
            return Response.error(res, '课程名称不能为空', 400);
        }
        if (!courseCode) {
            return Response.error(res, '课程代码不能为空', 400);
        }

        await query(
            `UPDATE Course SET CourseName = ?, CourseCode = ?, CourseType = ?, Credits = ?,
             Hours = ?, Major = ?, Grade = ?, Semester = ?, Description = ?
             WHERE CourseID = ?`,
            [courseName, courseCode, courseType || null, credits || 0, hours || 0, major || null, grade || null, semester || null, description || null, req.params.id]
        );

        Response.success(res, null, '课程更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除课程
router.delete('/courses/:id', authMiddleware, async (req, res, next) => {
    try {
        await query('DELETE FROM Course WHERE CourseID = ?', [req.params.id]);
        Response.success(res, null, '课程删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 教材管理 ====================

// 获取教材列表
router.get('/textbooks', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (BookName LIKE ? OR ISBN LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM Textbook ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT t.*, u.RealName as CreatorName
             FROM Textbook t
             LEFT JOIN User u ON t.UserID = u.UserID
             ${whereClause}
             ORDER BY t.CreateTime DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建教材
router.post('/textbooks', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const bookName = req.body.bookName || req.body.BookName;
        const isbn = req.body.isbn || req.body.ISBN;
        const authors = req.body.authors || req.body.Authors;
        const publisher = req.body.publisher || req.body.Publisher;
        const publishDate = req.body.publishDate || req.body.PublishDate;
        const bookType = req.body.bookType || req.body.BookType;
        const isChiefEditor = req.body.isChiefEditor || req.body.IsChiefEditor;

        const result = await query(
            `INSERT INTO Textbook (BookName, ISBN, Authors, Publisher, PublishDate, BookType, IsChiefEditor, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bookName || null, isbn || null, authors || null, publisher || null, publishDate || null, bookType || null, isChiefEditor || 0, req.user.userId]
        );

        Response.success(res, { textbookId: result.insertId }, '教材添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新教材
router.put('/textbooks/:id', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const bookName = req.body.bookName || req.body.BookName;
        const isbn = req.body.isbn || req.body.ISBN;
        const authors = req.body.authors || req.body.Authors;
        const publisher = req.body.publisher || req.body.Publisher;
        const publishDate = req.body.publishDate || req.body.PublishDate;
        const bookType = req.body.bookType || req.body.BookType;
        const isChiefEditor = req.body.isChiefEditor || req.body.IsChiefEditor;

        // 验证必填字段
        if (!bookName) {
            return Response.error(res, '教材名称不能为空', 400);
        }
        if (!authors) {
            return Response.error(res, '主编人员不能为空', 400);
        }

        await query(
            `UPDATE Textbook SET BookName = ?, ISBN = ?, Authors = ?, Publisher = ?,
             PublishDate = ?, BookType = ?, IsChiefEditor = ?
             WHERE TextbookID = ?`,
            [bookName, isbn || null, authors, publisher || null, publishDate || null, bookType || null, isChiefEditor || 0, req.params.id]
        );

        Response.success(res, null, '教材更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除教材
router.delete('/textbooks/:id', authMiddleware, async (req, res, next) => {
    try {
        await query('DELETE FROM Textbook WHERE TextbookID = ?', [req.params.id]);
        Response.success(res, null, '教材删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 教学统计 ====================

// 课时统计
router.get('/statistics', authMiddleware, async (req, res, next) => {
    try {
        const { year = '', semester = '' } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (year) {
            whereClause += ' AND AcademicYear = ?';
            params.push(year);
        }

        if (semester) {
            whereClause += ' AND Semester = ?';
            params.push(semester);
        }

        // 按教师统计课时
        const teacherStats = await query(
            `SELECT TeacherID, TeacherName, SUM(Hours) as totalHours, COUNT(*) as courseCount
             FROM TeachingTask
             ${whereClause}
             GROUP BY TeacherID, TeacherName
             ORDER BY totalHours DESC`,
            params
        );

        // 总体统计
        const summary = await query(
            `SELECT SUM(Hours) as totalHours, COUNT(DISTINCT TeacherID) as teacherCount,
                    COUNT(*) as taskCount
             FROM TeachingTask
             ${whereClause}`,
            params
        );

        Response.success(res, {
            teacherStats,
            summary: summary[0]
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

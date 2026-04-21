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

// ==================== 学生选课 ====================

// 获取可选课程列表（当前学期的教学任务）
router.get('/available-courses', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', semester = '' } = req.query;
        const offset = (page - 1) * pageSize;
        const studentId = req.user.userId;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (t.CourseName LIKE ? OR t.CourseCode LIKE ? OR t.TeacherName LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        if (semester) {
            whereClause += ' AND t.Semester = ?';
            params.push(semester);
        }

        // 排除已选课程（只排除状态为 enrolled 的，dropped 的记录已被删除，completed 的可以重新选）
        whereClause += ` AND t.TaskID NOT IN (
            SELECT TaskID FROM CourseEnrollment 
            WHERE StudentID = ? AND Status = 'enrolled'
        )`;
        params.push(studentId);

        const countResult = await query(
            `SELECT COUNT(*) as total FROM TeachingTask t ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT t.*, u.RealName as CreatorName,
                (SELECT COUNT(*) FROM CourseEnrollment ce WHERE ce.TaskID = t.TaskID AND ce.Status = 'enrolled') as enrolledCount
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

// 学生选课
router.post('/enroll', authMiddleware, async (req, res, next) => {
    try {
        const { taskId } = req.body;
        const studentId = req.user.userId;
        const studentName = req.user.realName;

        if (!taskId) {
            return Response.error(res, '请选择要报名的课程', 400);
        }

        // 检查课程是否存在
        const tasks = await query(
            'SELECT * FROM TeachingTask WHERE TaskID = ?',
            [taskId]
        );

        if (tasks.length === 0) {
            return Response.error(res, '课程不存在', 404);
        }

        const task = tasks[0];

        // 检查是否已选（只检查 enrolled 状态，dropped 的记录已被删除）
        const existing = await query(
            'SELECT * FROM CourseEnrollment WHERE StudentID = ? AND TaskID = ? AND Status = "enrolled"',
            [studentId, taskId]
        );

        if (existing.length > 0) {
            return Response.error(res, '您已经选过这门课程了', 400);
        }

        // 创建选课记录
        const result = await query(
            `INSERT INTO CourseEnrollment (StudentID, StudentName, TaskID, CourseName, TeacherName, Semester, AcademicYear, Status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'enrolled')`,
            [studentId, studentName, taskId, task.CourseName, task.TeacherName, task.Semester, task.AcademicYear]
        );

        Response.success(res, { enrollmentId: result.insertId }, '选课成功');
    } catch (error) {
        next(error);
    }
});

// 获取我的选课列表
router.get('/my-courses', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, status = '' } = req.query;
        const offset = (page - 1) * pageSize;
        const studentId = req.user.userId;

        let whereClause = 'WHERE ce.StudentID = ?';
        const params = [studentId];

        if (status) {
            whereClause += ' AND ce.Status = ?';
            params.push(status);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM CourseEnrollment ce ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT ce.*, t.CourseCode, t.Hours, t.Credits, t.TeacherID
             FROM CourseEnrollment ce
             LEFT JOIN TeachingTask t ON ce.TaskID = t.TaskID
             ${whereClause}
             ORDER BY ce.EnrollTime DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 退课
router.post('/drop/:id', authMiddleware, async (req, res, next) => {
    try {
        const studentId = req.user.userId;
        const enrollmentId = req.params.id;

        // 检查选课记录是否存在且属于当前学生
        const enrollments = await query(
            'SELECT * FROM CourseEnrollment WHERE EnrollmentID = ? AND StudentID = ?',
            [enrollmentId, studentId]
        );

        if (enrollments.length === 0) {
            return Response.error(res, '选课记录不存在', 404);
        }

        const enrollment = enrollments[0];
        if (enrollment.Status === 'dropped') {
            return Response.error(res, '该课程已退课', 400);
        }

        if (enrollment.Status === 'completed') {
            return Response.error(res, '已完成的课程不能退课', 400);
        }

        // 直接删除选课记录，让学生可以重新选课
        await query(
            'DELETE FROM CourseEnrollment WHERE EnrollmentID = ?',
            [enrollmentId]
        );

        Response.success(res, null, '退课成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 教师/管理端：查看选课学生 ====================

// 获取某课程的学生列表
router.get('/course-students/:taskId', authMiddleware, async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const { page = 1, pageSize = 10 } = req.query;
        const offset = (page - 1) * pageSize;
        const userId = req.user.userId;
        const role = req.user.role;

        // 检查权限：教师只能看自己课程的选课学生
        if (role === 'teacher') {
            const tasks = await query(
                'SELECT * FROM TeachingTask WHERE TaskID = ? AND TeacherID = ?',
                [taskId, userId]
            );
            if (tasks.length === 0) {
                return Response.error(res, '无权查看此课程的选课学生', 403);
            }
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM CourseEnrollment WHERE TaskID = ? AND Status = 'enrolled'`,
            [taskId]
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT ce.*, u.Phone, u.Email
             FROM CourseEnrollment ce
             LEFT JOIN User u ON ce.StudentID = u.UserID
             WHERE ce.TaskID = ? AND ce.Status = 'enrolled'
             ORDER BY ce.EnrollTime DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            [taskId]
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 获取选课统计（教师/管理员）
router.get('/statistics', authMiddleware, async (req, res, next) => {
    try {
        const { semester = '', academicYear = '' } = req.query;
        const userId = req.user.userId;
        const role = req.user.role;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (semester) {
            whereClause += ' AND ce.Semester = ?';
            params.push(semester);
        }

        if (academicYear) {
            whereClause += ' AND ce.AcademicYear = ?';
            params.push(academicYear);
        }

        // 教师只能看自己的课程统计
        if (role === 'teacher') {
            whereClause += ' AND t.TeacherID = ?';
            params.push(userId);
        }

        // 按课程统计
        const courseStats = await query(
            `SELECT t.TaskID, t.CourseName, t.TeacherName, t.Semester, t.AcademicYear,
                    COUNT(CASE WHEN ce.Status = 'enrolled' THEN 1 END) as enrolledCount,
                    COUNT(CASE WHEN ce.Status = 'completed' THEN 1 END) as completedCount,
                    COUNT(CASE WHEN ce.Status = 'dropped' THEN 1 END) as droppedCount
             FROM TeachingTask t
             LEFT JOIN CourseEnrollment ce ON t.TaskID = ce.TaskID
             ${whereClause}
             GROUP BY t.TaskID, t.CourseName, t.TeacherName, t.Semester, t.AcademicYear
             ORDER BY t.Semester DESC, enrolledCount DESC`,
            params
        );

        // 总体统计
        const summary = await query(
            `SELECT 
                COUNT(DISTINCT CASE WHEN ce.Status = 'enrolled' THEN ce.StudentID END) as totalEnrolledStudents,
                COUNT(DISTINCT t.TaskID) as totalCourses,
                COUNT(CASE WHEN ce.Status = 'enrolled' THEN 1 END) as totalEnrollments
             FROM TeachingTask t
             LEFT JOIN CourseEnrollment ce ON t.TaskID = ce.TaskID
             ${whereClause}`,
            params
        );

        Response.success(res, {
            courseStats,
            summary: summary[0]
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

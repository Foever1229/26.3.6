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

// ==================== 学生信息 ====================

// 获取学生列表
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', major = '', grade = '', className = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (Name LIKE ? OR StuNo LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        if (major) {
            whereClause += ' AND Major = ?';
            params.push(major);
        }

        if (grade) {
            whereClause += ' AND Grade = ?';
            params.push(grade);
        }

        if (className) {
            whereClause += ' AND Class = ?';
            params.push(className);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM StudentInfo ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT * FROM StudentInfo ${whereClause} ORDER BY Grade DESC, Major, Class, StuNo LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 获取单个学生
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        const students = await query(
            'SELECT * FROM StudentInfo WHERE StudentID = ?',
            [req.params.id]
        );

        if (students.length === 0) {
            return Response.error(res, '学生不存在', 404);
        }

        Response.success(res, students[0]);
    } catch (error) {
        next(error);
    }
});

// 创建学生
router.post('/', authMiddleware, async (req, res, next) => {
    try {
        console.log('创建学生 - 请求体:', req.body);
        
        // 兼容前端字段名（大写开头）
        const stuNo = req.body.stuNo || req.body.StuNo;
        const name = req.body.name || req.body.Name;
        const gender = req.body.gender || req.body.Gender;
        const major = req.body.major || req.body.Major;
        const grade = req.body.grade || req.body.Grade;
        const className = req.body.className || req.body.Class;
        const credits = req.body.credits || req.body.Credits;
        const rank = req.body.rank || req.body.Rank;
        const phone = req.body.phone || req.body.Phone;
        const email = req.body.email || req.body.Email;

        console.log('提取的字段:', { stuNo, name, major, grade });

        if (!stuNo || !name || !major || !grade) {
            return Response.error(res, '学号、姓名、专业和年级不能为空', 400);
        }

        const result = await query(
            `INSERT INTO StudentInfo (StuNo, Name, Gender, Major, Grade, Class, Credits, \`Rank\`, Phone, Email)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [stuNo, name, gender, major, grade, className, credits, rank, phone, email]
        );

        Response.success(res, { studentId: result.insertId }, '学生添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新学生（仅admin和office可修改）
router.put('/:id', authMiddleware, async (req, res, next) => {
    try {
        const role = req.user.role;
        if (role !== 'admin' && role !== 'office') {
            return Response.error(res, '无权修改学生信息', 403);
        }

        // 兼容前端字段名（大写开头）
        const stuNo = req.body.stuNo || req.body.StuNo;
        const name = req.body.name || req.body.Name;
        const gender = req.body.gender || req.body.Gender;
        const major = req.body.major || req.body.Major;
        const grade = req.body.grade || req.body.Grade;
        const className = req.body.className || req.body.Class;
        const credits = req.body.credits || req.body.Credits;
        const rank = req.body.rank || req.body.Rank;
        const phone = req.body.phone || req.body.Phone;
        const email = req.body.email || req.body.Email;

        // 验证必填字段
        if (!stuNo) {
            return Response.error(res, '学号不能为空', 400);
        }
        if (!name) {
            return Response.error(res, '姓名不能为空', 400);
        }
        if (!major) {
            return Response.error(res, '专业不能为空', 400);
        }
        if (!grade) {
            return Response.error(res, '年级不能为空', 400);
        }

        await query(
            `UPDATE StudentInfo SET StuNo = ?, Name = ?, Gender = ?, Major = ?, Grade = ?,
             Class = ?, Credits = ?, \`Rank\` = ?, Phone = ?, Email = ?
             WHERE StudentID = ?`,
            [stuNo, name, gender, major, grade, className, credits || 0, rank || null, phone || null, email || null, req.params.id]
        );

        Response.success(res, null, '学生更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除学生（仅admin和office可删除）
router.delete('/:id', authMiddleware, async (req, res, next) => {
    try {
        const role = req.user.role;
        if (role !== 'admin' && role !== 'office') {
            return Response.error(res, '无权删除学生信息', 403);
        }

        await query('DELETE FROM StudentInfo WHERE StudentID = ?', [req.params.id]);
        Response.success(res, null, '学生删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 竞赛获奖 ====================

// 获取竞赛获奖列表
router.get('/awards/list', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', level = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND CompetitionName LIKE ?';
            params.push(`%${keyword}%`);
        }

        if (level) {
            whereClause += ' AND Level = ?';
            params.push(level);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM CompetitionAward ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT c.*, u.RealName as CreatorName
             FROM CompetitionAward c
             LEFT JOIN User u ON c.UserID = u.UserID
             ${whereClause}
             ORDER BY c.AwardDate DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建竞赛获奖
router.post('/awards', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const competitionName = req.body.competitionName || req.body.CompetitionName;
        const level = req.body.level || req.body.Level;
        const awardGrade = req.body.awardGrade || req.body.AwardGrade;
        const winnerNames = req.body.winnerNames || req.body.WinnerNames;
        const advisor1 = req.body.advisor1 || req.body.Advisor1;
        const advisorDept1 = req.body.advisorDept1 || req.body.AdvisorDept1;
        const awardDate = req.body.awardDate || req.body.AwardDate;

        // 验证必填字段
        if (!competitionName) {
            return Response.error(res, '竞赛名称不能为空', 400);
        }
        if (!level) {
            return Response.error(res, '竞赛级别不能为空', 400);
        }
        if (!awardGrade) {
            return Response.error(res, '获奖等级不能为空', 400);
        }
        if (!winnerNames) {
            return Response.error(res, '获奖人不能为空', 400);
        }

        const result = await query(
            `INSERT INTO CompetitionAward (CompetitionName, Level, AwardGrade, WinnerNames,
             Advisor1, AdvisorDept1, AwardDate, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [competitionName, level, awardGrade, winnerNames, advisor1 || null, advisorDept1 || null, awardDate || null, req.user.userId]
        );

        Response.success(res, { awardId: result.insertId }, '竞赛获奖添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新竞赛获奖
router.put('/awards/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canEditAll = role === 'admin' || role === 'office';
        const canEditOwn = role === 'teacher' || role === 'student';

        // 先检查权限
        if (!canEditAll && !canEditOwn) {
            return Response.error(res, '无权修改此竞赛获奖', 403);
        }

        // 如果不是管理员/教务，检查具体权限
        if (!canEditAll) {
            const awards = await query(
                `SELECT c.*, u.RealName as CreatorName FROM CompetitionAward c
                 LEFT JOIN User u ON c.UserID = u.UserID
                 WHERE c.AwardID = ?`,
                [req.params.id]
            );
            if (awards.length === 0) {
                return Response.error(res, '记录不存在', 404);
            }
            const award = awards[0];
            // 教师只能修改自己指导的，学生只能修改自己获奖的
            if (role === 'teacher' && award.Advisor1 !== req.user.realName) {
                return Response.error(res, '只能修改自己指导的竞赛获奖', 403);
            }
            if (role === 'student' && (!award.WinnerNames || !award.WinnerNames.includes(req.user.realName))) {
                return Response.error(res, '只能修改自己的竞赛获奖', 403);
            }
        }

        // 兼容前端字段名（大写开头）
        const competitionName = req.body.competitionName || req.body.CompetitionName;
        const level = req.body.level || req.body.Level;
        const awardGrade = req.body.awardGrade || req.body.AwardGrade;
        const winnerNames = req.body.winnerNames || req.body.WinnerNames;
        const advisor1 = req.body.advisor1 || req.body.Advisor1;
        const advisorDept1 = req.body.advisorDept1 || req.body.AdvisorDept1;
        const awardDate = req.body.awardDate || req.body.AwardDate;

        // 验证必填字段
        if (!competitionName) {
            return Response.error(res, '竞赛名称不能为空', 400);
        }
        if (!level) {
            return Response.error(res, '竞赛级别不能为空', 400);
        }
        if (!awardGrade) {
            return Response.error(res, '获奖等级不能为空', 400);
        }
        if (!winnerNames) {
            return Response.error(res, '获奖人不能为空', 400);
        }

        await query(
            `UPDATE CompetitionAward SET CompetitionName = ?, Level = ?, AwardGrade = ?,
             WinnerNames = ?, Advisor1 = ?, AdvisorDept1 = ?, AwardDate = ?
             WHERE AwardID = ?`,
            [competitionName, level, awardGrade, winnerNames, advisor1 || null, advisorDept1 || null, awardDate || null, req.params.id]
        );

        Response.success(res, null, '竞赛获奖更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除竞赛获奖
router.delete('/awards/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canDeleteAll = role === 'admin' || role === 'office';
        const canDeleteOwn = role === 'teacher' || role === 'student';

        // 先检查权限
        if (!canDeleteAll && !canDeleteOwn) {
            return Response.error(res, '无权删除此竞赛获奖', 403);
        }

        // 如果不是管理员/教务，检查具体权限
        if (!canDeleteAll) {
            const awards = await query(
                `SELECT c.*, u.RealName as CreatorName FROM CompetitionAward c
                 LEFT JOIN User u ON c.UserID = u.UserID
                 WHERE c.AwardID = ?`,
                [req.params.id]
            );
            if (awards.length === 0) {
                return Response.error(res, '记录不存在', 404);
            }
            const award = awards[0];
            // 教师只能删除自己指导的，学生只能删除自己获奖的
            if (role === 'teacher' && award.Advisor1 !== req.user.realName) {
                return Response.error(res, '只能删除自己指导的竞赛获奖', 403);
            }
            if (role === 'student' && (!award.WinnerNames || !award.WinnerNames.includes(req.user.realName))) {
                return Response.error(res, '只能删除自己的竞赛获奖', 403);
            }
        }

        await query('DELETE FROM CompetitionAward WHERE AwardID = ?', [req.params.id]);
        Response.success(res, null, '竞赛获奖删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 大创项目 ====================

// 获取大创项目列表
router.get('/innovations/list', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', level = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND ProjectName LIKE ?';
            params.push(`%${keyword}%`);
        }

        if (level) {
            whereClause += ' AND Level = ?';
            params.push(level);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM InnovationProject ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT i.*, u.RealName as CreatorName
             FROM InnovationProject i
             LEFT JOIN User u ON i.UserID = u.UserID
             ${whereClause}
             ORDER BY i.StartTime DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建大创项目
router.post('/innovations', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const projectName = req.body.projectName || req.body.ProjectName;
        const level = req.body.level || req.body.Level;
        const leaderName = req.body.leaderName || req.body.LeaderName;
        const memberNames = req.body.memberNames || req.body.MemberNames;
        const advisor = req.body.advisor || req.body.Advisor;
        const startTime = req.body.startTime || req.body.StartTime;
        const endTime = req.body.endTime || req.body.EndTime;
        const funding = req.body.funding || req.body.Funding;

        // 验证必填字段
        if (!projectName) {
            return Response.error(res, '项目名称不能为空', 400);
        }
        if (!level) {
            return Response.error(res, '项目级别不能为空', 400);
        }
        if (!leaderName) {
            return Response.error(res, '负责人姓名不能为空', 400);
        }

        const result = await query(
            `INSERT INTO InnovationProject (ProjectName, Level, LeaderName, MemberNames,
             Advisor, StartTime, EndTime, Funding, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectName, level, leaderName, memberNames || null, advisor || null, startTime || null, endTime || null, funding || 0, req.user.userId]
        );

        Response.success(res, { projectId: result.insertId }, '大创项目添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新大创项目
router.put('/innovations/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canEditAll = role === 'admin' || role === 'office';
        const canEditOwn = role === 'teacher' || role === 'student';

        // 先检查权限
        if (!canEditAll && !canEditOwn) {
            return Response.error(res, '无权修改此大创项目', 403);
        }

        // 如果不是管理员/教务，检查具体权限
        if (!canEditAll) {
            const projects = await query(
                `SELECT i.*, u.RealName as CreatorName FROM InnovationProject i
                 LEFT JOIN User u ON i.UserID = u.UserID
                 WHERE i.ProjectID = ?`,
                [req.params.id]
            );
            if (projects.length === 0) {
                return Response.error(res, '记录不存在', 404);
            }
            const project = projects[0];
            // 教师只能修改自己指导的，学生只能修改自己负责的
            if (role === 'teacher' && project.Advisor !== req.user.realName) {
                return Response.error(res, '只能修改自己指导的大创项目', 403);
            }
            if (role === 'student' && project.LeaderName !== req.user.realName) {
                return Response.error(res, '只能修改自己负责的大创项目', 403);
            }
        }

        // 兼容前端字段名（大写开头）
        const projectName = req.body.projectName || req.body.ProjectName;
        const level = req.body.level || req.body.Level;
        const leaderName = req.body.leaderName || req.body.LeaderName;
        const memberNames = req.body.memberNames || req.body.MemberNames;
        const advisor = req.body.advisor || req.body.Advisor;
        const startTime = req.body.startTime || req.body.StartTime;
        const endTime = req.body.endTime || req.body.EndTime;
        const funding = req.body.funding || req.body.Funding;

        // 验证必填字段
        if (!projectName) {
            return Response.error(res, '项目名称不能为空', 400);
        }
        if (!level) {
            return Response.error(res, '项目级别不能为空', 400);
        }
        if (!leaderName) {
            return Response.error(res, '负责人姓名不能为空', 400);
        }

        await query(
            `UPDATE InnovationProject SET ProjectName = ?, Level = ?, LeaderName = ?,
             MemberNames = ?, Advisor = ?, StartTime = ?, EndTime = ?, Funding = ?
             WHERE ProjectID = ?`,
            [projectName, level, leaderName, memberNames || null, advisor || null, startTime || null, endTime || null, funding || 0, req.params.id]
        );

        Response.success(res, null, '大创项目更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除大创项目
router.delete('/innovations/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canDeleteAll = role === 'admin' || role === 'office';
        const canDeleteOwn = role === 'teacher' || role === 'student';

        // 先检查权限
        if (!canDeleteAll && !canDeleteOwn) {
            return Response.error(res, '无权删除此大创项目', 403);
        }

        // 如果不是管理员/教务，检查具体权限
        if (!canDeleteAll) {
            const projects = await query(
                `SELECT i.*, u.RealName as CreatorName FROM InnovationProject i
                 LEFT JOIN User u ON i.UserID = u.UserID
                 WHERE i.ProjectID = ?`,
                [req.params.id]
            );
            if (projects.length === 0) {
                return Response.error(res, '记录不存在', 404);
            }
            const project = projects[0];
            // 教师只能删除自己指导的，学生只能删除自己负责的
            if (role === 'teacher' && project.Advisor !== req.user.realName) {
                return Response.error(res, '只能删除自己指导的大创项目', 403);
            }
            if (role === 'student' && project.LeaderName !== req.user.realName) {
                return Response.error(res, '只能删除自己负责的大创项目', 403);
            }
        }

        await query('DELETE FROM InnovationProject WHERE ProjectID = ?', [req.params.id]);
        Response.success(res, null, '大创项目删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 学生统计 ====================

// 学生统计
router.get('/statistics/overview', authMiddleware, async (req, res, next) => {
    try {
        // 按专业统计
        const majorStats = await query(
            `SELECT Major, COUNT(*) as count, AVG(Credits) as avgCredits
             FROM StudentInfo
             GROUP BY Major
             ORDER BY count DESC`
        );

        // 按年级统计
        const gradeStats = await query(
            `SELECT Grade, COUNT(*) as count
             FROM StudentInfo
             GROUP BY Grade
             ORDER BY Grade DESC`
        );

        // 总体统计
        const summary = await query(
            `SELECT COUNT(*) as totalStudents,
                    COUNT(DISTINCT Major) as majorCount,
                    AVG(Credits) as avgCredits
             FROM StudentInfo`
        );

        // 竞赛统计
        const awardStats = await query(
            `SELECT Level, COUNT(*) as count
             FROM CompetitionAward
             GROUP BY Level`
        );

        Response.success(res, {
            majorStats,
            gradeStats,
            summary: summary[0],
            awardStats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

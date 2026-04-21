const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Response = require('../utils/response');
const { authMiddleware } = require('../middleware/auth');


// 辅助函数：执行SQL查询
const query = async (sql, params) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('SQL执行错误:', error.message);
        console.error('SQL:', sql);
        console.error('参数:', params);
        throw error;
    }
};

// ==================== 科研论文 ====================

// 获取论文列表
router.get('/papers', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', indexType = '', zone = '', year = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (Title LIKE ? OR Author LIKE ? OR Journal LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        if (indexType) {
            whereClause += ' AND IndexType = ?';
            params.push(indexType);
        }

        if (zone) {
            whereClause += ' AND Zone = ?';
            params.push(zone);
        }

        if (year) {
            whereClause += ' AND YEAR(PublishDate) = ?';
            params.push(year);
        }

        // 教师可以查看所有数据，不需要限制

        const countResult = await query(
            `SELECT COUNT(*) as total FROM ResearchPaper ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT p.*, u.RealName as CreatorName
             FROM ResearchPaper p
             LEFT JOIN User u ON p.UserID = u.UserID
             ${whereClause}
             ORDER BY p.PublishDate DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 获取单个论文
router.get('/papers/:id', authMiddleware, async (req, res, next) => {
    try {
        const papers = await query(
            `SELECT p.*, u.RealName as CreatorName
             FROM ResearchPaper p
             LEFT JOIN User u ON p.UserID = u.UserID
             WHERE p.PaperID = ?`,
            [req.params.id]
        );

        if (papers.length === 0) {
            return Response.error(res, '论文不存在', 404);
        }

        Response.success(res, papers[0]);
    } catch (error) {
        next(error);
    }
});

// 创建论文
router.post('/papers', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const title = req.body.title || req.body.Title;
        const author = req.body.author || req.body.Author;
        const firstAuthorId = req.body.firstAuthorId || req.body.FirstAuthorID;
        const correspondingAuthorId = req.body.correspondingAuthorId || req.body.CorrespondingAuthorID;
        const journal = req.body.journal || req.body.Journal;
        const indexType = req.body.indexType || req.body.IndexType;
        const zone = req.body.zone || req.body.Zone;
        const publishDate = req.body.publishDate || req.body.PublishDate;
        const doi = req.body.doi || req.body.DOI;
        const fundProject = req.body.fundProject || req.body.FundProject;

        // 将所有 undefined 转为 null
        const params = [
            title || null,
            author || null,
            firstAuthorId || null,
            correspondingAuthorId || null,
            journal || null,
            indexType || null,
            zone || null,
            publishDate || null,
            doi || null,
            fundProject || null,
            req.user.userId
        ];

        const result = await query(
            `INSERT INTO ResearchPaper (Title, Author, FirstAuthorID, CorrespondingAuthorID, 
             Journal, IndexType, Zone, PublishDate, DOI, FundProject, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params
        );

        Response.success(res, { paperId: result.insertId }, '论文添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新论文
router.put('/papers/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canEditAll = role === 'admin' || role === 'office';
        const canEditOwn = role === 'teacher';

        // 先检查权限
        if (!canEditAll && !canEditOwn) {
            return Response.error(res, '无权修改此论文', 403);
        }

        // 如果不是管理员/教务，只能修改自己的（通过Author字段对比RealName）
        if (!canEditAll && canEditOwn) {
            const papers = await query(
                `SELECT p.*, u.RealName as CreatorName FROM ResearchPaper p
                 LEFT JOIN User u ON p.UserID = u.UserID
                 WHERE p.PaperID = ? AND (p.Author LIKE ? OR u.RealName = ?)`,
                [req.params.id, `%${req.user.realName}%`, req.user.realName]
            );
            if (papers.length === 0) {
                return Response.error(res, '只能修改自己的论文', 403);
            }
        }

        // 兼容前端字段名（大写开头）
        const title = req.body.title || req.body.Title;
        const author = req.body.author || req.body.Author;
        const firstAuthorId = req.body.firstAuthorId || req.body.FirstAuthorID;
        const correspondingAuthorId = req.body.correspondingAuthorId || req.body.CorrespondingAuthorID;
        const journal = req.body.journal || req.body.Journal;
        const indexType = req.body.indexType || req.body.IndexType;
        const zone = req.body.zone || req.body.Zone;
        const publishDate = req.body.publishDate || req.body.PublishDate;
        const doi = req.body.doi || req.body.DOI;
        const fundProject = req.body.fundProject || req.body.FundProject;

        // 验证必填字段
        if (!title) {
            return Response.error(res, '论文标题不能为空', 400);
        }
        if (!author) {
            return Response.error(res, '作者不能为空', 400);
        }
        if (!journal) {
            return Response.error(res, '期刊名称不能为空', 400);
        }
        if (!publishDate) {
            return Response.error(res, '发表日期不能为空', 400);
        }

        await query(
            `UPDATE ResearchPaper SET Title = ?, Author = ?, FirstAuthorID = ?,
             CorrespondingAuthorID = ?, Journal = ?, IndexType = ?, Zone = ?,
             PublishDate = ?, DOI = ?, FundProject = ?
             WHERE PaperID = ?`,
            [title, author, firstAuthorId || null, correspondingAuthorId || null, journal,
             indexType || null, zone || null, publishDate, doi || null, fundProject || null, req.params.id]
        );

        Response.success(res, null, '论文更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除论文
router.delete('/papers/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canDeleteAll = role === 'admin' || role === 'office';
        const canDeleteOwn = role === 'teacher';

        // 先检查权限
        if (!canDeleteAll && !canDeleteOwn) {
            return Response.error(res, '无权删除此论文', 403);
        }

        // 如果不是管理员/教务，只能删除自己的（通过Author字段对比RealName）
        if (!canDeleteAll && canDeleteOwn) {
            const papers = await query(
                `SELECT p.*, u.RealName as CreatorName FROM ResearchPaper p
                 LEFT JOIN User u ON p.UserID = u.UserID
                 WHERE p.PaperID = ? AND (p.Author LIKE ? OR u.RealName = ?)`,
                [req.params.id, `%${req.user.realName}%`, req.user.realName]
            );
            if (papers.length === 0) {
                return Response.error(res, '只能删除自己的论文', 403);
            }
        }

        await query('DELETE FROM ResearchPaper WHERE PaperID = ?', [req.params.id]);
        Response.success(res, null, '论文删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 科研项目 ====================

// 获取项目列表
router.get('/projects', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, keyword = '', projectType = '', status = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (keyword) {
            whereClause += ' AND (ProjectName LIKE ? OR ProjectCode LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        if (projectType) {
            whereClause += ' AND ProjectType = ?';
            params.push(projectType);
        }

        if (status) {
            whereClause += ' AND Status = ?';
            params.push(status);
        }

        // 教师可以查看所有项目，不需要限制

        const countResult = await query(
            `SELECT COUNT(*) as total FROM ResearchProject ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT p.*, u.RealName as CreatorName
             FROM ResearchProject p
             LEFT JOIN User u ON p.UserID = u.UserID
             ${whereClause}
             ORDER BY p.CreateTime DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建项目
router.post('/projects', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const projectName = req.body.projectName || req.body.ProjectName;
        const projectCode = req.body.projectCode || req.body.ProjectCode;
        const projectType = req.body.projectType || req.body.ProjectType;
        const projectLevel = req.body.projectLevel || req.body.ProjectLevel;
        const source = req.body.source || req.body.Source;
        const leaderId = req.body.leaderId || req.body.LeaderID;
        const leaderName = req.body.leaderName || req.body.LeaderName;
        const memberNames = req.body.memberNames || req.body.MemberNames;
        const startDate = req.body.startDate || req.body.StartDate;
        const endDate = req.body.endDate || req.body.EndDate;
        const totalFunding = req.body.totalFunding || req.body.TotalFunding;
        const status = req.body.status || req.body.Status;
        const achievement = req.body.achievement || req.body.Achievement;

        // 验证必填字段
        if (!projectName) {
            return Response.error(res, '项目名称不能为空', 400);
        }
        if (!projectType) {
            return Response.error(res, '项目类型不能为空', 400);
        }
        if (!leaderName) {
            return Response.error(res, '负责人姓名不能为空', 400);
        }

        // 如果没有提供LeaderID，使用当前用户ID
        const finalLeaderId = leaderId || req.user.userId;

        // 确保 TotalFunding 是数字
        const fundingValue = totalFunding ? parseFloat(totalFunding) : 0;

        const result = await query(
            `INSERT INTO ResearchProject (ProjectName, ProjectCode, ProjectType, ProjectLevel,
             Source, LeaderID, LeaderName, MemberNames, StartDate, EndDate,
             TotalFunding, Status, Achievement, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectName || null, projectCode || null, projectType || null, projectLevel || null, source || null,
             finalLeaderId, leaderName || null, memberNames || null, startDate || null, endDate || null,
             fundingValue, status || '进行中', achievement || null, req.user.userId]
        );

        Response.success(res, { projectId: result.insertId }, '项目添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新项目
router.put('/projects/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canEditAll = role === 'admin' || role === 'office';
        const canEditOwn = role === 'teacher';

        // 先检查权限
        if (!canEditAll && !canEditOwn) {
            return Response.error(res, '无权修改此项目', 403);
        }

        // 如果不是管理员/教务，只能修改自己的（通过LeaderName对比RealName）
        if (!canEditAll && canEditOwn) {
            const projects = await query(
                `SELECT p.*, u.RealName as CreatorName FROM ResearchProject p
                 LEFT JOIN User u ON p.UserID = u.UserID
                 WHERE p.ProjectID = ? AND (p.LeaderName = ? OR u.RealName = ?)`,
                [req.params.id, req.user.realName, req.user.realName]
            );
            if (projects.length === 0) {
                return Response.error(res, '只能修改自己的项目', 403);
            }
        }

        // 兼容前端字段名（大写开头）
        const projectName = req.body.projectName || req.body.ProjectName;
        const projectCode = req.body.projectCode || req.body.ProjectCode;
        const projectType = req.body.projectType || req.body.ProjectType;
        const projectLevel = req.body.projectLevel || req.body.ProjectLevel;
        const source = req.body.source || req.body.Source;
        const leaderId = req.body.leaderId || req.body.LeaderID;
        const leaderName = req.body.leaderName || req.body.LeaderName;
        const memberNames = req.body.memberNames || req.body.MemberNames;
        const startDate = req.body.startDate || req.body.StartDate;
        const endDate = req.body.endDate || req.body.EndDate;
        const totalFunding = req.body.totalFunding || req.body.TotalFunding;
        const status = req.body.status || req.body.Status;
        const achievement = req.body.achievement || req.body.Achievement;

        // 验证必填字段
        if (!projectName) {
            return Response.error(res, '项目名称不能为空', 400);
        }
        if (!projectType) {
            return Response.error(res, '项目类型不能为空', 400);
        }
        if (!leaderName) {
            return Response.error(res, '负责人姓名不能为空', 400);
        }

        // 如果没有提供LeaderID，使用当前用户ID
        const finalLeaderId = leaderId || req.user.userId;

        // 确保 TotalFunding 是数字
        const fundingValue = totalFunding ? parseFloat(totalFunding) : 0;

        await query(
            `UPDATE ResearchProject SET ProjectName = ?, ProjectCode = ?, ProjectType = ?,
             ProjectLevel = ?, Source = ?, LeaderID = ?, LeaderName = ?, MemberNames = ?,
             StartDate = ?, EndDate = ?, TotalFunding = ?, Status = ?, Achievement = ?
             WHERE ProjectID = ?`,
            [projectName || null, projectCode || null, projectType || null, projectLevel || null, source || null,
             finalLeaderId, leaderName || null, memberNames || null, startDate || null, endDate || null,
             fundingValue, status || '进行中', achievement || null, req.params.id]
        );

        Response.success(res, null, '项目更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除项目
router.delete('/projects/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        const canDeleteAll = role === 'admin' || role === 'office';
        const canDeleteOwn = role === 'teacher';

        // 先检查权限
        if (!canDeleteAll && !canDeleteOwn) {
            return Response.error(res, '无权删除此项目', 403);
        }

        // 如果不是管理员/教务，只能删除自己的（通过LeaderName对比RealName）
        if (!canDeleteAll && canDeleteOwn) {
            const projects = await query(
                `SELECT p.*, u.RealName as CreatorName FROM ResearchProject p
                 LEFT JOIN User u ON p.UserID = u.UserID
                 WHERE p.ProjectID = ? AND (p.LeaderName = ? OR u.RealName = ?)`,
                [req.params.id, req.user.realName, req.user.realName]
            );
            if (projects.length === 0) {
                return Response.error(res, '只能删除自己的项目', 403);
            }
        }

        await query('DELETE FROM ResearchProject WHERE ProjectID = ?', [req.params.id]);
        Response.success(res, null, '项目删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 科研经费 ====================

// 获取经费列表
router.get('/funding', authMiddleware, async (req, res, next) => {
    try {
        const { page = 1, pageSize = 10, year = '', fundingType = '' } = req.query;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (year) {
            whereClause += ' AND f.Year = ?';
            params.push(year);
        }

        if (fundingType) {
            whereClause += ' AND f.FundingType = ?';
            params.push(fundingType);
        }

        const countResult = await query(
            `SELECT COUNT(*) as total FROM ResearchFunding f ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        const rows = await query(
            `SELECT f.*, p.ProjectName, u.RealName as CreatorName
             FROM ResearchFunding f
             LEFT JOIN ResearchProject p ON f.ProjectID = p.ProjectID
             LEFT JOIN User u ON f.UserID = u.UserID
             ${whereClause}
             ORDER BY f.Year DESC
             LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`,
            params
        );

        Response.page(res, rows, { page: parseInt(page), pageSize: parseInt(pageSize), total });
    } catch (error) {
        next(error);
    }
});

// 创建经费记录
router.post('/funding', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const projectId = req.body.projectId || req.body.ProjectID;
        const fundingType = req.body.fundingType || req.body.FundingType;
        const year = req.body.year || req.body.Year;
        const budgetAmount = req.body.budgetAmount || req.body.BudgetAmount;
        const receivedAmount = req.body.receivedAmount || req.body.ReceivedAmount;
        const expenseAmount = req.body.expenseAmount || req.body.ExpenseAmount;
        const description = req.body.description || req.body.Description;

        const result = await query(
            `INSERT INTO ResearchFunding (ProjectID, FundingType, Year, BudgetAmount,
             ReceivedAmount, ExpenseAmount, Description, UserID)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectId || null, fundingType || null, year || null, budgetAmount || 0, receivedAmount || 0, expenseAmount || 0, description || null, req.user.userId]
        );

        Response.success(res, { fundingId: result.insertId }, '经费记录添加成功');
    } catch (error) {
        next(error);
    }
});

// 更新经费记录
router.put('/funding/:id', authMiddleware, async (req, res, next) => {
    try {
        // 兼容前端字段名（大写开头）
        const projectId = req.body.projectId || req.body.ProjectID;
        const fundingType = req.body.fundingType || req.body.FundingType;
        const year = req.body.year || req.body.Year;
        const budgetAmount = req.body.budgetAmount || req.body.BudgetAmount;
        const receivedAmount = req.body.receivedAmount || req.body.ReceivedAmount;
        const expenseAmount = req.body.expenseAmount || req.body.ExpenseAmount;
        const description = req.body.description || req.body.Description;

        // 验证必填字段
        if (!fundingType) {
            return Response.error(res, '经费类型不能为空', 400);
        }
        if (!year) {
            return Response.error(res, '年度不能为空', 400);
        }

        await query(
            `UPDATE ResearchFunding SET ProjectID = ?, FundingType = ?, Year = ?,
             BudgetAmount = ?, ReceivedAmount = ?, ExpenseAmount = ?, Description = ?
             WHERE FundingID = ?`,
            [projectId || null, fundingType || null, year || null, budgetAmount || 0, receivedAmount || 0, expenseAmount || 0, description || null, req.params.id]
        );

        Response.success(res, null, '经费记录更新成功');
    } catch (error) {
        next(error);
    }
});

// 删除经费记录
router.delete('/funding/:id', authMiddleware, async (req, res, next) => {
    try {
        await query('DELETE FROM ResearchFunding WHERE FundingID = ?', [req.params.id]);
        Response.success(res, null, '经费记录删除成功');
    } catch (error) {
        next(error);
    }
});

// ==================== 数据统计 ====================

// 科研数据统计
router.get('/statistics', authMiddleware, async (req, res, next) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        // 论文统计
        const paperStats = await query(
            `SELECT IndexType, COUNT(*) as count
             FROM ResearchPaper
             WHERE YEAR(PublishDate) = ?
             GROUP BY IndexType`,
            [year]
        );

        // 项目统计
        const projectStats = await query(
            `SELECT ProjectType, COUNT(*) as count, SUM(TotalFunding) as totalFunding
             FROM ResearchProject
             WHERE YEAR(StartDate) = ? OR Status = '进行中'
             GROUP BY ProjectType`,
            [year]
        );

        // 经费统计
        const fundingStats = await query(
            `SELECT FundingType, 
                    SUM(BudgetAmount) as totalBudget,
                    SUM(ReceivedAmount) as totalReceived, 
                    SUM(ExpenseAmount) as totalExpense
             FROM ResearchFunding
             WHERE Year = ?
             GROUP BY FundingType`,
            [year]
        );

        Response.success(res, {
            paperStats,
            projectStats,
            fundingStats,
            year
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

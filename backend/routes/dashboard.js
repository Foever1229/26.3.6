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

// 数据大屏统计（所有人可查看全部数据）
router.get('/statistics', authMiddleware, async (req, res, next) => {
    try {
        const currentYear = new Date().getFullYear();
        
        // 所有用户都可以查看全部数据，不需要按用户过滤
        const userFilterPaper = '';
        const userFilterProject = '';
        const userFilterAward = '';
        const userFilterInnovation = '';
        const userFilterTask = '';
        
        const paramsPaper = [];
        const paramsProject = [];
        const paramsUser = [];
        const paramsTask = [];

        // ========== 科研统计 ==========
        // 论文总数
        const paperTotal = await query(`SELECT COUNT(*) as count FROM ResearchPaper ${userFilterPaper}`, paramsPaper);
        // 本年度论文
        const paperThisYear = await query(
            `SELECT COUNT(*) as count FROM ResearchPaper ${userFilterPaper ? userFilterPaper + ' AND' : 'WHERE'} YEAR(PublishDate) = ?`,
            [...paramsPaper, currentYear]
        );
        // SCI/EI论文数
        const paperSCI = await query(
            `SELECT COUNT(*) as count FROM ResearchPaper ${userFilterPaper ? userFilterPaper + ' AND' : 'WHERE'} IndexType = 'SCI'`,
            paramsPaper
        );
        const paperEI = await query(
            `SELECT COUNT(*) as count FROM ResearchPaper ${userFilterPaper ? userFilterPaper + ' AND' : 'WHERE'} IndexType = 'EI'`,
            paramsPaper
        );

        // 项目总数
        const projectTotal = await query(`SELECT COUNT(*) as count FROM ResearchProject ${userFilterProject}`, paramsProject);
        // 在研项目
        const projectOngoing = await query(
            `SELECT COUNT(*) as count FROM ResearchProject ${userFilterProject ? userFilterProject + ' AND' : 'WHERE'} Status = '进行中'`,
            paramsProject
        );
        // 项目总经费（ResearchProject表的TotalFunding）
        const projectFunding = await query(
            `SELECT COALESCE(SUM(TotalFunding), 0) as total FROM ResearchProject ${userFilterProject}`,
            paramsProject
        );
        
        // 科研经费（ResearchFunding表的到账金额总和）
        const researchFunding = await query(
            `SELECT COALESCE(SUM(ReceivedAmount), 0) as total FROM ResearchFunding`,
            []
        );

        // ========== 教学统计 ==========
        // 教师总数
        const teacherTotal = await query('SELECT COUNT(*) as count FROM User WHERE RoleID = 2');
        
        // 教学任务数
        const taskTotal = await query(`SELECT COUNT(*) as count FROM TeachingTask ${userFilterTask}`, paramsTask);
        // 总课时
        const hoursTotal = await query(`SELECT COALESCE(SUM(Hours), 0) as total FROM TeachingTask ${userFilterTask}`, paramsTask);
        // 课程数（所有人都能看到全部课程）
        const courseTotal = await query('SELECT COUNT(*) as count FROM Course');

        // ========== 学生统计 ==========
        // 学生总数（所有人都能看到全部学生）
        const studentTotal = await query('SELECT COUNT(*) as count FROM StudentInfo');
        // 竞赛获奖数
        const awardTotal = await query(`SELECT COUNT(*) as count FROM CompetitionAward ${userFilterAward}`, paramsUser);
        // 大创项目数
        const innovationTotal = await query(`SELECT COUNT(*) as count FROM InnovationProject ${userFilterInnovation}`, paramsUser);

        // ========== 趋势数据（最近6年） ==========
        const years = [];
        for (let i = 5; i >= 0; i--) {
            years.push(currentYear - i);
        }

        const trendData = await Promise.all(years.map(async (year) => {
            const paperCount = await query(
                `SELECT COUNT(*) as count FROM ResearchPaper ${userFilterPaper ? userFilterPaper + ' AND' : 'WHERE'} YEAR(PublishDate) = ?`,
                [...paramsPaper, year]
            );
            const projectCount = await query(
                `SELECT COUNT(*) as count FROM ResearchProject ${userFilterProject ? userFilterProject + ' AND' : 'WHERE'} YEAR(StartDate) = ?`,
                [...paramsProject, year]
            );
            return {
                year,
                papers: paperCount[0].count,
                projects: projectCount[0].count
            };
        }));

        // ========== 分布数据 ==========
        // 论文索引类型分布
        const paperIndexDist = await query(
            `SELECT IndexType as name, COUNT(*) as value FROM ResearchPaper ${userFilterPaper} GROUP BY IndexType`,
            paramsPaper
        );

        // 项目类型分布
        const projectTypeDist = await query(
            `SELECT ProjectType as name, COUNT(*) as value FROM ResearchProject ${userFilterProject} GROUP BY ProjectType`,
            paramsProject
        );

        // 学生专业分布（所有人都能看到）
        const studentMajorDist = await query(
            'SELECT Major as name, COUNT(*) as value FROM StudentInfo GROUP BY Major'
        );

        Response.success(res, {
            summary: {
                research: {
                    paperTotal: paperTotal[0].count,
                    paperThisYear: paperThisYear[0].count,
                    paperSCI: paperSCI[0].count,
                    paperEI: paperEI[0].count,
                    projectTotal: projectTotal[0].count,
                    projectOngoing: projectOngoing[0].count,
                    projectFunding: projectFunding[0].total,
                    researchFunding: researchFunding[0].total
                },
                teaching: {
                    teacherTotal: teacherTotal[0].count,
                    taskTotal: taskTotal[0].count,
                    hoursTotal: hoursTotal[0].total,
                    courseTotal: courseTotal[0].count
                },
                student: {
                    studentTotal: studentTotal[0].count,
                    awardTotal: awardTotal[0].count,
                    innovationTotal: innovationTotal[0].count
                }
            },
            trends: trendData,
            distributions: {
                paperIndex: paperIndexDist,
                projectType: projectTypeDist,
                studentMajor: studentMajorDist
            }
        });
    } catch (error) {
        next(error);
    }
});

// 获取最新动态
router.get('/activities', authMiddleware, async (req, res, next) => {
    try {
        // 最近添加的论文（使用PublishDate作为时间）
        const recentPapers = await query(
            `SELECT p.PaperID as id, p.Title as title, '论文' as type,
                    p.PublishDate as time, u.RealName as operator
             FROM ResearchPaper p
             LEFT JOIN User u ON p.UserID = u.UserID
             ORDER BY p.PublishDate DESC
             LIMIT 5`
        );

        // 最近添加的项目（使用CreateTime）
        const recentProjects = await query(
            `SELECT p.ProjectID as id, p.ProjectName as title, '科研项目' as type,
                    p.CreateTime as time, u.RealName as operator
             FROM ResearchProject p
             LEFT JOIN User u ON p.UserID = u.UserID
             ORDER BY p.CreateTime DESC
             LIMIT 5`
        );

        // 最近添加的竞赛获奖（使用AwardDate作为时间）
        const recentAwards = await query(
            `SELECT a.AwardID as id, a.CompetitionName as title, '竞赛获奖' as type,
                    a.AwardDate as time, u.RealName as operator
             FROM CompetitionAward a
             LEFT JOIN User u ON a.UserID = u.UserID
             ORDER BY a.AwardDate DESC
             LIMIT 5`
        );

        // 合并并排序（过滤掉时间为null的）
        const activities = [...recentPapers, ...recentProjects, ...recentAwards]
            .filter(a => a.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        Response.success(res, activities);
    } catch (error) {
        next(error);
    }
});

// 获取数据字典
router.get('/dictionary/:type', authMiddleware, async (req, res, next) => {
    try {
        const dicts = await query(
            'SELECT DictCode, DictName, DictValue FROM DataDictionary WHERE DictType = ? AND IsEnabled = 1 ORDER BY SortOrder',
            [req.params.type]
        );
        Response.success(res, dicts);
    } catch (error) {
        next(error);
    }
});

// 获取所有数据字典类型
router.get('/dictionary-types', authMiddleware, async (req, res, next) => {
    try {
        const types = await query(
            'SELECT DISTINCT DictType FROM DataDictionary WHERE IsEnabled = 1'
        );
        Response.success(res, types.map(t => t.DictType));
    } catch (error) {
        next(error);
    }
});

module.exports = router;

const mysql = require('mysql2/promise');

async function check() {
    try {
        const pool = mysql.createPool({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '13064004628',
            database: 'college_management'
        });
        
        const [dbResult] = await pool.query('SELECT DATABASE() as current_db');
        console.log('当前数据库:', dbResult[0].current_db);
        
        // 检查关键表的数据
        const tablesToCheck = ['user', 'role', 'department', 'studentinfo', 'researchpaper'];
        
        for (const table of tablesToCheck) {
            try {
                const [rows] = await pool.query(`SELECT COUNT(*) as count FROM \`${table}\``);
                console.log(`${table}: ${rows[0].count} 条记录`);
            } catch (e) {
                console.log(`${table}: 查询失败 - ${e.message}`);
            }
        }
        
        // 显示用户表内容
        console.log('\n--- User表内容 ---');
        const [users] = await pool.query('SELECT UserID, Username, RoleID, RealName FROM user');
        users.forEach(u => console.log(u));
        
        await pool.end();
    } catch (err) {
        console.error('错误:', err.message);
    }
}

check();

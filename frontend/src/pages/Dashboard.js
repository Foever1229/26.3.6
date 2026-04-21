import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Tag, Spin } from 'antd';
import {
    FileTextOutlined,
    ProjectOutlined,
    TeamOutlined,
    BookOutlined,
    TrophyOutlined,
    DollarOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/charts';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activities, setActivities] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
        fetchActivities();
    }, []);

    // 快捷入口跳转
    const quickActions = {
        '录入论文': () => navigate('/research/paper'),
        '录入项目': () => navigate('/research/project'),
        '录入获奖': () => navigate('/students/award'),
        '教学任务': () => navigate('/teaching/task'),
        '学生信息': () => navigate('/students/list'),
        '经费管理': () => navigate('/research/funding'),
    };

    const fetchDashboardData = async () => {
        try {
            const res = await request.get('/api/dashboard/statistics');
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const res = await request.get('/api/dashboard/activities');
            setActivities(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 100 }}>
                <Spin size="large" />
            </div>
        );
    }

    const { summary, trends, distributions } = data || {};

    // 趋势图配置
    const trendConfig = {
        data: trends || [],
        xField: 'year',
        yField: 'papers',
        seriesField: 'type',
        color: ['#1890ff', '#52c41a'], // 蓝色和绿色，更美观
        label: {
            position: 'middle',
            style: {
                fill: '#FFFFFF',
                opacity: 0.6,
            },
        },
        xAxis: {
            label: {
                autoHide: true,
                autoRotate: false,
            },
        },
        meta: {
            year: { alias: '年份' },
            papers: { alias: '论文数量' },
        },
    };

    // 饼图配置
    const pieConfig = {
        data: distributions?.paperIndex || [],
        angleField: 'value',
        colorField: 'name',
        radius: 0.8,
        label: {
            type: 'outer',
            content: '{name} {percentage}',
        },
    };

    return (
        <div className="dashboard-container">
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={4}>
                    <Card>
                        <Statistic
                            title="论文总数"
                            value={summary?.research?.paperTotal || 0}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic
                            title="科研项目"
                            value={summary?.research?.projectTotal || 0}
                            prefix={<ProjectOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic
                            title="科研经费(万)"
                            value={((summary?.research?.researchFunding || 0) / 10000).toFixed(2)}
                            prefix={<DollarOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic
                            title="教师人数"
                            value={summary?.teaching?.teacherTotal || 0}
                            prefix={<TeamOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic
                            title="学生人数"
                            value={summary?.student?.studentTotal || 0}
                            prefix={<BookOutlined />}
                            valueStyle={{ color: '#eb2f96' }}
                        />
                    </Card>
                </Col>
                <Col span={4}>
                    <Card>
                        <Statistic
                            title="竞赛获奖"
                            value={summary?.student?.awardTotal || 0}
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: '#13c2c2' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 图表区域 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={16}>
                    <Card title="科研趋势（近6年）">
                        <Column {...trendConfig} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="论文索引分布">
                        <Pie {...pieConfig} />
                    </Card>
                </Col>
            </Row>

            {/* 最新动态 */}
            <Row gutter={16}>
                <Col span={12}>
                    <Card title="最新动态">
                        <List
                            dataSource={activities}
                            renderItem={item => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={
                                            <span>
                                                <Tag color="blue">{item.type}</Tag>
                                                {item.title}
                                            </span>
                                        }
                                        description={`${item.operator} · ${new Date(item.time).toLocaleString()}`}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="快捷入口">
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <Card.Grid 
                                style={{ width: '30%', textAlign: 'center', cursor: 'pointer' }} 
                                onClick={quickActions['录入论文']}
                            >
                                <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                <div>录入论文</div>
                            </Card.Grid>
                            <Card.Grid 
                                style={{ width: '30%', textAlign: 'center', cursor: 'pointer' }} 
                                onClick={quickActions['录入项目']}
                            >
                                <ProjectOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                                <div>录入项目</div>
                            </Card.Grid>
                            <Card.Grid 
                                style={{ width: '30%', textAlign: 'center', cursor: 'pointer' }} 
                                onClick={quickActions['录入获奖']}
                            >
                                <TrophyOutlined style={{ fontSize: 24, color: '#faad14' }} />
                                <div>录入获奖</div>
                            </Card.Grid>
                            <Card.Grid 
                                style={{ width: '30%', textAlign: 'center', cursor: 'pointer' }} 
                                onClick={quickActions['教学任务']}
                            >
                                <BookOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                                <div>教学任务</div>
                            </Card.Grid>
                            <Card.Grid 
                                style={{ width: '30%', textAlign: 'center', cursor: 'pointer' }} 
                                onClick={quickActions['学生信息']}
                            >
                                <TeamOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
                                <div>学生信息</div>
                            </Card.Grid>
                            <Card.Grid 
                                style={{ width: '30%', textAlign: 'center', cursor: 'pointer' }} 
                                onClick={quickActions['经费管理']}
                            >
                                <DollarOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                                <div>经费管理</div>
                            </Card.Grid>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;

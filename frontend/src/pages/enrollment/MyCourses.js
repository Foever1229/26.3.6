import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, message, Popconfirm, Space, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import request from '../../utils/request';

const { Option } = Select;

const MyCourses = () => {
    const [loading, setLoading] = useState(false);
    const [dropping, setDropping] = useState(false);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [statusFilter, setStatusFilter] = useState('');

    const statusMap = {
        'enrolled': { text: '已选课', color: 'blue' },
        'dropped': { text: '已退课', color: 'red' },
        'completed': { text: '已完成', color: 'green' }
    };

    const columns = [
        {
            title: '课程名称',
            dataIndex: 'CourseName',
            key: 'CourseName',
            width: 200,
        },
        {
            title: '课程代码',
            dataIndex: 'CourseCode',
            key: 'CourseCode',
            width: 120,
        },
        {
            title: '教师',
            dataIndex: 'TeacherName',
            key: 'TeacherName',
            width: 100,
        },
        {
            title: '学年',
            dataIndex: 'AcademicYear',
            key: 'AcademicYear',
            width: 120,
        },
        {
            title: '学期',
            dataIndex: 'Semester',
            key: 'Semester',
            width: 80,
            render: (text) => (
                <Tag color={text === '春季' ? 'green' : 'orange'}>{text}</Tag>
            )
        },
        {
            title: '学时',
            dataIndex: 'Hours',
            key: 'Hours',
            width: 80,
        },
        {
            title: '学分',
            dataIndex: 'Credits',
            key: 'Credits',
            width: 80,
        },
        {
            title: '状态',
            dataIndex: 'Status',
            key: 'Status',
            width: 100,
            render: (status) => {
                const config = statusMap[status] || { text: status, color: 'default' };
                return <Tag color={config.color}>{config.text}</Tag>;
            }
        },
        {
            title: '选课时间',
            dataIndex: 'EnrollTime',
            key: 'EnrollTime',
            width: 160,
            render: (text) => text ? new Date(text).toLocaleString() : '-'
        },
        {
            title: '成绩',
            dataIndex: 'Score',
            key: 'Score',
            width: 80,
            render: (score, record) => {
                if (record.Status === 'completed' && score !== null) {
                    return <Tag color={score >= 60 ? 'green' : 'red'}>{score}</Tag>;
                }
                return '-';
            }
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => {
                if (record.Status === 'enrolled') {
                    return (
                        <Popconfirm
                            title="确认退课"
                            description={`确定要退选课程 "${record.CourseName}" 吗？`}
                            onConfirm={() => handleDrop(record)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={dropping}
                            >
                                退课
                            </Button>
                        </Popconfirm>
                    );
                }
                return null;
            }
        }
    ];

    const fetchData = async (page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        try {
            const params = {
                page,
                pageSize,
                status: statusFilter
            };

            const response = await request.get('/api/enrollment/my-courses', { params });
            if (response.data) {
                setData(response.data.list || []);
                setPagination({
                    current: page,
                    pageSize,
                    total: response.data.total || 0
                });
            }
        } catch (error) {
            console.error('获取我的课程失败:', error);
            message.error('获取我的课程失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(1);
    }, [statusFilter]);

    const handleDrop = async (record) => {
        setDropping(true);
        try {
            await request.post(`/api/enrollment/drop/${record.EnrollmentID}`);
            message.success('退课成功');
            fetchData();
        } catch (error) {
            console.error('退课失败:', error);
            message.error(error.response?.data?.message || '退课失败');
        } finally {
            setDropping(false);
        }
    };

    const handleTableChange = (newPagination) => {
        fetchData(newPagination.current, newPagination.pageSize);
    };

    const getStats = () => {
        const enrolled = data.filter(item => item.Status === 'enrolled').length;
        const completed = data.filter(item => item.Status === 'completed').length;
        const totalCredits = data
            .filter(item => item.Status !== 'dropped')
            .reduce((sum, item) => sum + (parseFloat(item.Credits) || 0), 0);
        return { enrolled, completed, totalCredits: totalCredits.toFixed(1) };
    };

    const stats = getStats();

    return (
        <div>
            <Card style={{ marginBottom: 16 }}>
                <Space size="large">
                    <div>
                        <span style={{ color: '#666' }}>已选课程: </span>
                        <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                            {stats.enrolled} 门
                        </Tag>
                    </div>
                    <div>
                        <span style={{ color: '#666' }}>已完成: </span>
                        <Tag color="green" style={{ fontSize: 16, padding: '4px 12px' }}>
                            {stats.completed} 门
                        </Tag>
                    </div>
                    <div>
                        <span style={{ color: '#666' }}>总学分: </span>
                        <Tag color="purple" style={{ fontSize: 16, padding: '4px 12px' }}>
                            {stats.totalCredits} 学分
                        </Tag>
                    </div>
                </Space>
            </Card>

            <Card
                title="我的课程"
                extra={
                    <Select
                        placeholder="筛选状态"
                        value={statusFilter || undefined}
                        onChange={setStatusFilter}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Option value="enrolled">已选课</Option>
                        <Option value="completed">已完成</Option>
                        <Option value="dropped">已退课</Option>
                    </Select>
                }
            >
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="EnrollmentID"
                    loading={loading}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 1200 }}
                />
            </Card>
        </div>
    );
};

export default MyCourses;

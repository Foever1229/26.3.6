import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, message, Popconfirm, Tag, Space, Select } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import request from '../../utils/request';

const { Option } = Select;

const EnrollmentCourses = () => {
    const [loading, setLoading] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [searchParams, setSearchParams] = useState({
        keyword: '',
        semester: ''
    });

    const semesterOptions = [
        { value: '春季', label: '春季' },
        { value: '秋季', label: '秋季' }
    ];

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
            title: '已选人数',
            dataIndex: 'enrolledCount',
            key: 'enrolledCount',
            width: 100,
            render: (count) => (
                <Tag color="blue">{count || 0} 人</Tag>
            )
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleEnroll(record)}
                    loading={enrolling}
                >
                    选课
                </Button>
            )
        }
    ];

    const fetchData = async (page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        try {
            const params = {
                page,
                pageSize,
                ...searchParams
            };

            const response = await request.get('/api/enrollment/available-courses', { params });
            if (response.data) {
                setData(response.data.list || []);
                setPagination({
                    current: page,
                    pageSize,
                    total: response.data.total || 0
                });
            }
        } catch (error) {
            console.error('获取课程列表失败:', error);
            message.error('获取课程列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(1);
    }, []);

    const handleEnroll = async (record) => {
        setEnrolling(true);
        try {
            await request.post('/api/enrollment/enroll', {
                taskId: record.TaskID
            });
            message.success(`成功选修课程：${record.CourseName}`);
            fetchData();
        } catch (error) {
            console.error('选课失败:', error);
            message.error(error.response?.data?.message || '选课失败');
        } finally {
            setEnrolling(false);
        }
    };

    const handleSearch = () => {
        fetchData(1);
    };

    const handleReset = () => {
        setSearchParams({
            keyword: '',
            semester: ''
        });
        fetchData(1);
    };

    const handleTableChange = (newPagination) => {
        fetchData(newPagination.current, newPagination.pageSize);
    };

    return (
        <div>
            <Card title="可选课程" style={{ marginBottom: 16 }}>
                <Space style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="搜索课程名称/代码/教师"
                        value={searchParams.keyword}
                        onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
                        onPressEnter={handleSearch}
                        style={{ width: 250 }}
                        prefix={<SearchOutlined />}
                    />
                    <Select
                        placeholder="选择学期"
                        value={searchParams.semester || undefined}
                        onChange={(value) => setSearchParams({ ...searchParams, semester: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        {semesterOptions.map(opt => (
                            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                    </Select>
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                    <Button onClick={handleReset}>重置</Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="TaskID"
                    loading={loading}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`
                    }}
                    onChange={handleTableChange}
                    scroll={{ x: 1000 }}
                />
            </Card>
        </div>
    );
};

export default EnrollmentCourses;

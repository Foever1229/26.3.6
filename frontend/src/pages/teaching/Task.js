import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Space, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useAuth } from '../../contexts/AuthContext';

const Task = () => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [stats, setStats] = useState({});
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [filters, setFilters] = useState({
        keyword: '',
        semester: ''
    });

    // 判断是否有权限编辑/删除
    const canEdit = (record) => {
        if (!user) return false;
        // admin和office可以编辑所有
        if (user.role === 'admin' || user.role === 'office') return true;
        // 教师只能编辑自己的（通过TeacherID或TeacherName判断）
        if (user.role === 'teacher') {
            return record.TeacherID === user.userId || record.TeacherName === user.realName;
        }
        // leader只能查看，不能编辑
        return false;
    };

    const columns = [
        { title: '课程名称', dataIndex: 'CourseName', width: 200 },
        { title: '课程代码', dataIndex: 'CourseCode', width: 120 },
        { title: '教师', dataIndex: 'TeacherName', width: 100 },
        { title: '学时', dataIndex: 'Hours', width: 80 },
        { title: '学分', dataIndex: 'Credits', width: 80 },
        { title: '学期', dataIndex: 'Semester', width: 120 },
        { title: '学年', dataIndex: 'AcademicYear', width: 100 },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 150,
            render: (_, record) => {
                if (!canEdit(record)) {
                    return <span style={{ color: '#999' }}>无权限</span>;
                }
                return (
                    <Space>
                        <Button
                            type="primary"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record)}
                        >
                            编辑
                        </Button>
                        <Popconfirm
                            title="确认删除"
                            onConfirm={() => handleDelete(record.TaskID)}
                        >
                            <Button
                                type="primary"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                            >
                                删除
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    useEffect(() => {
        fetchData();
        fetchStats();
    }, [pagination.current, pagination.pageSize, filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await request.get('/api/teaching/tasks', {
                params: {
                    page: pagination.current,
                    pageSize: pagination.pageSize,
                    ...filters
                }
            });
            setData(res.data.list);
            setPagination({
                ...pagination,
                total: res.data.pagination.total
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await request.get('/api/teaching/statistics');
            setStats(res.data?.summary || {});
        } catch (error) {
            console.error(error);
        }
    };

    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        // 新增时自动填充当前用户为教师（教师只能添加自己的教学任务）
        if (user?.role === 'teacher') {
            form.setFieldsValue({
                TeacherName: user.realName
            });
        }
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await request.delete(`/api/teaching/tasks/${id}`);
            message.success('删除成功');
            fetchData();
            fetchStats();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingRecord) {
                await request.put(`/api/teaching/tasks/${editingRecord.TaskID}`, values);
                message.success('更新成功');
            } else {
                await request.post('/api/teaching/tasks', values);
                message.success('添加成功');
            }
            setModalVisible(false);
            fetchData();
            fetchStats();
        } catch (error) {
            console.error(error);
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    return (
        <div>
            <div className="page-title">教学任务管理</div>
            
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="总课时"
                            value={stats.totalHours || 0}
                            prefix={<BookOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="教师人数"
                            value={stats.teacherCount || 0}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="教学任务数"
                            value={stats.taskCount || 0}
                        />
                    </Card>
                </Col>
            </Row>

            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索课程名称/代码"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="学期"
                        value={filters.semester || undefined}
                        onChange={value => setFilters({ ...filters, semester: value })}
                        style={{ width: 150 }}
                        allowClear
                    >
                        <Select.Option value="2025-2026-1">2025-2026学年第一学期</Select.Option>
                        <Select.Option value="2025-2026-2">2025-2026学年第二学期</Select.Option>
                        <Select.Option value="2024-2025-1">2024-2025学年第一学期</Select.Option>
                        <Select.Option value="2024-2025-2">2024-2025学年第二学期</Select.Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                {(user?.role === 'admin' || user?.role === 'leader' || user?.role === 'office' || user?.role === 'teacher') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增任务
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="TaskID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1000 }}
            />

            <Modal
                title={editingRecord ? '编辑教学任务' : '新增教学任务'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="CourseName"
                            label="课程名称"
                            rules={[{ required: true, message: '请输入课程名称' }]}
                            style={{ width: 250 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="CourseCode"
                            label="课程代码"
                            style={{ width: 250 }}
                        >
                            <Input />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="TeacherName"
                            label="教师"
                            rules={[{ required: true, message: '请输入教师姓名' }]}
                            style={{ width: 200 }}
                        >
                            <Input disabled={user?.role === 'teacher'} />
                        </Form.Item>
                        <Form.Item
                            name="Hours"
                            label="学时"
                            style={{ width: 150 }}
                        >
                            <Input type="number" />
                        </Form.Item>
                        <Form.Item
                            name="Credits"
                            label="学分"
                            style={{ width: 150 }}
                        >
                            <Input type="number" step="0.5" />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="AcademicYear"
                            label="学年"
                            style={{ width: 200 }}
                        >
                            <Input placeholder="如：2025-2026" />
                        </Form.Item>
                        <Form.Item
                            name="Semester"
                            label="学期"
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="第一学期">第一学期</Select.Option>
                                <Select.Option value="第二学期">第二学期</Select.Option>
                            </Select>
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default Task;

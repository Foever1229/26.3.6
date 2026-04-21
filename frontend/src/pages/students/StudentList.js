import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Space, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useAuth } from '../../contexts/AuthContext';

const StudentList = () => {
    const { user } = useAuth();
    // 判断是否有权限编辑/删除/新增（只有admin和office可以）
    const canEdit = user?.role === 'admin' || user?.role === 'office';
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
        major: '',
        grade: ''
    });

    const columns = [
        { title: '学号', dataIndex: 'StuNo', width: 120 },
        { title: '姓名', dataIndex: 'Name', width: 100 },
        { title: '性别', dataIndex: 'Gender', width: 80 },
        { title: '专业', dataIndex: 'Major', width: 150 },
        { title: '年级', dataIndex: 'Grade', width: 100 },
        { title: '班级', dataIndex: 'Class', width: 100 },
        { title: '学分', dataIndex: 'Credits', width: 80 },
        { title: '排名', dataIndex: 'Rank', width: 80 },
        { title: '联系电话', dataIndex: 'Phone', width: 120 },
        {
            title: '操作',
            fixed: 'right',
            width: 150,
            render: (_, record) => {
                if (!canEdit) {
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
                            onConfirm={() => handleDelete(record.StudentID)}
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
            const res = await request.get('/api/students', {
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
            const res = await request.get('/api/students/statistics/overview');
            setStats(res.data?.summary || {});
        } catch (error) {
            console.error(error);
        }
    };

    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await request.delete(`/api/students/${id}`);
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
                await request.put(`/api/students/${editingRecord.StudentID}`, values);
                message.success('更新成功');
            } else {
                await request.post('/api/students', values);
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
            <div className="page-title">学生信息管理</div>
            
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="学生总数"
                            value={stats.totalStudents || 0}
                            prefix={<TeamOutlined />}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="专业数量"
                            value={stats.majorCount || 0}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="平均学分"
                            value={stats.avgCredits || 0}
                            precision={2}
                        />
                    </Card>
                </Col>
            </Row>

            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索学号/姓名"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="专业"
                        value={filters.major || undefined}
                        onChange={value => setFilters({ ...filters, major: value })}
                        style={{ width: 150 }}
                        allowClear
                    >
                        <Select.Option value="计算机科学与技术">计算机科学与技术</Select.Option>
                        <Select.Option value="软件工程">软件工程</Select.Option>
                        <Select.Option value="网络工程">网络工程</Select.Option>
                        <Select.Option value="人工智能">人工智能</Select.Option>
                    </Select>
                    <Select
                        placeholder="年级"
                        value={filters.grade || undefined}
                        onChange={value => setFilters({ ...filters, grade: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        {['2025', '2024', '2023', '2022', '2021'].map(y => (
                            <Select.Option key={y} value={`${y}级`}>{y}级</Select.Option>
                        ))}
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                {canEdit && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增学生
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="StudentID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
            />

            <Modal
                title={editingRecord ? '编辑学生' : '新增学生'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="StuNo"
                            label="学号"
                            rules={[{ required: true, message: '请输入学号' }]}
                            style={{ width: 250 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="Name"
                            label="姓名"
                            rules={[{ required: true, message: '请输入姓名' }]}
                            style={{ width: 250 }}
                        >
                            <Input />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="Gender" label="性别" style={{ width: 150 }}>
                            <Select placeholder="请选择">
                                <Select.Option value="男">男</Select.Option>
                                <Select.Option value="女">女</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="Major"
                            label="专业"
                            rules={[{ required: true, message: '请选择专业' }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="计算机科学与技术">计算机科学与技术</Select.Option>
                                <Select.Option value="软件工程">软件工程</Select.Option>
                                <Select.Option value="网络工程">网络工程</Select.Option>
                                <Select.Option value="人工智能">人工智能</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="Grade"
                            label="年级"
                            rules={[{ required: true, message: '请输入年级' }]}
                            style={{ width: 150 }}
                        >
                            <Input placeholder="如：2023级" />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="Class" label="班级" style={{ width: 200 }}>
                            <Input placeholder="如：1班" />
                        </Form.Item>
                        <Form.Item name="Credits" label="学分" style={{ width: 150 }}>
                            <Input type="number" step="0.01" />
                        </Form.Item>
                        <Form.Item name="Rank" label="排名" style={{ width: 150 }}>
                            <Input type="number" />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="Phone" label="联系电话" style={{ width: 250 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="Email" label="邮箱" style={{ width: 250 }}>
                            <Input />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentList;

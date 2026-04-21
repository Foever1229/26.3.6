import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useAuth } from '../../contexts/AuthContext';

const Innovation = () => {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [filters, setFilters] = useState({
        keyword: '',
        level: ''
    });

    // 判断是否有权限编辑/删除
    const canEdit = (record) => {
        if (!user) return false;
        // admin、office可以编辑所有
        if (user.role === 'admin' || user.role === 'office') return true;
        // 教师只能编辑自己指导的（通过Advisor对比RealName判断）
        if (user.role === 'teacher') {
            return record.Advisor === user.realName;
        }
        // 学生可以编辑自己作为负责人的记录
        if (user.role === 'student') {
            return record.LeaderName === user.realName;
        }
        // leader只能查看，不能编辑
        return false;
    };

    const columns = [
        { title: '项目名称', dataIndex: 'ProjectName', width: 250 },
        {
            title: '级别',
            dataIndex: 'Level',
            width: 100,
            render: (level) => {
                const colors = {
                    '国家级': 'red',
                    '省级': 'orange',
                    '校级': 'blue'
                };
                return <Tag color={colors[level] || 'default'}>{level}</Tag>;
            }
        },
        { title: '负责人', dataIndex: 'LeaderName', width: 100 },
        { title: '成员', dataIndex: 'MemberNames', width: 200 },
        { title: '指导教师', dataIndex: 'Advisor', width: 100 },
        { title: '经费', dataIndex: 'Funding', width: 100, render: (v) => `¥${v || 0}` },
        { title: '开始时间', dataIndex: 'StartTime', width: 120 },
        { title: '结束时间', dataIndex: 'EndTime', width: 120 },
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
                            onConfirm={() => handleDelete(record.ProjectID)}
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
    }, [pagination.current, pagination.pageSize, filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await request.get('/api/students/innovations/list', {
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

    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        // 新增时自动填充当前用户为指导教师（教师只能添加自己指导的）
        if (user?.role === 'teacher') {
            form.setFieldsValue({
                Advisor: user.realName
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
            await request.delete(`/api/students/innovations/${id}`);
            message.success('删除成功');
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (values) => {
        try {
            // 处理日期格式，将日期转换为 YYYY-MM-DD 格式
            const submitData = { ...values };
            ['StartTime', 'EndTime'].forEach(field => {
                if (submitData[field]) {
                    const date = new Date(submitData[field]);
                    if (!isNaN(date.getTime())) {
                        submitData[field] = date.toISOString().split('T')[0];
                    }
                }
            });

            if (editingRecord) {
                await request.put(`/api/students/innovations/${editingRecord.ProjectID}`, submitData);
                message.success('更新成功');
            } else {
                await request.post('/api/students/innovations', submitData);
                message.success('添加成功');
            }
            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.message || '操作失败');
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    return (
        <div>
            <div className="page-title">大创项目管理</div>
            
            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索项目名称"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="项目级别"
                        value={filters.level || undefined}
                        onChange={value => setFilters({ ...filters, level: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Select.Option value="国家级">国家级</Select.Option>
                        <Select.Option value="省级">省级</Select.Option>
                        <Select.Option value="校级">校级</Select.Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                {(user?.role === 'admin' || user?.role === 'leader' || user?.role === 'office' || user?.role === 'teacher') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增项目
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="ProjectID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
            />

            <Modal
                title={editingRecord ? '编辑大创项目' : '新增大创项目'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="ProjectName"
                        label="项目名称"
                        rules={[{ required: true, message: '请输入项目名称' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="Level"
                            label="项目级别"
                            rules={[{ required: true, message: '请选择级别' }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="国家级">国家级</Select.Option>
                                <Select.Option value="省级">省级</Select.Option>
                                <Select.Option value="校级">校级</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="LeaderName"
                            label="项目负责人"
                            rules={[{ required: true, message: '请输入负责人' }]}
                            style={{ width: 200 }}
                        >
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item name="MemberNames" label="项目成员">
                        <Input placeholder="多个成员用逗号分隔" />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="Advisor" label="指导教师" style={{ width: 200 }}>
                            <Input disabled={user?.role === 'teacher'} />
                        </Form.Item>
                        <Form.Item name="Funding" label="项目经费" style={{ width: 200 }}>
                            <Input type="number" prefix="¥" />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="StartTime" label="开始时间" style={{ width: 200 }}>
                            <Input type="date" />
                        </Form.Item>
                        <Form.Item name="EndTime" label="结束时间" style={{ width: 200 }}>
                            <Input type="date" />
                        </Form.Item>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default Innovation;

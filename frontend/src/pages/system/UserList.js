import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import request from '../../utils/request';

const UserList = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [form] = Form.useForm();
    const [roles, setRoles] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    const [filters, setFilters] = useState({
        keyword: '',
        roleId: ''
    });

    const columns = [
        { title: '用户名', dataIndex: 'Username', width: 120 },
        { title: '真实姓名', dataIndex: 'RealName', width: 100 },
        { 
            title: '角色', 
            dataIndex: 'RoleName', 
            width: 120,
            render: (role, record) => {
                const colors = {
                    'admin': 'red',
                    'teacher': 'blue',
                    'office': 'green',
                    'leader': 'purple'
                };
                return <Tag color={colors[record.RoleCode] || 'default'}>{role}</Tag>;
            }
        },
        { title: '部门', dataIndex: 'Department', width: 150 },
        { title: '电话', dataIndex: 'Phone', width: 120 },
        { title: '邮箱', dataIndex: 'Email', width: 150 },
        { title: '创建时间', dataIndex: 'CreateTime', width: 150 },
        {
            title: '操作',
            fixed: 'right',
            width: 150,
            render: (_, record) => (
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
                        onConfirm={() => handleDelete(record.UserID)}
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
            )
        }
    ];

    useEffect(() => {
        fetchData();
        fetchRoles();
    }, [pagination.current, pagination.pageSize, filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await request.get('/api/users', {
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

    const fetchRoles = async () => {
        try {
            const res = await request.get('/api/users/roles/list');
            setRoles(res.data);
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
        form.setFieldsValue({
            ...record,
            roleId: record.RoleID
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await request.delete(`/api/users/${id}`);
            message.success('删除成功');
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingRecord) {
                await request.put(`/api/users/${editingRecord.UserID}`, values);
                message.success('更新成功');
            } else {
                await request.post('/api/users', values);
                message.success('添加成功');
            }
            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    return (
        <div>
            <div className="page-title">用户管理</div>
            
            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索用户名/姓名/部门"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="角色"
                        value={filters.roleId || undefined}
                        onChange={value => setFilters({ ...filters, roleId: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        {roles.map(role => (
                            <Select.Option key={role.RoleID} value={role.RoleID}>
                                {role.RoleName}
                            </Select.Option>
                        ))}
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    新增用户
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="UserID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1100 }}
            />

            <Modal
                title={editingRecord ? '编辑用户' : '新增用户'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="username"
                            label="用户名"
                            rules={[{ required: true, message: '请输入用户名' }]}
                            style={{ width: 250 }}
                        >
                            <Input disabled={!!editingRecord} />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label={editingRecord ? "密码（留空不修改）" : "密码"}
                            rules={!editingRecord ? [{ required: true, message: '请输入密码' }] : []}
                            style={{ width: 250 }}
                        >
                            <Input.Password />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="realName"
                            label="真实姓名"
                            style={{ width: 250 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="roleId"
                            label="角色"
                            rules={[{ required: true, message: '请选择角色' }]}
                            style={{ width: 250 }}
                        >
                            <Select placeholder="请选择">
                                {roles.map(role => (
                                    <Select.Option key={role.RoleID} value={role.RoleID}>
                                        {role.RoleName}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="department" label="部门" style={{ width: 250 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="phone" label="电话" style={{ width: 250 }}>
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item name="email" label="邮箱">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserList;

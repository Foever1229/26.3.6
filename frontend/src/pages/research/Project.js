import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, DatePicker, Modal, Form, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../../utils/request';
import { useAuth } from '../../contexts/AuthContext';

const { RangePicker } = DatePicker;

const Project = () => {
    const { user } = useAuth();
    const canEditAll = user?.role === 'admin' || user?.role === 'office';
    const canEditOwn = user?.role === 'teacher';
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
        projectType: '',
        status: ''
    });

    const columns = [
        { title: '项目名称', dataIndex: 'ProjectName', width: 250 },
        { title: '项目编号', dataIndex: 'ProjectCode', width: 120 },
        { title: '项目类型', dataIndex: 'ProjectType', width: 100 },
        { title: '负责人', dataIndex: 'LeaderName', width: 100 },
        { 
            title: '总经费', 
            dataIndex: 'TotalFunding', 
            width: 120,
            render: (val) => `¥${val?.toLocaleString() || 0}`
        },
        { 
            title: '状态', 
            dataIndex: 'Status', 
            width: 100,
            render: (status) => (
                <Tag color={status === '进行中' ? 'green' : status === '已结题' ? 'blue' : 'default'}>
                    {status}
                </Tag>
            )
        },
        { title: '开始日期', dataIndex: 'StartDate', width: 120 },
        { title: '结束日期', dataIndex: 'EndDate', width: 120 },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 150,
            render: (_, record) => {
                // 判断是否能编辑这条记录
                const isOwner = record.UserID === user?.userId || record.LeaderID === user?.userId;
                const canEditThis = canEditAll || (canEditOwn && isOwner);

                if (!canEditThis) {
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
            const res = await request.get('/api/research/projects', {
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
        // 新增时自动填充当前用户为负责人（教师/学生只能添加自己的项目）
        if (user?.role === 'teacher' || user?.role === 'student') {
            form.setFieldsValue({
                LeaderName: user.realName
            });
        }
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            StartDate: record.StartDate ? dayjs(record.StartDate) : null,
            EndDate: record.EndDate ? dayjs(record.EndDate) : null
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await request.delete(`/api/research/projects/${id}`);
            message.success('删除成功');
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const submitData = {
                ...values,
                StartDate: values.StartDate?.format('YYYY-MM-DD'),
                EndDate: values.EndDate?.format('YYYY-MM-DD')
            };

            if (editingRecord) {
                await request.put(`/api/research/projects/${editingRecord.ProjectID}`, submitData);
                message.success('更新成功');
            } else {
                await request.post('/api/research/projects', submitData);
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
            <div className="page-title">科研项目管理</div>
            
            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索项目名称/编号"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="项目类型"
                        value={filters.projectType || undefined}
                        onChange={value => setFilters({ ...filters, projectType: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Select.Option value="国家级">国家级</Select.Option>
                        <Select.Option value="省部级">省部级</Select.Option>
                        <Select.Option value="市厅级">市厅级</Select.Option>
                        <Select.Option value="校级">校级</Select.Option>
                    </Select>
                    <Select
                        placeholder="项目状态"
                        value={filters.status || undefined}
                        onChange={value => setFilters({ ...filters, status: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Select.Option value="进行中">进行中</Select.Option>
                        <Select.Option value="已结题">已结题</Select.Option>
                        <Select.Option value="已终止">已终止</Select.Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                {(canEditAll || canEditOwn) && (
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
                title={editingRecord ? '编辑项目' : '新增项目'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={700}
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
                            name="ProjectCode"
                            label="项目编号"
                            style={{ width: 200 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="ProjectType"
                            label="项目类型"
                            rules={[{ required: true, message: '请选择项目类型' }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="国家级">国家级</Select.Option>
                                <Select.Option value="省部级">省部级</Select.Option>
                                <Select.Option value="市厅级">市厅级</Select.Option>
                                <Select.Option value="校级">校级</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="Status"
                            label="项目状态"
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="进行中">进行中</Select.Option>
                                <Select.Option value="已结题">已结题</Select.Option>
                                <Select.Option value="已终止">已终止</Select.Option>
                            </Select>
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="LeaderName"
                            label="项目负责人"
                            rules={[{ required: true, message: '请输入负责人' }]}
                            style={{ width: 200 }}
                        >
                            <Input disabled={user?.role === 'teacher' || user?.role === 'student'} />
                        </Form.Item>
                        <Form.Item
                            name="Source"
                            label="项目来源"
                            style={{ width: 200 }}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="TotalFunding"
                            label="总经费"
                            style={{ width: 200 }}
                        >
                            <Input type="number" prefix="¥" />
                        </Form.Item>
                    </Space>
                    <Form.Item name="MemberNames" label="参与成员">
                        <Input placeholder="多个成员用逗号分隔" />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="StartDate" label="开始日期">
                            <DatePicker style={{ width: 200 }} />
                        </Form.Item>
                        <Form.Item name="EndDate" label="结束日期">
                            <DatePicker style={{ width: 200 }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="Achievement" label="项目成果">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Project;

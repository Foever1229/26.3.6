import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, TrophyOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useAuth } from '../../contexts/AuthContext';

const Award = () => {
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
        // 教师只能编辑自己指导的（通过Advisor1对比RealName判断）
        if (user.role === 'teacher') {
            return record.Advisor1 === user.realName;
        }
        // 学生可以编辑自己作为获奖人的记录
        if (user.role === 'student') {
            return record.WinnerNames && record.WinnerNames.includes(user.realName);
        }
        // leader只能查看，不能编辑
        return false;
    };

    const columns = [
        { title: '竞赛名称', dataIndex: 'CompetitionName', width: 250 },
        {
            title: '级别',
            dataIndex: 'Level',
            width: 100,
            render: (level) => {
                const colors = {
                    '国家级': 'red',
                    '省级': 'orange',
                    '市级': 'green',
                    '校级': 'blue'
                };
                return <Tag color={colors[level] || 'default'}>{level}</Tag>;
            }
        },
        {
            title: '获奖等级',
            dataIndex: 'AwardGrade',
            width: 100,
            render: (grade) => {
                const colors = {
                    '一等奖': 'gold',
                    '二等奖': 'silver',
                    '三等奖': 'bronze',
                    '优秀奖': 'blue'
                };
                return <Tag color={colors[grade] || 'default'}>{grade}</Tag>;
            }
        },
        { title: '获奖学生', dataIndex: 'WinnerNames', width: 200 },
        { title: '指导教师', dataIndex: 'Advisor1', width: 100 },
        { title: '获奖日期', dataIndex: 'AwardDate', width: 120 },
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
                            onConfirm={() => handleDelete(record.AwardID)}
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
            const res = await request.get('/api/students/awards/list', {
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
                Advisor1: user.realName
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
            await request.delete(`/api/students/awards/${id}`);
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
            if (submitData.AwardDate) {
                // 如果是 ISO 格式日期，转换为 YYYY-MM-DD
                const date = new Date(submitData.AwardDate);
                if (!isNaN(date.getTime())) {
                    submitData.AwardDate = date.toISOString().split('T')[0];
                }
            }

            if (editingRecord) {
                await request.put(`/api/students/awards/${editingRecord.AwardID}`, submitData);
                message.success('更新成功');
            } else {
                await request.post('/api/students/awards', submitData);
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
            <div className="page-title">竞赛获奖管理</div>
            
            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索竞赛名称"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="竞赛级别"
                        value={filters.level || undefined}
                        onChange={value => setFilters({ ...filters, level: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Select.Option value="国家级">国家级</Select.Option>
                        <Select.Option value="省级">省级</Select.Option>
                        <Select.Option value="市级">市级</Select.Option>
                        <Select.Option value="校级">校级</Select.Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                {(user?.role === 'admin' || user?.role === 'leader' || user?.role === 'office' || user?.role === 'teacher') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增获奖
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="AwardID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1000 }}
            />

            <Modal
                title={editingRecord ? '编辑获奖' : '新增获奖'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="CompetitionName"
                        label="竞赛名称"
                        rules={[{ required: true, message: '请输入竞赛名称' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="Level"
                            label="竞赛级别"
                            rules={[{ required: true, message: '请选择级别' }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="国家级">国家级</Select.Option>
                                <Select.Option value="省级">省级</Select.Option>
                                <Select.Option value="市级">市级</Select.Option>
                                <Select.Option value="校级">校级</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="AwardGrade"
                            label="获奖等级"
                            rules={[{ required: true, message: '请选择等级' }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="一等奖">一等奖</Select.Option>
                                <Select.Option value="二等奖">二等奖</Select.Option>
                                <Select.Option value="三等奖">三等奖</Select.Option>
                                <Select.Option value="优秀奖">优秀奖</Select.Option>
                            </Select>
                        </Form.Item>
                    </Space>
                    <Form.Item
                        name="WinnerNames"
                        label="获奖学生"
                        rules={[{ required: true, message: '请输入获奖学生' }]}
                    >
                        <Input placeholder="多个学生用逗号分隔" />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="Advisor1" label="指导教师" style={{ width: 200 }}>
                            <Input disabled={user?.role === 'teacher'} />
                        </Form.Item>
                        <Form.Item name="AdvisorDept1" label="指导教师部门" style={{ width: 200 }}>
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item name="AwardDate" label="获奖日期">
                        <Input type="date" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Award;

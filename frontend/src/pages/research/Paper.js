import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, DatePicker, Modal, Form, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../../utils/request';
import { useAuth } from '../../contexts/AuthContext';

const { RangePicker } = DatePicker;

const Paper = () => {
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
        indexType: '',
        zone: ''
    });

    const columns = [
        { title: '论文标题', dataIndex: 'Title', width: 300 },
        { title: '作者', dataIndex: 'Author', width: 150 },
        { title: '期刊', dataIndex: 'Journal', width: 150 },
        { title: '索引类型', dataIndex: 'IndexType', width: 100 },
        { title: '分区', dataIndex: 'Zone', width: 80 },
        { title: '发表日期', dataIndex: 'PublishDate', width: 120 },
        { title: 'DOI', dataIndex: 'DOI', width: 150 },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 150,
            render: (_, record) => {
                // 判断是否能编辑这条记录
                const isOwner = record.UserID === user?.userId ||
                               record.FirstAuthorID === user?.userId ||
                               record.CorrespondingAuthorID === user?.userId;
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
                            onConfirm={() => handleDelete(record.PaperID)}
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
            const res = await request.get('/api/research/papers', {
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
        // 新增时自动填充当前用户为作者（教师/学生只能添加自己的）
        if (user?.role === 'teacher' || user?.role === 'student') {
            form.setFieldsValue({
                Author: user.realName
            });
        }
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue({
            ...record,
            PublishDate: record.PublishDate ? dayjs(record.PublishDate) : null
        });
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await request.delete(`/api/research/papers/${id}`);
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
                PublishDate: values.PublishDate?.format('YYYY-MM-DD')
            };

            if (editingRecord) {
                await request.put(`/api/research/papers/${editingRecord.PaperID}`, submitData);
                message.success('更新成功');
            } else {
                await request.post('/api/research/papers', submitData);
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
            <div className="page-title">论文管理</div>
            
            {/* 搜索栏 */}
            <div className="table-toolbar">
                <Space>
                    <Input
                        placeholder="搜索标题/作者/期刊"
                        value={filters.keyword}
                        onChange={e => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Select
                        placeholder="索引类型"
                        value={filters.indexType || undefined}
                        onChange={value => setFilters({ ...filters, indexType: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Select.Option value="SCI">SCI</Select.Option>
                        <Select.Option value="EI">EI</Select.Option>
                        <Select.Option value="CPCI">CPCI</Select.Option>
                        <Select.Option value="CSSCI">CSSCI</Select.Option>
                    </Select>
                    <Select
                        placeholder="分区"
                        value={filters.zone || undefined}
                        onChange={value => setFilters({ ...filters, zone: value })}
                        style={{ width: 100 }}
                        allowClear
                    >
                        <Select.Option value="A">A区</Select.Option>
                        <Select.Option value="B">B区</Select.Option>
                        <Select.Option value="C">C区</Select.Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                {(canEditAll || canEditOwn) && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增论文
                    </Button>
                )}
            </div>

            {/* 数据表格 */}
            <Table
                columns={columns}
                dataSource={data}
                rowKey="PaperID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
            />

            {/* 新增/编辑弹窗 */}
            <Modal
                title={editingRecord ? '编辑论文' : '新增论文'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="Title"
                        label="论文标题"
                        rules={[{ required: true, message: '请输入论文标题' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="Author"
                        label="作者"
                        rules={[{ required: true, message: '请输入作者' }]}
                    >
                        <Input 
                            placeholder="多个作者用逗号分隔" 
                            disabled={user?.role === 'teacher' || user?.role === 'student'}
                        />
                    </Form.Item>
                    <Form.Item
                        name="Journal"
                        label="期刊名称"
                        rules={[{ required: true, message: '请输入期刊名称' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="IndexType"
                            label="索引类型"
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="SCI">SCI</Select.Option>
                                <Select.Option value="EI">EI</Select.Option>
                                <Select.Option value="CPCI">CPCI</Select.Option>
                                <Select.Option value="CSSCI">CSSCI</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="Zone"
                            label="分区"
                            style={{ width: 150 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="A">A区</Select.Option>
                                <Select.Option value="B">B区</Select.Option>
                                <Select.Option value="C">C区</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="PublishDate"
                            label="发表日期"
                            rules={[{ required: true, message: '请选择发表日期' }]}
                        >
                            <DatePicker style={{ width: 200 }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="DOI" label="DOI">
                        <Input />
                    </Form.Item>
                    <Form.Item name="FundProject" label="资助项目">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Paper;

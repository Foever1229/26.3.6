import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Modal, Form, message, Space, Popconfirm, Statistic, Card, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import request from '../../utils/request';

const Funding = () => {
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
        year: '',
        fundingType: ''
    });

    const columns = [
        { title: '项目名称', dataIndex: 'ProjectName', width: 200 },
        { title: '经费类型', dataIndex: 'FundingType', width: 100 },
        { title: '年度', dataIndex: 'Year', width: 80 },
        { 
            title: '预算金额', 
            dataIndex: 'BudgetAmount', 
            width: 120,
            render: (val) => `¥${val?.toLocaleString() || 0}`
        },
        { 
            title: '到账金额', 
            dataIndex: 'ReceivedAmount', 
            width: 120,
            render: (val) => `¥${val?.toLocaleString() || 0}`
        },
        { 
            title: '支出金额', 
            dataIndex: 'ExpenseAmount', 
            width: 120,
            render: (val) => `¥${val?.toLocaleString() || 0}`
        },
        { 
            title: '结余', 
            width: 120,
            render: (_, record) => {
                const balance = (record.ReceivedAmount || 0) - (record.ExpenseAmount || 0);
                return `¥${balance.toLocaleString()}`;
            }
        },
        { title: '说明', dataIndex: 'Description', width: 200 },
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
                        onConfirm={() => handleDelete(record.FundingID)}
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
        fetchStats();
    }, [pagination.current, pagination.pageSize, filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await request.get('/api/research/funding', {
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
            // 直接从经费列表计算统计，不受年度限制
            const res = await request.get('/api/research/funding', {
                params: { page: 1, pageSize: 10000 }
            });
            const list = res.data?.list || [];
            const stats = {
                totalBudget: list.reduce((sum, item) => sum + (parseFloat(item.BudgetAmount) || 0), 0),
                totalReceived: list.reduce((sum, item) => sum + (parseFloat(item.ReceivedAmount) || 0), 0),
                totalExpense: list.reduce((sum, item) => sum + (parseFloat(item.ExpenseAmount) || 0), 0)
            };
            setStats(stats);
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
            await request.delete(`/api/research/funding/${id}`);
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
                await request.put(`/api/research/funding/${editingRecord.FundingID}`, values);
                message.success('更新成功');
            } else {
                await request.post('/api/research/funding', values);
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
            <div className="page-title">科研经费管理</div>
            
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="总预算"
                            value={Number(stats.totalBudget || 0)}
                            prefix="¥"
                            precision={2}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="总到账"
                            value={Number(stats.totalReceived || 0)}
                            prefix="¥"
                            precision={2}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="总支出"
                            value={Number(stats.totalExpense || 0)}
                            prefix="¥"
                            precision={2}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            <div className="table-toolbar">
                <Space>
                    <Select
                        placeholder="选择年度"
                        value={filters.year || undefined}
                        onChange={value => setFilters({ ...filters, year: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        {[2026, 2025, 2024, 2023, 2022].map(y => (
                            <Select.Option key={y} value={y}>{y}年</Select.Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="经费类型"
                        value={filters.fundingType || undefined}
                        onChange={value => setFilters({ ...filters, fundingType: value })}
                        style={{ width: 120 }}
                        allowClear
                    >
                        <Select.Option value="纵向">纵向</Select.Option>
                        <Select.Option value="横向">横向</Select.Option>
                    </Select>
                    <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
                        搜索
                    </Button>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    新增经费
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="FundingID"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
                scroll={{ x: 1200 }}
            />

            <Modal
                title={editingRecord ? '编辑经费' : '新增经费'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="ProjectID" label="关联项目">
                        <Input placeholder="项目ID（可选）" />
                    </Form.Item>
                    <Space style={{ width: '100%' }}>
                        <Form.Item
                            name="FundingType"
                            label="经费类型"
                            rules={[{ required: true, message: '请选择经费类型' }]}
                            style={{ width: 200 }}
                        >
                            <Select placeholder="请选择">
                                <Select.Option value="纵向">纵向</Select.Option>
                                <Select.Option value="横向">横向</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="Year"
                            label="年度"
                            rules={[{ required: true, message: '请输入年度' }]}
                            style={{ width: 200 }}
                        >
                            <Input type="number" />
                        </Form.Item>
                    </Space>
                    <Space style={{ width: '100%' }}>
                        <Form.Item name="BudgetAmount" label="预算金额" style={{ width: 150 }}>
                            <Input type="number" prefix="¥" />
                        </Form.Item>
                        <Form.Item name="ReceivedAmount" label="到账金额" style={{ width: 150 }}>
                            <Input type="number" prefix="¥" />
                        </Form.Item>
                        <Form.Item name="ExpenseAmount" label="支出金额" style={{ width: 150 }}>
                            <Input type="number" prefix="¥" />
                        </Form.Item>
                    </Space>
                    <Form.Item name="Description" label="说明">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Funding;

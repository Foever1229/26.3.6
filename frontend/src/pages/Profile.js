import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import request from '../utils/request';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const { user, setUser } = useAuth();

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const res = await request.get('/api/auth/profile');
            setUserInfo(res.data);
            form.setFieldsValue({
                username: res.data.Username,
                realName: res.data.RealName,
                department: res.data.Department,
                phone: res.data.Phone,
                email: res.data.Email,
            });
        } catch (error) {
            message.error('获取用户信息失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (values) => {
        try {
            setSaving(true);
            await request.put(`/api/users/${user.userId}`, {
                Username: values.username,
                RealName: values.realName,
                Department: values.department,
                Phone: values.phone,
                Email: values.email,
            });
            message.success('个人信息保存成功');
            // 更新本地存储的用户信息
            setUser({
                ...user,
                username: values.username,
                realName: values.realName,
                department: values.department,
                phone: values.phone,
                email: values.email,
            });
        } catch (error) {
            message.error('保存失败：' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (values) => {
        try {
            await request.post('/api/auth/change-password', {
                oldPassword: values.oldPassword,
                newPassword: values.newPassword,
            });
            message.success('密码修改成功');
            passwordForm.resetFields();
        } catch (error) {
            message.error('密码修改失败');
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 100 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <h2>个人中心</h2>
            <Card title="基本信息" style={{ marginBottom: 24 }}>
                <Form
                    form={form}
                    layout="vertical"
                    style={{ maxWidth: 500 }}
                    onFinish={handleSaveProfile}
                >
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input prefix={<UserOutlined />} />
                    </Form.Item>
                    <Form.Item
                        label="姓名"
                        name="realName"
                        rules={[{ required: true, message: '请输入姓名' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="部门"
                        name="department"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label="角色">
                        <Input value={userInfo?.RoleName} disabled />
                    </Form.Item>
                    <Form.Item
                        label="电话"
                        name="phone"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="邮箱"
                        name="email"
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                            保存修改
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            <Card title="修改密码">
                <Form
                    form={passwordForm}
                    layout="vertical"
                    style={{ maxWidth: 500 }}
                    onFinish={handleChangePassword}
                >
                    <Form.Item
                        label="原密码"
                        name="oldPassword"
                        rules={[{ required: true, message: '请输入原密码' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="请输入原密码" />
                    </Form.Item>
                    <Form.Item
                        label="新密码"
                        name="newPassword"
                        rules={[{ required: true, message: '请输入新密码' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
                    </Form.Item>
                    <Form.Item
                        label="确认新密码"
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: '请确认新密码' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('两次输入的密码不一致'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="请确认新密码" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            修改密码
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Profile;

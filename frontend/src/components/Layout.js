import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Dropdown, Avatar } from 'antd';
import {
    DashboardOutlined,
    ExperimentOutlined,
    BookOutlined,
    TeamOutlined,
    SettingOutlined,
    DownOutlined,
    LogoutOutlined,
    UserOutlined,
    FileTextOutlined,
    ProjectOutlined,
    DollarOutlined,
    TrophyOutlined,
    BulbOutlined,
    ScheduleOutlined,
    ReadOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = AntLayout;

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, hasRole } = useAuth();

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '数据大屏',
            roles: ['admin', 'leader', 'teacher', 'office', 'student']
        },
        {
            key: 'research',
            icon: <ExperimentOutlined />,
            label: '科研管理',
            roles: ['admin', 'leader', 'teacher', 'office', 'student'],
            children: [
                { key: '/research/paper', icon: <FileTextOutlined />, label: '论文管理', roles: ['admin', 'leader', 'teacher', 'office', 'student'] },
                { key: '/research/project', icon: <ProjectOutlined />, label: '项目管理', roles: ['admin', 'leader', 'teacher', 'office', 'student'] },
                { key: '/research/funding', icon: <DollarOutlined />, label: '经费管理', roles: ['admin', 'leader', 'office'] },
            ]
        },
        {
            key: 'teaching',
            icon: <BookOutlined />,
            label: '教学管理',
            roles: ['admin', 'leader', 'teacher', 'office', 'student'],
            children: [
                { key: '/teaching/task', icon: <FileTextOutlined />, label: '教学任务', roles: ['admin', 'leader', 'teacher', 'office', 'student'] },
            ]
        },
        {
            key: 'students',
            icon: <TeamOutlined />,
            label: '学生管理',
            roles: ['admin', 'leader', 'teacher', 'office', 'student'],
            children: [
                { key: '/students/list', icon: <TeamOutlined />, label: '学生信息', roles: ['admin', 'leader', 'office'] },
                { key: '/students/award', icon: <TrophyOutlined />, label: '竞赛获奖', roles: ['admin', 'leader', 'teacher', 'office', 'student'] },
                { key: '/students/innovation', icon: <BulbOutlined />, label: '大创项目', roles: ['admin', 'leader', 'teacher', 'office', 'student'] },
            ]
        },
        {
            key: 'enrollment',
            icon: <ScheduleOutlined />,
            label: '选课系统',
            roles: ['student'],
            children: [
                { key: '/enrollment/courses', icon: <ReadOutlined />, label: '可选课程', roles: ['student'] },
                { key: '/enrollment/my-courses', icon: <BookOutlined />, label: '我的课程', roles: ['student'] },
            ]
        },
        {
            key: 'system',
            icon: <SettingOutlined />,
            label: '系统管理',
            roles: ['admin'],
            children: [
                { key: '/system/users', icon: <UserOutlined />, label: '用户管理', roles: ['admin'] },
            ]
        },
    ];

    // 根据权限过滤菜单
    const filterMenuByRole = (items) => {
        return items
            .filter(item => !item.roles || item.roles.includes(user?.role))
            .map(item => ({
                ...item,
                children: item.children ? filterMenuByRole(item.children) : undefined
            }));
    };

    const filteredMenuItems = filterMenuByRole(menuItems);

    const handleMenuClick = ({ key }) => {
        navigate(key);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const userMenuItems = [
        { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
        { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ];

    const handleUserMenuClick = ({ key }) => {
        if (key === 'logout') {
            handleLogout();
        } else if (key === 'profile') {
            navigate('/profile');
        }
    };



    // 获取当前选中的菜单key
    const getSelectedKeys = () => {
        const pathname = location.pathname;
        return [pathname];
    };

    const getOpenKeys = () => {
        const pathname = location.pathname;
        if (pathname.includes('/research')) return ['research'];
        if (pathname.includes('/teaching')) return ['teaching'];
        if (pathname.includes('/students')) return ['students'];
        if (pathname.includes('/enrollment')) return ['enrollment'];
        if (pathname.includes('/system')) return ['system'];
        return [];
    };

    return (
        <AntLayout style={{ minHeight: '100vh' }}>
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                theme="light"
                style={{
                    boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                    zIndex: 10
                }}
            >
                <div style={{ 
                    height: 64, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <h2 style={{ 
                        margin: 0, 
                        color: '#1890ff',
                        fontSize: collapsed ? 16 : 18,
                        whiteSpace: 'nowrap'
                    }}>
                        {collapsed ? '数据' : '数据管理平台'}
                    </h2>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={getSelectedKeys()}
                    defaultOpenKeys={getOpenKeys()}
                    items={filteredMenuItems}
                    onClick={handleMenuClick}
                    style={{ borderRight: 0 }}
                />
            </Sider>
            <AntLayout>
                <Header style={{ 
                    background: '#fff', 
                    padding: '0 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                        计算机学院数据管理平台
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Dropdown
                            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                            placement="bottomRight"
                        >
                            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar icon={<UserOutlined />} />
                                <span>{user?.realName || user?.username}</span>
                                <DownOutlined style={{ fontSize: 12 }} />
                            </div>
                        </Dropdown>
                    </div>
                </Header>
                <Content style={{ 
                    margin: 24, 
                    padding: 24, 
                    background: '#fff',
                    borderRadius: 8,
                    minHeight: 280,
                    overflow: 'auto'
                }}>
                    <Outlet />
                </Content>
            </AntLayout>
        </AntLayout>
    );
};

export default Layout;

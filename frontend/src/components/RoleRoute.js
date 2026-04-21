import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

// 路由权限配置
const routePermissions = {
    '/research/funding': ['admin', 'leader', 'office'],
    '/teaching/course': ['admin', 'leader', 'office'],
    '/students/list': ['admin', 'leader', 'office'],
    '/system/users': ['admin'],
    '/enrollment/courses': ['student'],
    '/enrollment/my-courses': ['student'],
};

const RoleRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center' 
            }}>
                <Spin size="large" tip="加载中..." />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 检查当前路由是否需要权限控制
    const requiredRoles = routePermissions[location.pathname];
    
    if (requiredRoles && !requiredRoles.includes(user.role)) {
        return (
            <Result
                status="403"
                title="403"
                subTitle="抱歉，您没有权限访问此页面"
                extra={
                    <Button type="primary" onClick={() => navigate('/dashboard')}>
                        返回首页
                    </Button>
                }
            />
        );
    }

    return children;
};

export default RoleRoute;

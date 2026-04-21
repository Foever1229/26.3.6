import axios from 'axios';
import { message } from 'antd';

// 创建axios实例
const request = axios.create({
    baseURL: '',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        const { code, message: msg } = response.data;
        if (code !== 200) {
            message.error(msg || '请求失败');
            return Promise.reject(new Error(msg));
        }
        return response.data;
    },
    (error) => {
        if (error.response) {
            const { status, data } = error.response;
            if (status === 401) {
                message.error('登录已过期，请重新登录');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            } else if (status === 403) {
                message.error('权限不足');
            } else {
                message.error(data?.message || '服务器错误');
            }
        } else {
            message.error('网络错误');
        }
        return Promise.reject(error);
    }
);

export default request;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

import ResearchPaper from './pages/research/Paper';
import ResearchProject from './pages/research/Project';
import ResearchFunding from './pages/research/Funding';
import TeachingTask from './pages/teaching/Task';
import StudentList from './pages/students/StudentList';
import StudentAward from './pages/students/Award';
import StudentInnovation from './pages/students/Innovation';
import UserList from './pages/system/UserList';
import EnrollmentCourses from './pages/enrollment/Courses';
import MyCourses from './pages/enrollment/MyCourses';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="profile" element={<Profile />} />

                        <Route path="research/paper" element={<ResearchPaper />} />
                        <Route path="research/project" element={<ResearchProject />} />
                        <Route path="research/funding" element={<RoleRoute><ResearchFunding /></RoleRoute>} />
                        <Route path="teaching/task" element={<TeachingTask />} />
                        <Route path="students/list" element={<RoleRoute><StudentList /></RoleRoute>} />
                        <Route path="students/award" element={<StudentAward />} />
                        <Route path="students/innovation" element={<StudentInnovation />} />
                        <Route path="enrollment/courses" element={<RoleRoute><EnrollmentCourses /></RoleRoute>} />
                        <Route path="enrollment/my-courses" element={<RoleRoute><MyCourses /></RoleRoute>} />
                        <Route path="system/users" element={<RoleRoute><UserList /></RoleRoute>} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;

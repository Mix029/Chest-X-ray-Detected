import React, { useContext } from 'react';
import { Layout, Menu, Button, Space, Typography, Tag, Divider, Switch } from 'antd';
import { 
  DashboardOutlined, 
  SearchOutlined, 
  HistoryOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  UserOutlined,
  PieChartOutlined,
  LoadingOutlined,
  RobotOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  BulbFilled
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ThemeContext, ThemeProvider } from './context/ThemeContext';

import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Result from './pages/Result';
import History from './pages/History';
import Setting from './pages/Setting';
import Users from './pages/Users';
import Patients from './pages/Patients';
import Login from './pages/Login';
import About from './pages/About';

const { Header, Content, Sider } = Layout;
const { Text, Title } = Typography;

const AppLayout = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/patients', icon: <UserOutlined />, label: 'Patients' },
    { key: '/analysis', icon: <SearchOutlined />, label: 'Analysis' },
    { key: '/result', icon: <PieChartOutlined />, label: 'Result' },
    { key: '/history', icon: <HistoryOutlined />, label: 'History' },
    { key: '/about', icon: <InfoCircleOutlined />, label: 'About System' },
    user.role === 'admin' && { key: '/users', icon: <UserOutlined />, label: 'User Management' },
    user.role === 'admin' && { key: '/setting', icon: <SettingOutlined />, label: 'Settings' },
  ].filter(Boolean);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        theme={isDarkMode ? "dark" : "light"} 
        width={240}
        style={{ 
          borderRight: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
          position: 'fixed',
          height: '100vh',
          left: 0,
          zIndex: 100
        }}
      >
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{ 
            backgroundColor: '#1890ff', 
            borderRadius: '8px', 
            padding: '8px', 
            marginBottom: '8px',
            display: 'inline-block'
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: '24px' }} />
          </div>
          <Title level={4} style={{ margin: 0, color: isDarkMode ? '#fff' : '#0f4c81', letterSpacing: '0.5px' }}>MEDICAL AI</Title>
          <Text type="secondary" style={{ fontSize: '10px' }}>SENIOR PROJECT MIX</Text>
        </div>
        <Menu 
          theme={isDarkMode ? "dark" : "light"} 
          mode="inline" 
          selectedKeys={[location.pathname]} 
          items={menuItems} 
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none' }}
        />
      </Sider>
      <Layout style={{ marginLeft: 240, transition: 'all 0.2s', background: isDarkMode ? '#000' : '#f0f2f5' }}>
        <Header style={{ 
          background: isDarkMode ? '#141414' : '#fff', 
          padding: '0 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          height: '70px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          borderBottom: isDarkMode ? '1px solid #303030' : 'none',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          width: '100%'
        }}>
          <div>
            <Text strong style={{ fontSize: '18px', color: isDarkMode ? '#fff' : '#434343' }}>Clinical Decision Support System</Text>
          </div>
          <Space size="large">
            <Space>
              <BulbOutlined style={{ color: isDarkMode ? '#8c8c8c' : '#faad14' }} />
              <Switch 
                checked={isDarkMode} 
                onChange={toggleTheme} 
                size="small"
              />
              <BulbFilled style={{ color: isDarkMode ? '#faad14' : '#8c8c8c' }} />
            </Space>
            <Divider type="vertical" />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '4px 12px', 
              backgroundColor: isDarkMode ? '#1d1d1d' : '#f5f5f5', 
              borderRadius: '20px' 
            }}>
              <UserOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Text strong style={{ fontSize: '13px' }}>{user.name}</Text>
                <Tag color="blue" style={{ fontSize: '10px', margin: 0, lineHeight: '1.4', padding: '0 4px' }}>{user.role.toUpperCase()}</Tag>
              </div>
            </div>
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={() => { logout(); navigate('/login'); }}
              danger
            >
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: '24px', minHeight: '280px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/result" element={<Result />} />
              <Route path="/history" element={<History />} />
              <Route path="/about" element={<About />} />
              <Route path="/users" element={user.role === 'admin' ? <Users /> : <Navigate to="/dashboard" />} />
              <Route path="/setting" element={<Setting />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;

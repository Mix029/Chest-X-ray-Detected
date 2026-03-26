import React, { useContext, useState, useEffect } from 'react';
import { Tabs, Card, Form, Input, Button, Switch, Divider, Typography, Row, Col, Select, Slider, Table, Tag, message, Progress } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  RobotOutlined, 
  SafetyCertificateOutlined, 
  DatabaseOutlined,
  BellOutlined
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const SettingPage = () => {
  const { user, updateUser } = useContext(AuthContext);
  const { isDarkMode } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('1');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    if (user?.role !== 'admin') return;
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/audit', {
        headers: { 'x-auth-token': token }
      });
      setAuditLogs(res.data.map(log => ({ ...log, key: log._id })));
    } catch (err) {
      console.error('Failed to fetch audit logs');
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (activeTab === '3') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Profile Section
  const onProfileFinish = async (values) => {
    setUpdatingProfile(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/users/profile', 
        { name: values.name },
        { headers: { 'x-auth-token': token } }
      );
      
      updateUser({ name: res.data.name });
      message.success('Profile updated successfully');
    } catch (err) {
      message.error(err.response?.data?.msg || 'Failed to update profile');
    }
    setUpdatingProfile(false);
  };

  const onPasswordFinish = (values) => {
    message.success('Password changed successfully (Simulated)');
  };

  const logColumns = [
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'By', dataIndex: 'user', key: 'user', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Details', dataIndex: 'details', key: 'details' },
    { title: 'IP Address', dataIndex: 'ip', key: 'ip' },
    { 
      title: 'Timestamp', 
      dataIndex: 'timestamp', 
      key: 'timestamp',
      render: (date) => new Date(date).toLocaleString()
    },
  ];

  // Tab Content Items
  const items = [
    {
      key: '1',
      label: <span><UserOutlined /> My Account</span>,
      children: (
        <div style={{ padding: '20px' }}>
          <Row gutter={48}>
            <Col xs={24} md={12}>
              <Title level={4}>Profile Information</Title>
              <Form 
                layout="vertical" 
                initialValues={{ name: user?.name, username: user?.username, role: user?.role }} 
                onFinish={onProfileFinish}
              >
                <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Please enter your name' }]}>
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item label="Username" name="username">
                  <Input disabled />
                </Form.Item>
                <Form.Item label="System Role" name="role">
                  <Input disabled />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={updatingProfile}>Update Profile</Button>
              </Form>
            </Col>
            <Col xs={24} md={12}>
              <Title level={4}>Security</Title>
              <Form layout="vertical" onFinish={onPasswordFinish}>
                <Form.Item label="Current Password" name="currentPassword">
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Form.Item label="New Password" name="newPassword">
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Form.Item label="Confirm New Password" name="confirmPassword">
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Button type="primary" danger htmlType="submit">Change Password</Button>
              </Form>
            </Col>
          </Row>
        </div>
      ),
    },
    // Only Admin can see system settings
    user?.role === 'admin' ? {
      key: '2',
      label: <span><RobotOutlined /> AI System Config</span>,
      children: (
        <div style={{ padding: '20px' }}>
          <Title level={4}>AI Model Parameters</Title>
          <Row gutter={48}>
            <Col xs={24} md={12}>
              <Form layout="vertical">
                <Form.Item label="Active Model Version" tooltip="Select the production model for inference">
                  <Select defaultValue="densenet121_v1.2_opt">
                    <Option value="densenet121_v1.2_opt">DenseNet-121 v1.2 (Optimized - Production)</Option>
                    <Option value="resnet50_v2.0">ResNet-50 v2.0 (Testing)</Option>
                    <Option value="efficientnet_b0">EfficientNet-B0 (Experimental)</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Confidence Threshold (%)" tooltip="Alert when AI confidence is below this value">
                  <Slider defaultValue={75} marks={{ 0: '0%', 75: '75%', 100: '100%' }} />
                </Form.Item>
                <Form.Item label="Real-time Inference">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>Run AI automatically after upload</Text>
                    <Switch defaultChecked />
                  </div>
                </Form.Item>
              </Form>
            </Col>
            <Col xs={24} md={12}>
              <Card title="System Resources" size="small" style={{ backgroundColor: isDarkMode ? '#1d1d1d' : '#fafafa' }}>
                <div style={{ marginBottom: '15px' }}>
                  <Text type="secondary">Inference Server Status</Text><br />
                  <Tag color="green">ONLINE</Tag> <Text strong>v0.8.4-stable</Text>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <Text type="secondary">Storage Usage (Images)</Text><br />
                  <Text strong>14.2 GB / 100 GB (14%)</Text>
                  <Progress percent={14} size="small" />
                </div>
                <Button icon={<DatabaseOutlined />} block>Clear Temporary Cache</Button>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    } : null,
    user?.role === 'admin' ? {
      key: '3',
      label: <span><SafetyCertificateOutlined /> Security Audit</span>,
      children: (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Title level={4} style={{ margin: 0 }}>System Audit Logs</Title>
            <Button icon={<DatabaseOutlined />} onClick={fetchAuditLogs}>Refresh Logs</Button>
          </div>
          <Table dataSource={auditLogs} columns={logColumns} loading={loadingLogs} pagination={{ pageSize: 10 }} />
        </div>
      ),
    } : null,
    {
      key: '4',
      label: <span><BellOutlined /> Notifications</span>,
      children: (
        <div style={{ padding: '20px' }}>
          <Title level={4}>Preferences</Title>
          <div style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <Text>Email alerts for high-risk detections</Text>
              <Switch defaultChecked />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <Text>Browser desktop notifications</Text>
              <Switch defaultChecked />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <Text>Daily summary report (Admin only)</Text>
              <Switch disabled={user?.role !== 'admin'} />
            </div>
          </div>
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: isDarkMode ? '#1890ff' : '#0f4c81' }}>Settings</Title>
        <Text type="secondary">Manage your account preferences and system-wide configurations.</Text>
      </div>
      
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={items} 
          tabPosition="left"
          size="large"
        />
      </Card>
    </div>
  );
};

export default SettingPage;

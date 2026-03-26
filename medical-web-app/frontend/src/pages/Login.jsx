import React, { useContext, useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, LoadingOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    const { username, password } = values;

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      const userData = {
        username,
        name: res.data.name,
        role: res.data.role,
        token: res.data.token
      };

      login(userData);
      message.success(`Welcome back, ${userData.name}`);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.msg || 'Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)'
    }}>
      <Card style={{ width: 400, borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Title level={2} style={{ color: '#1890ff', margin: 0 }}>Medical AI System</Title>
          <Text type="secondary">Clinical Decision Support Portal</Text>
        </div>

        <Form
          name="login_form"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              style={{ height: '45px', borderRadius: '8px' }}
              loading={loading}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            © 2026 Senior Project MIX. All Rights Reserved.
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;

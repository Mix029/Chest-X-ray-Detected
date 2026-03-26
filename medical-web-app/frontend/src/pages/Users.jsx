import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Tag } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const { Option } = Select;

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useContext(AuthContext);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { 'x-auth-token': token }
      });
      setUsers(res.data);
    } catch (err) {
      message.error('Failed to fetch users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        username: user.username,
        name: user.name,
        role: user.role,
        password: '' // Don't show password
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
  };

  const onFinish = async (values) => {
    const token = localStorage.getItem('token');
    try {
      if (editingUser) {
        // Update User
        await axios.put(`http://localhost:5000/api/users/${editingUser._id}`, values, {
          headers: { 'x-auth-token': token }
        });
        message.success('User updated successfully');
      } else {
        // Create User
        await axios.post('http://localhost:5000/api/users', values, {
          headers: { 'x-auth-token': token }
        });
        message.success('User created successfully');
      }
      handleCancel();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.msg || 'Operation failed');
    }
  };

  const deleteUser = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { 'x-auth-token': token }
      });
      message.success('User deleted');
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.msg || 'Delete failed');
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { 
      title: 'Role', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => {
        let color = role === 'admin' ? 'volcano' : (role === 'doctor' ? 'green' : 'geekblue');
        return <Tag color={color}>{role.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showModal(record)}>Edit</Button>
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => deleteUser(record._id)}
            okText="Yes"
            cancelText="No"
            disabled={record.username === 'root'}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              disabled={record.username === 'root'}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2>User Management</h2>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={() => showModal()}
        >
          Add New User
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="_id" 
        loading={loading}
      />

      <Modal
        title={editingUser ? 'Edit User' : 'Add New User'}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input username' }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          
          <Form.Item
            name="password"
            label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
            rules={[{ required: !editingUser, message: 'Please input password' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please input full name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select placeholder="Select a role">
              <Option value="admin">Admin</Option>
              <Option value="doctor">Doctor</Option>
              <Option value="assistant">Assistant</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;

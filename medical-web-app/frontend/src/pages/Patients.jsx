import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Row, Col, List, Tag, Card, Typography } from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;

const PatientsPage = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/patients', {
        headers: { 'x-auth-token': token }
      });
      const sortedPatients = res.data.sort((a, b) => a.patientId.localeCompare(b.patientId, undefined, { numeric: true }));
      setPatients(sortedPatients);
    } catch (err) {
      message.error('Failed to fetch patients');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const showModal = (patient = null) => {
    setEditingPatient(patient);
    if (patient) {
      form.setFieldsValue(patient);
    } else {
      form.resetFields();
      const generatedId = `HN-${(patients.length + 1).toString().padStart(4, '0')}`;
      form.setFieldsValue({ patientId: generatedId, bloodGroup: 'Unknown' });
    }
    setIsModalVisible(true);
  };

  const goToTimeline = (patientId) => {
    // นำทางไปยังหน้า History พร้อมส่ง patientId ไปเพื่อให้เปิด Timeline อัตโนมัติ
    navigate('/history', { state: { patientId: patientId } });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingPatient(null);
  };

  const onFinish = async (values) => {
    const token = localStorage.getItem('token');
    try {
      if (editingPatient) {
        await axios.put(`http://localhost:5000/api/patients/${editingPatient._id}`, values, {
          headers: { 'x-auth-token': token }
        });
        message.success('Patient updated');
      } else {
        await axios.post('http://localhost:5000/api/patients', values, {
          headers: { 'x-auth-token': token }
        });
        message.success('Patient registered');
      }
      handleCancel();
      fetchPatients();
    } catch (err) {
      message.error(err.response?.data?.msg || 'Operation failed');
    }
  };

  const deletePatient = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/api/patients/${id}`, {
        headers: { 'x-auth-token': token }
      });
      message.success('Deleted');
      fetchPatients();
    } catch (err) {
      message.error('Delete failed');
    }
  };

  const baseColumns = [
    { 
      title: 'Patient ID', 
      dataIndex: 'patientId', 
      key: 'patientId', 
      fixed: 'left',
      render: (id) => <Text strong style={{ color: isDarkMode ? '#1890ff' : '#0f4c81' }}>{id}</Text>
    },
    { 
      title: 'Name', 
      key: 'fullName', 
      render: (_, rec) => `${rec.firstName} ${rec.lastName}` 
    },
    { 
      title: 'Age', 
      dataIndex: 'age', 
      key: 'age', 
      render: (age) => `${age}Y` 
    },
    { 
      title: 'Gender', 
      dataIndex: 'gender', 
      key: 'gender',
      render: (gender) => (
        <Tag color={gender === 'Male' ? 'blue' : gender === 'Female' ? 'magenta' : 'default'}>
          {gender}
        </Tag>
      )
    },
    { 
      title: 'Blood', 
      dataIndex: 'bloodGroup', 
      key: 'bloodGroup', 
      render: (bg) => <Tag color="volcano">{bg || 'N/A'}</Tag>
    }
  ];

  // Add Contact column for Admin and Assistant
  if (user && (user.role === 'admin' || user.role === 'assistant')) {
    baseColumns.push({
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
      render: (contact) => contact ? <Space><PhoneOutlined style={{ color: '#8c8c8c' }} />{contact}</Space> : <Text type="secondary">-</Text>
    });
  }

  const actionColumn = {
    title: 'Action',
    key: 'action',
    align: 'right',
    render: (_, record) => (
      <Space size="small">
        <Button 
          type="primary" 
          ghost 
          size="small" 
          icon={<HistoryOutlined />} 
          onClick={() => goToTimeline(record.patientId)}
        >
          History
        </Button>
        <Button 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => showModal(record)} 
        />
        <Popconfirm title="Delete this patient?" onConfirm={() => deletePatient(record._id)}>
          <Button danger ghost size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
  };

  const columns = [...baseColumns, actionColumn];

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: isDarkMode ? '#1890ff' : '#0f4c81' }}>Patient Registry</Title>
          <Text type="secondary">Manage patient profiles and diagnostic history</Text>
        </div>
        <Button 
          type="primary" 
          size="large" 
          icon={<UserAddOutlined />} 
          onClick={() => showModal()} 
          style={{ borderRadius: '8px' }}
        >
          Register New Patient
        </Button>
      </div>

      <Card bordered={false}>
        <Table 
          columns={columns} 
          dataSource={patients} 
          rowKey="_id" 
          loading={loading} 
          pagination={{ pageSize: 8 }} 
        />
      </Card>

      <Modal 
        title={editingPatient ? 'Update Patient' : 'Register New Patient'} 
        open={isModalVisible} 
        onCancel={handleCancel} 
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientId" label="Patient ID" rules={[{ required: true }]}>
                <Input disabled={!!editingPatient} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodGroup" label="Blood Group" rules={[{ required: true }]}>
                <Select>
                  <Option value="A">A</Option>
                  <Option value="B">B</Option>
                  <Option value="AB">AB</Option>
                  <Option value="O">O</Option>
                  <Option value="Unknown">Unknown</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="age" label="Age" rules={[{ required: true }]}><Input type="number" /></Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                <Select>
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="contact" label="Contact Number"><Input /></Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PatientsPage;

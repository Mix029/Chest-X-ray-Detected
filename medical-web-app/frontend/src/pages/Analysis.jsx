import React, { useState, useEffect, useContext } from 'react';
import { Card, Select, Upload, Button, message, Divider, Descriptions, Empty, Row, Col, Typography } from 'antd';
import { UploadOutlined, SearchOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';

const { Option } = Select;
const { Title, Text } = Typography;

const AnalysisPage = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setFetchingPatients(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/patients', {
        headers: { 'x-auth-token': token }
      });
      setPatients(res.data);
    } catch (err) {
      message.error('Failed to fetch patients list');
    }
    setFetchingPatients(false);
  };

  const handlePatientChange = (value) => {
    const patient = patients.find(p => p.patientId === value);
    setSelectedPatient(patient);
  };

  const handleUpload = async () => {
    if (!selectedPatient || fileList.length === 0) {
      message.error('Please select a patient and upload an image.');
      return;
    }

    setAnalyzing(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', fileList[0].originFileObj);
    formData.append('patientId', selectedPatient.patientId);

    try {
      const res = await axios.post('http://localhost:5000/api/analysis/predict', formData, {
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      message.success('Analysis complete and saved automatically!');
      setAnalyzing(false);
      
      // อัตโนมัติ: เด้งไปหน้า Result พร้อมส่งข้อมูลผลลัพธ์ไปด้วย
      navigate('/result', { state: { analysisData: res.data, patient: selectedPatient } });
      
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.msg || 'Inference or connection failed.');
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <Title level={2} style={{ color: isDarkMode ? '#1890ff' : '#0f4c81', margin: 0 }}>Diagnostic Inference</Title>
        <Text type="secondary">AI-powered X-ray analysis for clinical decision support</Text>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={10}>
          <Card 
            title={<span><SearchOutlined style={{ marginRight: '8px' }} /> Step 1: Select Patient</span>}
            bordered={false}
            style={{ height: '100%' }}
          >
            <Select
              showSearch
              loading={fetchingPatients}
              style={{ width: '100%', marginBottom: '20px' }}
              placeholder="Search by Patient ID"
              optionFilterProp="children"
              onChange={handlePatientChange}
              size="large"
            >
              {patients.map(p => (
                <Option key={p.patientId} value={p.patientId}>
                  {p.patientId} - {p.firstName} {p.lastName}
                </Option>
              ))}
            </Select>

            {selectedPatient ? (
              <div style={{ 
                padding: '16px', 
                backgroundColor: isDarkMode ? '#1d1d1d' : '#f9f9f9', 
                borderRadius: '8px',
                border: isDarkMode ? '1px solid #303030' : 'none'
              }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name"><Text strong>{selectedPatient.firstName} {selectedPatient.lastName}</Text></Descriptions.Item>
                  <Descriptions.Item label="ID">{selectedPatient.patientId}</Descriptions.Item>
                  <Descriptions.Item label="Age/Gender">{selectedPatient.age} / {selectedPatient.gender}</Descriptions.Item>
                </Descriptions>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Empty description="Please select a patient to continue" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card 
            title={<span><UploadOutlined style={{ marginRight: '8px' }} /> Step 2: Analysis & Processing</span>}
            bordered={false}
          >
            <div style={{ 
              border: isDarkMode ? '2px dashed #303030' : '2px dashed #d9d9d9', 
              borderRadius: '12px', 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: fileList.length > 0 ? (isDarkMode ? '#162312' : '#f6ffed') : (isDarkMode ? '#141414' : '#fafafa'),
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}>
              <Upload
                listType="picture"
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                onRemove={() => setFileList([])}
              >
                {fileList.length === 0 && (
                  <div>
                    <div style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}><UploadOutlined /></div>
                    <Title level={5}>Drop X-ray Image Here</Title>
                    <Text type="secondary">Click or drag file to this area to upload</Text>
                  </div>
                )}
              </Upload>
            </div>

            <Divider />

            <Button
              type="primary"
              size="large"
              block
              loading={analyzing}
              disabled={!selectedPatient || fileList.length === 0}
              onClick={handleUpload}
              style={{ 
                height: '55px', 
                fontSize: '16px', 
                borderRadius: '8px',
                backgroundColor: '#1890ff',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)'
              }}
            >
              {analyzing ? 'Processing Analysis...' : 'Start AI Analysis'}
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalysisPage;


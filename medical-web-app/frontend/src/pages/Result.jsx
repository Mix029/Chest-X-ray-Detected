import React, { useState, useEffect, useContext } from 'react';
import { Card, Row, Col, Typography, Tag, Progress, Button, Space, Divider, Descriptions, Empty, Alert } from 'antd';
import { 
  ArrowLeftOutlined, 
  HistoryOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const ResultPage = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { analysisData, patient } = location.state || {};
  
  const [previousRecord, setPreviousRecord] = useState(null);

  useEffect(() => {
    if (analysisData && patient) {
      fetchPatientHistory();
    }
  }, [analysisData, patient]);

  const fetchPatientHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/patients/${patient._id || patient.id}`, {
        headers: { 'x-auth-token': token }
      });
      const history = res.data.history || [];
      if (history.length > 1) {
        setPreviousRecord(history[1]);
      }
    } catch (err) {
      console.error('Failed to fetch previous history');
    }
  };

  if (!analysisData) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Empty description="No analysis data found." />
        <Button type="primary" onClick={() => navigate('/analysis')}>Go to Analysis</Button>
      </div>
    );
  }

  const getImageUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/400?text=No+Image';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000/${path.replace(/\\/g, '/')}`;
  };

  const confidencePercent = Math.round(analysisData.confidence * 100);
  const isLowConfidence = confidencePercent < 70;
  const statusColor = analysisData.prediction === 'Normal' ? 'green' : 'red';

  return (
    <div style={{ padding: '0 24px 24px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Action Bar - Cleaned up as requested */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/analysis')}>New Analysis</Button>
          <Title level={3} style={{ margin: 0 }}>Diagnostic Report</Title>
        </Space>
        <Space>
          <Button 
            type="primary" 
            icon={<HistoryOutlined />} 
            onClick={() => navigate('/history')}
            style={{ borderRadius: '8px' }}
          >
            Go to History
          </Button>
        </Space>
      </div>

      {isLowConfidence && (
        <Alert
          message="Attention: Low AI Confidence"
          description={`AI Confidence is ${confidencePercent}%. Please review carefully.`}
          type="warning"
          showIcon
          style={{ marginBottom: '20px', borderRadius: '12px' }}
        />
      )}

      {/* Main Analysis Section (Current) */}
      <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={12}>
            <Title level={4}>[1] Original X-ray Image</Title>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
              <img src={getImageUrl(analysisData.originalImagePath)} alt="Original" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <Title level={4}>[2] AI Inference (Grad-CAM)</Title>
            <div style={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
              <img src={getImageUrl(analysisData.gradcamImagePath)} alt="Grad-CAM" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
            </div>
          </Col>
        </Row>

        <Divider />

        <Row gutter={32} align="middle">
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Predicted Diagnosis</Text>
              <Title level={1} style={{ margin: '8px 0', color: statusColor === 'green' ? '#52c41a' : '#ff4d4f' }}>
                {analysisData.prediction.toUpperCase()}
              </Title>
              <Tag color={statusColor} style={{ fontSize: '16px', padding: '4px 16px' }}>
                {analysisData.prediction === 'Normal' ? 'NEGATIVE' : 'POSITIVE'}
              </Tag>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ backgroundColor: isDarkMode ? '#1d1d1d' : '#fafafa', padding: '20px', borderRadius: '12px' }}>
              <Row align="middle" gutter={16}>
                <Col span={8}>
                  <Progress type="circle" percent={confidencePercent} width={80} strokeColor={{ '0%': '#108ee9', '100%': '#52c41a' }} />
                </Col>
                <Col span={16}>
                  <Text strong>AI Confidence Score</Text><br />
                  <Text type="secondary">Based on DenseNet-121 Architecture</Text>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Card>

      <Card style={{ marginTop: '24px', borderRadius: '16px' }}>
        <Descriptions title="Patient Information" bordered size="small">
          <Descriptions.Item label="Full Name">{patient?.firstName} {patient?.lastName}</Descriptions.Item>
          <Descriptions.Item label="Patient ID">{patient?.patientId}</Descriptions.Item>
          <Descriptions.Item label="Age / Gender">{patient?.age} / {patient?.gender}</Descriptions.Item>
          <Descriptions.Item label="Analysis Date">{new Date(analysisData.timestamp).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Physician">{user?.name}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default ResultPage;

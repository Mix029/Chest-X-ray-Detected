import React, { useState, useEffect, useContext } from 'react';
import { Card, Row, Col, Typography, Tag, Progress, Button, Space, Divider, Descriptions, Empty, Alert } from 'antd';
import { 
  ArrowLeftOutlined, 
  HistoryOutlined,
  ExclamationCircleOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  WarningOutlined
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
  const isLowConfidence = confidencePercent < 90;
  
  // ✅ ROBUST LOGIC FOR COMPARISON
  const prediction = analysisData.prediction || "";
  const actualLabel = analysisData.actualResult || "";
  
  const clean = (str) => String(str).replace(/[-_ ]/g, '').toLowerCase().trim();
  const isCorrect = clean(prediction) === clean(actualLabel);

  // Mapping สำหรับแสดงชื่อสวยๆ
  const displayNames = {
    'Normal': 'Normal',
    'Lung_Opacity': 'Lung Opacity',
    'COVID-19': 'COVID-19',
    'Viral_Pneumonia': 'Viral Pneumonia'
  };
  const getDisplayName = (label) => displayNames[label] || label;

  // 1. สีชื่อโรค: Normal = เขียว, โรคอื่นๆ = แดง
  const titleColor = (prediction === 'Normal') ? '#52c41a' : '#ff4d4f';

  // Process Top 2 results
  const sortedProbs = [...(analysisData.allProbabilities || [])].sort((a, b) => b.confidence - a.confidence);
  const primaryResult = sortedProbs[0] || { label: analysisData.prediction, confidence: analysisData.confidence };
  const secondaryResult = sortedProbs[1] || null;
  
  // Warning if gap is small (Ambiguous result)
  const isAmbiguous = secondaryResult && (primaryResult.confidence - secondaryResult.confidence) < 0.15;

  return (
    <div style={{ padding: '0 24px 24px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/analysis')}>New Analysis</Button>
          <Title level={3} style={{ margin: 0 }}>Diagnostic Report</Title>
        </Space>
        <Space>
          <Button 
            type="primary" 
            icon={<HistoryOutlined />} 
            onClick={() => navigate('/history', { state: { patientId: analysisData.patientId } })}
            style={{ borderRadius: '8px' }}
          >
            Go to History
          </Button>
        </Space>
      </div>

      {isLowConfidence && isAmbiguous && (
        <Alert
          message="Ambiguous Diagnostic Result"
          description={`The AI is closely split between ${getDisplayName(primaryResult.label)} and ${getDisplayName(secondaryResult.label)}. High clinical correlation required.`}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: '20px', borderRadius: '12px' }}
        />
      )}

      {isLowConfidence && !isAmbiguous && (
        <Alert
          message="Attention: Low AI Confidence"
          description={`AI Confidence is ${confidencePercent}%. Please review carefully.`}
          type="warning"
          showIcon
          style={{ marginBottom: '20px', borderRadius: '12px' }}
        />
      )}

      {/* Main Analysis Section */}
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
          <Col xs={24} md={10}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '14px', letterSpacing: '1px' }}>PREDICTED DIAGNOSIS</Text>
              <Title level={1} style={{ margin: '4px 0', color: titleColor, fontWeight: '800' }}>
                {getDisplayName(prediction).toUpperCase()}
              </Title>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  AI Confidence: <Text strong style={{ color: titleColor }}>{confidencePercent}%</Text>
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} md={14}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ backgroundColor: isDarkMode ? '#1d1d1d' : '#f0f7ff', padding: '15px', borderRadius: '12px', border: '1px solid #1890ff', height: '100%' }}>
                  <Text strong style={{ color: '#1890ff' }}>Primary Confidence</Text>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                    <Progress type="circle" percent={confidencePercent} width={50} strokeColor="#1890ff" />
                    <div style={{ marginLeft: '10px' }}>
                      <Text strong style={{ fontSize: '15px' }}>{getDisplayName(primaryResult.label)}</Text>
                    </div>
                  </div>
                </div>
              </Col>
              {secondaryResult && (
                <Col span={12}>
                  <div style={{ backgroundColor: isDarkMode ? '#1d1d1d' : '#fff1f0', padding: '15px', borderRadius: '12px', border: '1px solid #ff4d4f', height: '100%' }}>
                    <Text strong style={{ color: '#cf1322' }}>Secondary Consideration</Text>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                      <Progress type="circle" percent={Math.round(secondaryResult.confidence * 100)} width={50} strokeColor="#ff4d4f" />
                      <div style={{ marginLeft: '10px' }}>
                        <Text strong style={{ fontSize: '15px' }}>{getDisplayName(secondaryResult.label)}</Text>
                      </div>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
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

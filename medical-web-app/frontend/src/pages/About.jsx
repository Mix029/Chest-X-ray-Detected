import React from 'react';
import { Typography, Card, Row, Col, Tag, Divider, Timeline, Alert } from 'antd';
import { 
  ExperimentOutlined, 
  DatabaseOutlined, 
  SafetyCertificateOutlined, 
  BulbOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const AboutPage = () => {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <ExperimentOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <Title level={1}>Medical AI Diagnostics Core</Title>
        <Text type="secondary" style={{ fontSize: '18px' }}>
          Deep Learning Architecture for Clinical Decision Support
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Title level={3}><BulbOutlined /> Model Architecture: DenseNet-121</Title>
            <Paragraph style={{ fontSize: '16px' }}>
              Our system utilizes the <strong>DenseNet-121 (Densely Connected Convolutional Networks)</strong> architecture. 
              In this model, each layer connects to every other layer in a feed-forward fashion, reducing the vanishing-gradient problem and 
              strengthening feature propagation.
            </Paragraph>
            <Divider />
            <Row gutter={16}>
              <Col span={8}>
                <Card type="inner" title="Parameters">
                  <Text strong style={{ fontSize: '20px' }}>7.2M+</Text><br />
                  <Text type="secondary">Trainable Weights</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card type="inner" title="Layers">
                  <Text strong style={{ fontSize: '20px' }}>121</Text><br />
                  <Text type="secondary">Deep Convolutional Layers</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card type="inner" title="Feature Re-use">
                  <Text strong style={{ fontSize: '20px' }}>Enabled</Text><br />
                  <Text type="secondary">Dense Blocks Connectivity</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={<span><DatabaseOutlined /> Training Dataset</span>} bordered={false} style={{ height: '100%', borderRadius: '16px' }}>
            <Timeline
              items={[
                { children: 'Source: NIH Chest X-ray & COVID-19 Radiography Database' },
                { children: 'Classes: COVID-19, Normal, Lung Opacity, Viral Pneumonia' },
                { children: 'Pre-processing: Histogram Equalization & Resize (224x224)' },
                { children: 'Augmentation: Rotation, Horizontal Flip, Color Jitter' },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={<span><SafetyCertificateOutlined /> AI Inference Process</span>} bordered={false} style={{ height: '100%', borderRadius: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <Text><strong>Image Normalization:</strong> Consistent scale & contrast</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <Text><strong>Softmax Activation:</strong> Probability distribution across classes</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <Text><strong>Grad-CAM:</strong> Activation mapping for explainability</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={24}>
          <Alert
            message="Ethical Disclaimer"
            description="This AI system is designed for educational and decision-support purposes only. It is not intended to replace the clinical judgment of a licensed healthcare professional. All AI-generated inferences should be verified by a certified radiologist."
            type="info"
            showIcon
            style={{ borderRadius: '12px' }}
          />
        </Col>
      </Row>
    </div>
  );
};

export default AboutPage;

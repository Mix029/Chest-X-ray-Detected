import React, { useState, useEffect, useContext } from 'react';
import { Card, Row, Col, Statistic, Typography, Skeleton, Space, List, Tag, Divider } from 'antd';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, Users, ShieldCheck, PieChart as PieIcon } from 'lucide-react';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';

const { Title, Text } = Typography;

const COLORS = ['#52c41a', '#ff4d4f', '#faad14', '#1890ff'];

const Dashboard = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [stats, setStats] = useState({ 
    totalCount: 0, 
    todayCount: 0, 
    accuracy: 0, 
    trendData: [], 
    distribution: [] 
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/analysis/stats', {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <Skeleton active style={{ padding: '24px' }} />;

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0, color: isDarkMode ? '#1890ff' : '#0f4c81' }}>System Overview</Title>
        <Text type="secondary">Real-time statistics and diagnostic performance</Text>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '12px', backgroundColor: isDarkMode ? '#111b26' : '#e6f7ff', borderRadius: '12px', marginRight: '16px' }}>
                <Activity size={24} color="#1890ff" />
              </div>
              <Statistic title={<Text type="secondary">Total Analyses</Text>} value={stats.totalCount} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '12px', backgroundColor: isDarkMode ? '#162312' : '#f6ffed', borderRadius: '12px', marginRight: '16px' }}>
                <Users size={24} color="#52c41a" />
              </div>
              <Statistic title={<Text type="secondary">Analyses Today</Text>} value={stats.todayCount} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} bodyStyle={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '12px', backgroundColor: isDarkMode ? '#2b2111' : '#fff7e6', borderRadius: '12px', marginRight: '16px' }}>
                <ShieldCheck size={24} color="#faad14" />
              </div>
              <Statistic title={<Text type="secondary">Overall Confidence</Text>} value={stats.accuracy} precision={1} suffix="%" />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={15}>
          <Card 
            title={<Space><Activity size={18} /> <Text strong>Weekly Analysis Trend</Text></Space>} 
            bordered={false}
            style={{ borderRadius: '16px', minHeight: '500px' }}
          >
            <div style={{ height: 380, marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#303030' : '#f0f0f0'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: isDarkMode ? '#1f1f1f' : '#fff' }} />
                  <Line type="monotone" dataKey="count" stroke="#1890ff" strokeWidth={4} dot={{ r: 4, fill: '#1890ff', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Analyses" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card 
            title={<Space><PieIcon size={18} /> <Text strong>AI Performance by Class</Text></Space>} 
            bordered={false}
            style={{ borderRadius: '16px', minHeight: '500px' }}
          >
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1f1f1f' : '#fff' }}
                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <Divider style={{ margin: '12px 0' }} />
            
            <List
              dataSource={stats.distribution}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '8px 0', border: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Space>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                      <Text strong style={{ fontSize: '13px' }}>{item.name}</Text>
                    </Space>
                    <Space size="large">
                      <div><Text type="secondary" style={{ fontSize: '12px' }}>Count:</Text> <Text strong>{item.value}</Text></div>
                      <div>
                        <Tag color={item.avgConf > 85 ? 'green' : 'orange'} style={{ borderRadius: '4px', margin: 0 }}>
                          Avg: {item.avgConf ? item.avgConf.toFixed(1) : 0}%
                        </Tag>
                      </div>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

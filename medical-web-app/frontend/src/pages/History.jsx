import React, { useState, useEffect, useContext } from 'react';
import { Table, Tag, Space, Button, Card, Input, message, Modal, Row, Col, Typography, Divider, Progress, Descriptions, Popconfirm, Timeline, Avatar, Alert } from 'antd';
import { 
  FileSearchOutlined, 
  ReloadOutlined, 
  PrinterOutlined, 
  DeleteOutlined, 
  UserOutlined, 
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const HistoryPage = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  
  // States
  const [allRecords, setAllRecords] = useState([]); 
  const [patientGroups, setPatientGroups] = useState([]); 
  const [filteredGroups, setFilteredGroups] = useState([]); 
  const [patientMap, setPatientMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Drill-down State
  const [selectedPatientGroup, setSelectedPatientGroup] = useState(null); 
  const [patientDetails, setPatientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Delete Confirmation State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [confirmTextInput, setConfirmTextInput] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch both history and patients to map names
      const [historyRes, patientsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/analysis/history', {
          headers: { 'x-auth-token': token }
        }),
        axios.get('http://localhost:5000/api/patients', {
          headers: { 'x-auth-token': token }
        })
      ]);

      // Create name map
      const map = {};
      patientsRes.data.forEach(p => {
        map[p.patientId] = `${p.firstName} ${p.lastName}`;
      });
      setPatientMap(map);

      setAllRecords(historyRes.data);
      groupDataByPatient(historyRes.data);
    } catch (err) {
      message.error('Failed to fetch history');
    }
    setLoading(false);
  };

  const groupDataByPatient = (records) => {
    const groups = records.reduce((acc, curr) => {
      if (!acc[curr.patientId]) {
        acc[curr.patientId] = {
          patientId: curr.patientId,
          records: [],
          lastAnalysis: curr.timestamp,
          recordCount: 0
        };
      }
      acc[curr.patientId].records.push(curr);
      acc[curr.patientId].recordCount += 1;
      if (new Date(curr.timestamp) > new Date(acc[curr.patientId].lastAnalysis)) {
        acc[curr.patientId].lastAnalysis = curr.timestamp;
      }
      return acc;
    }, {});

    const sortedGroups = Object.values(groups).sort((a, b) => 
      new Date(b.lastAnalysis) - new Date(a.lastAnalysis)
    );
    
    setPatientGroups(sortedGroups);
    setFilteredGroups(sortedGroups);

    // ✅ If navigating from Patient page
    if (location.state?.patientId) {
      const targetGroup = sortedGroups.find(g => g.patientId === location.state.patientId);
      if (targetGroup) {
        handleSelectPatient(targetGroup);
      }
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [location.state]);

  const handleSelectPatient = async (group) => {
    setSelectedPatientGroup(group);
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/patients/hn/${group.patientId}`, {
        headers: { 'x-auth-token': token }
      });
      setPatientDetails(res.data);
    } catch (err) {
      setPatientDetails(null);
    }
    setLoadingDetails(false);
  };

  useEffect(() => {
    const filtered = patientGroups.filter(group => {
      const name = (patientMap[group.patientId] || '').toLowerCase();
      const id = group.patientId.toLowerCase();
      const search = searchText.toLowerCase();
      return id.includes(search) || name.includes(search);
    });
    setFilteredGroups(filtered);
  }, [searchText, patientGroups, patientMap]);

  const showDetails = (record) => {
    setSelectedRecord(record);
    setIsModalVisible(true);
  };

  const openDeleteModal = (e, record) => {
    e.stopPropagation(); // Prevent opening details modal
    setRecordToDelete(record);
    setConfirmTextInput('');
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (confirmTextInput !== 'ยืนยันการลบ') {
      message.error('โปรดพิมพ์คำยืนยันให้ถูกต้อง');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/analysis/${recordToDelete._id}`, {
        headers: { 'x-auth-token': token }
      });
      message.success('Record deleted successfully');
      setDeleteModalVisible(false);
      
      // Update local state to reflect deletion without full reload
      const updatedGroups = patientGroups.map(group => {
        if (group.patientId === recordToDelete.patientId) {
          const updatedRecords = group.records.filter(r => r._id !== recordToDelete._id);
          return {
            ...group,
            records: updatedRecords,
            recordCount: updatedRecords.length
          };
        }
        return group;
      }).filter(group => group.recordCount > 0);

      setPatientGroups(updatedGroups);
      
      // Update selected patient group if needed
      if (selectedPatientGroup && selectedPatientGroup.patientId === recordToDelete.patientId) {
        const updatedSelectedRecords = selectedPatientGroup.records.filter(r => r._id !== recordToDelete._id);
        if (updatedSelectedRecords.length === 0) {
          setSelectedPatientGroup(null);
        } else {
          setSelectedPatientGroup({
            ...selectedPatientGroup,
            records: updatedSelectedRecords,
            recordCount: updatedSelectedRecords.length
          });
        }
      }
      
      fetchHistory(); // Refresh to ensure sync
    } catch (err) {
      message.error('Failed to delete');
    }
  };

  const getImageUrl = (path) => {
    if (!path) return 'https://via.placeholder.com/400?text=No+Image';
    if (path.startsWith('http')) return path;
    return `http://localhost:5000/${path.replace(/\\/g, '/')}`;
  };

  const masterColumns = [
    { title: 'Patient ID', dataIndex: 'patientId', key: 'patientId', render: (id) => <Space><UserOutlined style={{ color: '#1890ff' }} /><Text strong>{id}</Text></Space> },
    { title: 'Name', key: 'name', render: (_, record) => <Text>{patientMap[record.patientId] || 'N/A'}</Text> },
    { title: 'Total Records', dataIndex: 'recordCount', key: 'recordCount', align: 'center', render: (count) => <Tag color="blue">{count} Visits</Tag> },
    { title: 'Last Analysis', dataIndex: 'lastAnalysis', key: 'lastAnalysis', render: (date) => <Space><CalendarOutlined style={{ color: '#8c8c8c' }} />{new Date(date).toLocaleDateString()}</Space> },
    { title: 'Action', key: 'action', align: 'right', render: (_, record) => <Button type="primary" ghost onClick={() => handleSelectPatient(record)}>View Timeline</Button> },
  ];

  return (
    <div style={{ padding: '0' }}>
      <style>
        {`
          @media print {
            @page { margin: 0; size: auto; }
            html, body { height: 100%; margin: 0 !important; padding: 0 !important; overflow: hidden; }
            .ant-layout, .ant-layout-header, .ant-layout-sider, .ant-layout-content { display: none !important; }
            .ant-modal-root { display: block !important; }
            .ant-modal-mask { display: none !important; }
            .ant-modal-wrap { position: absolute !important; top: 0 !important; left: 0 !important; margin: 0 !important; padding: 0 !important; display: block !important; width: 100% !important; }
            .ant-modal { top: 0 !important; left: 0 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; }
            .ant-modal-content { box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important; }
            .ant-modal-header, .ant-modal-footer, .ant-modal-close { display: none !important; }
            #printable-report { display: block !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 15mm !important; background-color: white !important; color: black !important; }
          }
          
          /* ✅ Timeline Styles */
          .tight-timeline .ant-timeline-item-label {
            width: 90px !important;
            padding-right: 15px !important;
            text-align: right !important;
          }
          .tight-timeline .ant-timeline-item-tail,
          .tight-timeline .ant-timeline-item-head,
          .tight-timeline .ant-timeline-item-head-custom {
            left: 90px !important;
          }
          .tight-timeline .ant-timeline-item-content {
            left: 90px !important;
            width: calc(100% - 100px) !important;
            padding-left: 20px !important;
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Space size="middle">
          {selectedPatientGroup && <Button icon={<ArrowLeftOutlined />} onClick={() => { setSelectedPatientGroup(null); setPatientDetails(null); }} shape="circle" />}
          <Title level={2} style={{ margin: 0, color: isDarkMode ? '#1890ff' : '#0f4c81' }}>
            {selectedPatientGroup ? `Patient Case File` : 'Analysis History'}
          </Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchHistory} size="large">Refresh</Button>
      </div>

      {!selectedPatientGroup ? (
        <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px' }}>
            <Input.Search placeholder="Search by Patient ID..." style={{ maxWidth: '400px' }} allowClear onChange={e => setSearchText(e.target.value)} size="large" />
          </div>
          <Table columns={masterColumns} dataSource={filteredGroups} rowKey="patientId" loading={loading} pagination={{ pageSize: 10 }} />
        </Card>
      ) : (
        <Row gutter={16}> 
          <Col xs={24} lg={7}> 
            <Card loading={loadingDetails} bordered={false} style={{ borderRadius: '12px', marginBottom: '24px', position: 'sticky', top: 94, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Avatar size={84} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginBottom: '16px' }} />
                <Title level={4} style={{ margin: 0 }}>{patientDetails ? `${patientDetails.firstName} ${patientDetails.lastName}` : selectedPatientGroup.patientId}</Title>
                <Tag color="blue" style={{ marginTop: '8px' }}>{selectedPatientGroup.patientId}</Tag>
              </div>
              <Divider />
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Age">{patientDetails?.age ? `${patientDetails.age} Years` : 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Gender">{patientDetails?.gender || 'N/A'}</Descriptions.Item>
                <Descriptions.Item label="Blood Group"><Tag color="volcano">{patientDetails?.bloodGroup || 'N/A'}</Tag></Descriptions.Item>
                <Descriptions.Item label="Contact">{patientDetails?.contact || 'N/A'}</Descriptions.Item>
              </Descriptions>
              <Divider />
              <div style={{ padding: '12px', backgroundColor: isDarkMode ? '#1d1d1d' : '#f9f9f9', borderRadius: '8px' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Medical Summary:</Text>
                  <Text strong style={{ fontSize: '13px' }}>Total Visit Records: {selectedPatientGroup.recordCount}</Text>
                </Space>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={17}> 
            <Card 
              title={
                <Space>
                  <HistoryOutlined style={{ color: '#1890ff' }} />
                  <span>Diagnostic Journey & Progress Timeline</span>
                </Space>
              }
              bordered={false} 
              style={{ borderRadius: '12px', minHeight: '600px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="tight-timeline" style={{ padding: '20px 0' }}>
                <Timeline
                  mode="left"
                  items={selectedPatientGroup.records.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((rec) => ({
                    label: (
                      <div style={{ paddingRight: '0' }}>
                        <Text strong style={{ display: 'block', fontSize: '12px' }}>{new Date(rec.timestamp).toLocaleDateString()}</Text>
                        <Text type="secondary" style={{ fontSize: '10px' }}>{new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      </div>
                    ),
                    children: (
                      <Card 
                        size="small" 
                        hoverable 
                        onClick={() => showDetails(rec)} 
                        style={{ 
                          marginBottom: '16px', 
                          borderRadius: '12px', 
                          borderLeft: `5px solid ${rec.prediction === 'Normal' ? '#52c41a' : '#ff4d4f'}`,
                          textAlign: 'left',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          maxWidth: '450px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space direction="vertical" size={0}>
                            <Tag color={rec.prediction === 'Normal' ? 'green' : 'red'} style={{ margin: 0, fontWeight: 'bold', fontSize: '11px' }}>{rec.prediction.toUpperCase()}</Tag>
                            <Text strong style={{ fontSize: '13px' }}>{(rec.confidence * 100).toFixed(1)}% Confidence</Text>
                          </Space>
                          <Space>
                            <Button type="link" size="small" icon={<FileSearchOutlined />} style={{ fontSize: '12px' }}>Report</Button>
                            {user?.role === 'admin' && (
                              <Button 
                                type="text" 
                                danger 
                                size="small" 
                                icon={<DeleteOutlined />} 
                                onClick={(e) => openDeleteModal(e, rec)}
                                style={{ fontSize: '12px' }}
                              />
                            )}
                          </Space>
                        </div>
                      </Card>
                    ),
                    dot: <CheckCircleOutlined style={{ fontSize: '18px' }} />,
                    color: rec.prediction === 'Normal' ? 'green' : 'red'
                  }))}
                />
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Report Modal */}
      <Modal 
        title={<Title level={4} style={{ margin: 0 }}>Medical AI Analysis Report</Title>} 
        open={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        width={1000} 
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => { document.title = `Report_${selectedRecord.patientId}`; window.print(); }}>Print</Button>, 
          <Button key="close" onClick={() => setIsModalVisible(false)}>Close</Button>
        ]}
      >
        {selectedRecord && (
          <div id="printable-report" style={{ padding: '30px', backgroundColor: isDarkMode ? '#141414' : '#fff', color: isDarkMode ? '#fff' : '#000' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '3px solid #1890ff', paddingBottom: '15px' }}>
              <Title level={2} style={{ color: '#1890ff', margin: 0, letterSpacing: '1px' }}>MEDICAL AI ANALYSIS REPORT</Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>Senior Project MIX - Clinical Decision Support Platform</Text>
            </div>

            {selectedRecord.confidence < 0.9 && (
              <Alert
                message="Attention: Low AI Confidence Warning"
                description={`This diagnostic result was generated with a confidence level of ${(selectedRecord.confidence * 100).toFixed(1)}%. Further clinical verification by a radiologist is highly recommended.`}
                type="warning"
                showIcon
                style={{ marginBottom: '24px', borderRadius: '8px' }}
              />
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '10px', textAlign: 'center' }}>[1] Original Image</Text>
                <div style={{ border: '2px solid #303030', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', aspectRatio: '1 / 1', width: '100%' }}>
                  <img src={getImageUrl(selectedRecord.originalImagePath)} alt="Orig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '10px', textAlign: 'center' }}>[2] AI Heatmap</Text>
                <div style={{ border: '2px solid #303030', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', aspectRatio: '1 / 1', width: '100%' }}>
                  <img src={getImageUrl(selectedRecord.gradcamImagePath)} alt="GC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            </div>
            <Divider orientation="left" style={{ borderColor: '#1890ff' }}>Analysis Findings</Divider>
            <div style={{ backgroundColor: isDarkMode ? '#1d1d1d' : '#f9f9f9', padding: '20px', borderRadius: '12px', border: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0', marginBottom: '30px' }}>
              <Row gutter={24} align="middle">
                <Col span={8} style={{ borderRight: '1px solid #d9d9d9' }}>
                  <Text type="secondary">Primary Diagnosis</Text><br/>
                  <Tag color={selectedRecord.prediction === 'Normal' ? 'green' : 'red'} style={{ fontSize: '18px', padding: '5px 10px', height: 'auto', fontWeight: 'bold', marginTop: '5px' }}>
                    {selectedRecord.prediction.toUpperCase()}
                  </Tag>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff', marginTop: '5px' }}>
                    {(selectedRecord.confidence * 100).toFixed(1)}%
                  </div>
                </Col>
                
                <Col span={8} style={{ borderRight: '1px solid #d9d9d9' }}>
                  <Text type="secondary">Secondary Consideration</Text><br/>
                  {selectedRecord.allProbabilities && selectedRecord.allProbabilities.length > 1 ? (
                    (() => {
                      const sorted = [...selectedRecord.allProbabilities].sort((a, b) => b.confidence - a.confidence);
                      const secondary = sorted[1];
                      return (
                        <>
                          <Tag color="orange" style={{ fontSize: '14px', marginTop: '5px' }}>{secondary.label.toUpperCase()}</Tag>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16', marginTop: '5px' }}>
                            {(secondary.confidence * 100).toFixed(1)}%
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div style={{ marginTop: '10px' }}><Text type="secondary">N/A (Legacy Data)</Text></div>
                  )}
                </Col>

                <Col span={8}>
                  <Text type="secondary">Analysis Date</Text>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '10px' }}>
                    {new Date(selectedRecord.timestamp).toLocaleDateString('en-GB')}
                  </div>
                  <Text type="secondary">{new Date(selectedRecord.timestamp).toLocaleTimeString()}</Text>
                </Col>
              </Row>
            </div>
            <Descriptions title="Document Info" bordered size="small" column={2}>
              <Descriptions.Item label="Patient ID">{selectedRecord.patientId}</Descriptions.Item>
              <Descriptions.Item label="Age / Gender">{patientDetails?.age || 'N/A'} / {patientDetails?.gender || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="AI Engine">DenseNet-121 (Optimized)</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color="blue">VERIFIED</Tag></Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: '60px' }}><Row justify="end"><Col span={10} style={{ textAlign: 'center' }}><div style={{ borderBottom: isDarkMode ? '1px solid #fff' : '1px solid #000', height: '60px', marginBottom: '10px' }}></div><Text strong>Authorized Radiologist Signature</Text></Col></Row></div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>ยืนยันการลบรายงานวิเคราะห์</span>
          </Space>
        }
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDeleteModalVisible(false)}>
            ยกเลิก
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            danger 
            onClick={confirmDelete}
            disabled={confirmTextInput !== 'ยืนยันการลบ'}
          >
            ลบข้อมูลถาวร
          </Button>
        ]}
      >
        <div style={{ marginBottom: '20px' }}>
          <Text>การลบรายงานนี้จะส่งผลให้ข้อมูลหายไปจากระบบโดยไม่สามารถกู้คืนได้</Text>
          <br />
          <Text type="danger" strong>โปรดพิมพ์คำว่า "ยืนยันการลบ" เพื่อยืนยันความต้องการ:</Text>
        </div>
        <Input 
          placeholder="พิมพ์คำว่า: ยืนยันการลบ" 
          value={confirmTextInput} 
          onChange={(e) => setConfirmTextInput(e.target.value)}
          status={confirmTextInput && confirmTextInput !== 'ยืนยันการลบ' ? 'error' : ''}
        />
      </Modal>
    </div>
  );
};

export default HistoryPage;

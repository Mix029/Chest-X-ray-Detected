import React, { createContext, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('darkMode', newVal);
      return newVal;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
            colorBgContainer: isDarkMode ? '#141414' : '#ffffff',
            colorBgLayout: isDarkMode ? '#000000' : '#f5f5f5',
          },
          components: {
            Table: {
              headerBg: isDarkMode ? '#1d1d1d' : '#fafafa',
              headerColor: isDarkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.88)',
            },
            Card: {
              colorBgContainer: isDarkMode ? '#141414' : '#ffffff',
            }
          }
        }}
      >
        <div style={{ 
          colorScheme: isDarkMode ? 'dark' : 'light',
          minHeight: '100vh',
          backgroundColor: isDarkMode ? '#000000' : '#f5f5f5',
          color: isDarkMode ? '#ffffff' : 'rgba(0, 0, 0, 0.88)'
        }}>
          {children}
        </div>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

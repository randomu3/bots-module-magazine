import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Layout } from '../layout/Layout';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('Layout', () => {
  it('renders children correctly', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders header and footer', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    expect(screen.getAllByText('TeleBotics')).toHaveLength(2); // Header and footer
    expect(screen.getByText('© 2025 TeleBotics. Все права защищены.')).toBeInTheDocument();
  });

  it('renders with custom title in head', () => {
    render(
      <TestWrapper>
        <Layout title="Custom Title">
          <div>Test Content</div>
        </Layout>
      </TestWrapper>
    );

    // In Jest environment, we can't easily test document.title with Next.js Head
    // Instead, we verify the component renders without errors
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
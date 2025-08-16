import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Default theme is 'system', so next theme should be 'light'
    expect(button).toHaveAttribute('title', 'Светлая тема');
  });

  it('cycles through themes when clicked', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    
    // Initial state is system theme, next should be light
    expect(button).toHaveAttribute('title', 'Светлая тема');
    
    // Click to change to light theme
    fireEvent.click(button);
    expect(button).toHaveAttribute('title', 'Темная тема');
    
    // Click to change to dark theme
    fireEvent.click(button);
    expect(button).toHaveAttribute('title', 'Системная тема');
    
    // Click to change back to system theme
    fireEvent.click(button);
    expect(button).toHaveAttribute('title', 'Светлая тема');
  });
});
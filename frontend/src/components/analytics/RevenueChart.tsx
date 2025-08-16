import React, { useEffect, useRef } from 'react';
import { RevenueData } from '@/types/analytics';

interface RevenueChartProps {
  data: RevenueData[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get max values for scaling
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxTransactions = Math.max(...data.map(d => d.transactions));

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * i / 5;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= data.length - 1; i++) {
      const x = padding + (width - 2 * padding) * i / (data.length - 1);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw revenue line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * index / (data.length - 1);
      const y = height - padding - (height - 2 * padding) * point.revenue / maxRevenue;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw revenue points
    ctx.fillStyle = '#3b82f6';
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * index / (data.length - 1);
      const y = height - padding - (height - 2 * padding) * point.revenue / maxRevenue;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw transactions line (secondary axis)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * index / (data.length - 1);
      const y = height - padding - (height - 2 * padding) * point.transactions / maxTransactions;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw transaction points
    ctx.fillStyle = '#10b981';
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * index / (data.length - 1);
      const y = height - padding - (height - 2 * padding) * point.transactions / maxTransactions;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    
    // X-axis labels (dates)
    data.forEach((point, index) => {
      if (index % Math.ceil(data.length / 6) === 0) {
        const x = padding + (width - 2 * padding) * index / (data.length - 1);
        const date = new Date(point.date).toLocaleDateString('ru-RU', { 
          month: 'short', 
          day: 'numeric' 
        });
        ctx.fillText(date, x, height - 10);
      }
    });

    // Y-axis labels (revenue)
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * i / 5;
      const value = maxRevenue * (1 - i / 5);
      const label = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
      ctx.fillText(label, padding - 10, y + 4);
    }

  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-64"
        style={{ width: '100%', height: '256px' }}
      />
      <div className="flex items-center justify-center mt-4 space-x-6">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Доходы</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Транзакции</span>
        </div>
      </div>
    </div>
  );
};
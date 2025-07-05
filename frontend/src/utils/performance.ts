import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

interface MetricReport {
  name: string;
  value: number;
  id: string;
}

/**
 * 将性能指标发送到控制台或分析服务
 */
function sendToAnalytics(metric: MetricReport): void {
  // 开发环境下打印到控制台
  console.log(`[Performance Metric] ${metric.name}:`, metric.value);
  
  // 在生产环境中，可以将数据发送到分析服务
  // 例如: fetch('/analytics', { method: 'POST', body: JSON.stringify(metric) });
}

/**
 * 初始化Web Vitals性能指标监控
 */
export function reportWebVitals(): void {
  // Core Web Vitals
  onCLS(sendToAnalytics); // Cumulative Layout Shift
  onINP(sendToAnalytics); // Interaction to Next Paint (替代First Input Delay)
  onLCP(sendToAnalytics); // Largest Contentful Paint
  
  // 其他重要指标
  onFCP(sendToAnalytics); // First Contentful Paint
  onTTFB(sendToAnalytics); // Time to First Byte
} 
// Browser and device configurations for cross-browser testing

export const browserConfigs = {
  chrome: {
    name: 'Chrome',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  },
  firefox: {
    name: 'Firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    viewport: { width: 1280, height: 720 }
  },
  edge: {
    name: 'Edge',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    viewport: { width: 1280, height: 720 }
  },
  safari: {
    name: 'Safari',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    viewport: { width: 1280, height: 720 }
  }
}

export const deviceConfigs = {
  desktop: {
    name: 'Desktop',
    viewport: { width: 1920, height: 1080 }
  },
  laptop: {
    name: 'Laptop',
    viewport: { width: 1366, height: 768 }
  },
  tablet: {
    name: 'Tablet',
    viewport: { width: 768, height: 1024 }
  },
  mobile: {
    name: 'Mobile',
    viewport: { width: 375, height: 667 }
  },
  mobileLarge: {
    name: 'Mobile Large',
    viewport: { width: 414, height: 896 }
  }
}

export const testEnvironments = {
  development: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:5000/api'
  },
  staging: {
    baseUrl: 'https://staging.telebotics.com',
    apiUrl: 'https://staging-api.telebotics.com/api'
  },
  production: {
    baseUrl: 'https://telebotics.com',
    apiUrl: 'https://api.telebotics.com/api'
  }
}
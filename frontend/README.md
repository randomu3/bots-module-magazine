# TeleBotics Frontend

This is the frontend application for the TeleBotics platform - a system for providing earning modules for Telegram bots.

## Features Implemented

### Task 11.1: Basic React Application Structure ✅

- **Next.js with TypeScript**: Configured Next.js 14 with TypeScript support
- **Basic Components and Layout**: 
  - `Layout` component with header and footer
  - `Header` component with navigation and theme toggle
  - `Footer` component with links and company info
- **Tailwind CSS with Theme Support**: 
  - Dark/light theme support with system preference detection
  - Custom color palette and responsive design
  - Smooth transitions between themes
- **Theme Switching System**:
  - `ThemeProvider` context for global theme management
  - `ThemeToggle` component that cycles through light/dark/system themes
  - Persistent theme preferences in localStorage
  - SSR-safe implementation

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx      # Main layout wrapper
│   │   │   ├── Header.tsx      # Navigation header
│   │   │   ├── Footer.tsx      # Site footer
│   │   │   └── index.ts        # Layout exports
│   │   ├── ui/
│   │   │   ├── Button.tsx      # Reusable button component
│   │   │   ├── Card.tsx        # Card components
│   │   │   ├── Input.tsx       # Form input component
│   │   │   ├── ThemeToggle.tsx # Theme switching button
│   │   │   └── index.ts        # UI exports
│   │   └── __tests__/          # Component tests
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Theme management context
│   ├── pages/
│   │   ├── _app.tsx           # App wrapper with providers
│   │   └── index.tsx          # Home page
│   ├── styles/
│   │   └── globals.css        # Global styles and theme variables
│   └── utils/
│       └── cn.ts              # Utility for className merging
├── package.json
├── tailwind.config.js         # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── next.config.js            # Next.js configuration
```

## Key Components

### Layout System
- **Layout**: Main wrapper component that provides consistent structure
- **Header**: Navigation with logo, menu items, and theme toggle
- **Footer**: Company information and useful links

### Theme System
- **ThemeProvider**: React context that manages theme state
- **ThemeToggle**: Button component that cycles through themes
- **Theme persistence**: Saves user preference to localStorage
- **System theme detection**: Automatically detects OS theme preference

### UI Components
- **Button**: Flexible button with multiple variants and sizes
- **Card**: Container components for content sections
- **Input**: Form input with consistent styling

## Technologies Used

- **Next.js 14**: React framework with SSR support
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React 18**: Latest React with concurrent features
- **Lucide React**: Icon library
- **Jest & Testing Library**: Testing framework

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests

## Theme Configuration

The application supports three theme modes:
- **Light**: Light color scheme
- **Dark**: Dark color scheme  
- **System**: Automatically follows OS preference

Theme switching is handled by the `ThemeProvider` context and persisted in localStorage.

## Testing

All components are tested with Jest and React Testing Library:
- Layout component rendering
- Theme toggle functionality
- Component integration

Run tests with: `npm test`

## Next Steps

This completes Task 11.1. The next tasks will involve:
- 11.2: Authentication pages (login, register, password recovery)
- 11.3: User dashboard and bot management
- 11.4: Additional user panel sections (finances, referrals, etc.)
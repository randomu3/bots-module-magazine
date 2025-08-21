import { NextPage } from 'next';
import Link from 'next/link';

const LoginPage: NextPage = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '8px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          Вход в систему
        </h1>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
              Email:
            </label>
            <input 
              type="email" 
              placeholder="your@email.com"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
              Пароль:
            </label>
            <input 
              type="password" 
              placeholder="Ваш пароль"
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <button 
            type="submit"
            style={{ 
              padding: '0.75rem', 
              backgroundColor: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Войти
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#666', marginBottom: '0.5rem' }}>
            Нет аккаунта?{' '}
            <Link href="/auth/register" style={{ color: '#0070f3', textDecoration: 'none' }}>
              Зарегистрироваться
            </Link>
          </p>
          <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
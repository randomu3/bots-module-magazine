import { NextPage } from 'next';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const HomePage: NextPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const features = [
    {
      icon: "🧠",
      title: "ИИ-Оптимизация",
      description: "Нейросеть анализирует поведение и увеличивает доходы автоматически",
      stats: "+350% конверсия"
    },
    {
      icon: "⚡",
      title: "Мгновенная интеграция", 
      description: "Подключение за 15 секунд через единый API без программирования",
      stats: "15 сек настройка"
    },
    {
      icon: "💎",
      title: "Премиум модули",
      description: "Эксклюзивные модули заработка от топовых разработчиков",
      stats: "150+ модулей"
    },
    {
      icon: "🛡️",
      title: "Защита уровня банка",
      description: "Военное шифрование и защита от любых угроз",
      stats: "99.99% безопасность"
    }
  ];

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0a0a0a;
          color: #ffffff;
          overflow-x: hidden;
          line-height: 1.6;
        }

        .cursor-glow {
          position: fixed;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          transition: all 0.1s ease;
          transform: translate(-50%, -50%);
        }

        .dark-bg {
          background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 25%, #0f0f23 50%, #0a0a0a 100%);
        }

        .purple-mesh {
          background: 
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
        }

        .text-glow {
          text-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
        }

        .gradient-text {
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 25%, #c084fc 50%, #e879f9 75%, #f3e8ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .neo-card {
          background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 24px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .neo-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .neo-card:hover::before {
          opacity: 1;
        }

        .neo-card:hover {
          transform: translateY(-12px) rotateX(5deg);
          box-shadow: 
            0 24px 48px rgba(139, 92, 246, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.7),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          border-color: rgba(139, 92, 246, 0.4);
        }

        .btn-futuristic {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          color: white;
          padding: 16px 32px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 8px 24px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-futuristic::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.6s;
        }

        .btn-futuristic:hover::before {
          left: 100%;
        }

        .btn-futuristic:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 
            0 16px 40px rgba(139, 92, 246, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .btn-outline {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
          padding: 16px 32px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .btn-outline:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: #8b5cf6;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(139, 92, 246, 0.3);
        }

        .floating {
          animation: float 6s ease-in-out infinite;
        }

        .floating:nth-child(2) {
          animation-delay: 2s;
        }

        .floating:nth-child(3) {
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(3deg); }
          66% { transform: translateY(10px) rotate(-2deg); }
        }

        .hologram {
          background: linear-gradient(135deg, 
            rgba(139, 92, 246, 0.1) 0%, 
            rgba(168, 85, 247, 0.05) 25%,
            rgba(196, 132, 252, 0.1) 50%,
            rgba(168, 85, 247, 0.05) 75%,
            rgba(139, 92, 246, 0.1) 100%);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          position: relative;
        }

        .hologram::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, 
            transparent 30%, 
            rgba(139, 92, 246, 0.1) 50%, 
            transparent 70%);
          animation: hologram-scan 3s ease-in-out infinite;
        }

        @keyframes hologram-scan {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .section {
          padding: 6rem 0;
        }

        .cyber-grid {
          background-image: 
            linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px);
          background-size: 60px 60px;
          position: relative;
        }

        .cyber-grid::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(10, 10, 10, 0.8) 100%);
        }

        .pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        .feature-card {
          background: linear-gradient(145deg, rgba(26, 26, 26, 0.8), rgba(15, 15, 15, 0.8));
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .feature-card.active {
          border-color: rgba(139, 92, 246, 0.5);
          background: linear-gradient(145deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.05));
          transform: scale(1.02);
        }

        .stats-orb {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          margin: 0 auto 1rem;
          position: relative;
          animation: rotate 20s linear infinite;
        }

        .stats-orb::before {
          content: '';
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border-radius: 50%;
          border: 2px solid rgba(139, 92, 246, 0.3);
          animation: rotate 15s linear infinite reverse;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .section {
            padding: 4rem 0;
          }
        }
      `}</style>

      {/* Cursor Glow Effect */}
      <div 
        className="cursor-glow" 
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
        }}
      />

      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: scrollY > 50 ? 'rgba(10, 10, 10, 0.95)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(30px)' : 'none',
        borderBottom: scrollY > 50 ? '1px solid rgba(139, 92, 246, 0.2)' : 'none',
        transition: 'all 0.4s ease'
      }}>
        <div className="container">
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem 0',
            minHeight: '80px'
          }}>
            {/* Logo */}
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: 'white'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                position: 'relative'
              }} className="pulse">
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  background: 'linear-gradient(45deg, #8b5cf6, #a855f7)',
                  borderRadius: '17px',
                  zIndex: -1,
                  opacity: 0.5
                }} />
                🚀
              </div>
              <div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-1px'
                }}>
                  CyberBot
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#64748b',
                  letterSpacing: '2px',
                  textTransform: 'uppercase'
                }}>
                  AI PLATFORM
                </div>
              </div>
            </Link>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3rem'
            }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <Link href="/solutions" style={{ 
                  color: '#94a3b8', 
                  textDecoration: 'none', 
                  transition: 'all 0.3s',
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  Решения
                </Link>
                <Link href="/technology" style={{ 
                  color: '#94a3b8', 
                  textDecoration: 'none', 
                  transition: 'all 0.3s',
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  Технологии
                </Link>
                <Link href="/enterprise" style={{ 
                  color: '#94a3b8', 
                  textDecoration: 'none', 
                  transition: 'all 0.3s',
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  Enterprise
                </Link>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link href="/auth/login" style={{
                  color: '#a78bfa',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.3s',
                  fontSize: '15px',
                  fontWeight: '500'
                }}>
                  Войти
                </Link>
                <Link href="/auth/register" className="btn-futuristic" style={{
                  padding: '12px 24px',
                  fontSize: '15px'
                }}>
                  Начать
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="dark-bg purple-mesh cyber-grid" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        paddingTop: '80px'
      }}>
        {/* Floating Geometric Elements */}
        <div className="floating" style={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(45deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1))',
          borderRadius: '20px',
          transform: 'rotate(45deg)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }} />
        
        <div className="floating" style={{
          position: 'absolute',
          bottom: '20%',
          left: '5%',
          width: '150px',
          height: '150px',
          background: 'linear-gradient(45deg, rgba(196, 132, 252, 0.1), rgba(139, 92, 246, 0.1))',
          borderRadius: '50%',
          border: '1px solid rgba(196, 132, 252, 0.2)'
        }} />

        <div className="floating" style={{
          position: 'absolute',
          top: '60%',
          right: '70%',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(45deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          border: '1px solid rgba(168, 85, 247, 0.2)'
        }} />

        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '50px',
              padding: '8px 20px',
              marginBottom: '3rem',
              fontSize: '14px',
              color: '#a78bfa',
              backdropFilter: 'blur(10px)'
            }}>
              <span className="pulse">🤖</span>
              <span>Powered by Neural Networks</span>
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                color: 'white',
                fontWeight: '600'
              }}>
                NEW
              </span>
            </div>

            {/* Main Heading */}
            <h1 style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              fontWeight: '900',
              lineHeight: '0.9',
              marginBottom: '2rem',
              letterSpacing: '-3px'
            }} className="text-glow">
              Будущее{' '}
              <span className="gradient-text">монетизации</span>
              <br />
              уже здесь
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
              color: '#94a3b8',
              marginBottom: '4rem',
              lineHeight: '1.7',
              maxWidth: '700px',
              margin: '0 auto 4rem'
            }}>
              Киберпанк-платформа с ИИ для автоматической монетизации Telegram ботов. 
              Технологии будущего доступны уже сегодня.
            </p>

            {/* CTA Buttons */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '5rem'
            }}>
              <Link href="/auth/register" className="btn-futuristic" style={{
                fontSize: '1.1rem',
                padding: '18px 40px'
              }}>
                <span>🚀</span>
                Запустить ИИ
              </Link>

              <Link href="/demo" className="btn-outline" style={{
                fontSize: '1.1rem',
                padding: '18px 40px'
              }}>
                <span>🎯</span>
                Демо системы
              </Link>
            </div>

            {/* Tech Stack */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '3rem',
              flexWrap: 'wrap',
              opacity: 0.6,
              fontSize: '14px',
              color: '#64748b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧠</span>
                Neural Networks
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡</span>
                Quantum Computing
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span>
                Blockchain Security
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌐</span>
                Edge Computing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        padding: '5rem 0'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            textAlign: 'center'
          }}>
            <div>
              <div className="stats-orb">
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'white'
                }}>
                  10K+
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '1.1rem' }}>ИИ-агентов</div>
            </div>

            <div>
              <div className="stats-orb">
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'white'
                }}>
                  ₽100M+
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '1.1rem' }}>Обработано</div>
            </div>

            <div>
              <div className="stats-orb">
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'white'
                }}>
                  200+
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '1.1rem' }}>Алгоритмов</div>
            </div>

            <div>
              <div className="stats-orb">
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: 'white'
                }}>
                  99.99%
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: '1.1rem' }}>Точность ИИ</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section" style={{
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #0f0f23 100%)'
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: '800',
              marginBottom: '1.5rem',
              letterSpacing: '-2px'
            }} className="text-glow">
              Технологии <span className="gradient-text">нового уровня</span>
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Революционные алгоритмы машинного обучения для максимизации доходов
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-card ${index === activeFeature ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(index)}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: `linear-gradient(135deg, ${
                    index === 0 ? '#8b5cf6, #a855f7' :
                    index === 1 ? '#10b981, #059669' :
                    index === 2 ? '#f59e0b, #d97706' :
                    '#ef4444, #dc2626'
                  })`,
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  margin: '0 auto 2rem',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-5px',
                    left: '-5px',
                    right: '-5px',
                    bottom: '-5px',
                    background: `linear-gradient(45deg, ${
                      index === 0 ? '#8b5cf6, #a855f7' :
                      index === 1 ? '#10b981, #059669' :
                      index === 2 ? '#f59e0b, #d97706' :
                      '#ef4444, #dc2626'
                    })`,
                    borderRadius: '25px',
                    zIndex: -1,
                    opacity: 0.3,
                    filter: 'blur(10px)'
                  }} />
                  {feature.icon}
                </div>

                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  color: 'white'
                }}>
                  {feature.title}
                </h3>

                <p style={{
                  color: '#94a3b8',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {feature.description}
                </p>

                <div style={{
                  display: 'inline-block',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '50px',
                  padding: '6px 16px',
                  fontSize: '14px',
                  color: '#a78bfa',
                  fontWeight: '600'
                }}>
                  {feature.stats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #7209b7 100%)',
        padding: '6rem 0',
        position: 'relative'
      }}>
        <div className="container">
          <div className="hologram" style={{
            padding: '4rem',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <h2 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: '800',
              marginBottom: '2rem',
              color: 'white',
              letterSpacing: '-2px'
            }} className="text-glow">
              Присоединяйтесь к революции
            </h2>

            <p style={{
              fontSize: '1.3rem',
              marginBottom: '3rem',
              color: '#e2e8f0',
              lineHeight: '1.6',
              opacity: 0.9
            }}>
              10,000+ разработчиков уже используют нашу ИИ-платформу для создания 
              прибыльных ботов. Станьте частью киберпанк-будущего.
            </p>

            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '3rem'
            }}>
              <Link href="/auth/register" style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                color: '#1e293b',
                padding: '20px 50px',
                borderRadius: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                fontSize: '1.2rem',
                transition: 'all 0.3s',
                boxShadow: '0 20px 40px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>🤖</span>
                Активировать ИИ
              </Link>

              <Link href="/enterprise" className="btn-outline" style={{
                fontSize: '1.2rem',
                padding: '20px 50px',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white'
              }}>
                <span>🏢</span>
                Enterprise решения
              </Link>
            </div>

            {/* Guarantees */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.5rem',
              opacity: 0.8,
              fontSize: '0.95rem',
              color: '#e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>🛡️</span> Квантовая защита
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>⚡</span> Нейро-оптимизация
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>🔮</span> Предсказательная аналитика
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>🌐</span> Глобальная сеть
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
        padding: '4rem 0 2rem',
        borderTop: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem'
          }}>
            {/* Company */}
            <div>
              <Link href="/" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                color: 'white',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  🚀
                </div>
                <div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    CyberBot
                  </div>
                </div>
              </Link>
              <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>
                Киберпанк-платформа с искусственным интеллектом для автоматической 
                монетизации Telegram ботов будущего.
              </p>
            </div>

            {/* Technology */}
            <div>
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                Технологии
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/ai" style={{ color: '#64748b', textDecoration: 'none' }}>Нейросети</Link>
                <Link href="/quantum" style={{ color: '#64748b', textDecoration: 'none' }}>Квантовые вычисления</Link>
                <Link href="/blockchain" style={{ color: '#64748b', textDecoration: 'none' }}>Блокчейн</Link>
                <Link href="/edge" style={{ color: '#64748b', textDecoration: 'none' }}>Edge Computing</Link>
              </div>
            </div>

            {/* Solutions */}
            <div>
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                Решения
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/bots" style={{ color: '#64748b', textDecoration: 'none' }}>ИИ-боты</Link>
                <Link href="/analytics" style={{ color: '#64748b', textDecoration: 'none' }}>Предиктивная аналитика</Link>
                <Link href="/automation" style={{ color: '#64748b', textDecoration: 'none' }}>Автоматизация</Link>
                <Link href="/enterprise" style={{ color: '#64748b', textDecoration: 'none' }}>Enterprise</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>
                Контакты
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href="/support" style={{ color: '#64748b', textDecoration: 'none' }}>Техподдержка</Link>
                <Link href="/docs" style={{ color: '#64748b', textDecoration: 'none' }}>Документация</Link>
                <Link href="/community" style={{ color: '#64748b', textDecoration: 'none' }}>Сообщество</Link>
                <Link href="/partners" style={{ color: '#64748b', textDecoration: 'none' }}>Партнеры</Link>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(139, 92, 246, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ color: '#64748b' }}>
              © 2024 CyberBot AI Platform. Все права защищены.
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
                Конфиденциальность
              </Link>
              <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem' }}>
                Условия
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default HomePage;
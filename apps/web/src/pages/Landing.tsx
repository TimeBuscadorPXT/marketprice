import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#06080d;--bg2:#0b0f18;--bg3:#111827;
--green:#22c55e;--green-glow:#22c55e40;
--blue:#3b82f6;--amber:#f59e0b;--red:#ef4444;
--text:#f0f0f5;--text2:#94a3b8;--text3:#475569;
--border:#1e293b;
--font-display:'Cabinet Grotesk',sans-serif;
--font-body:'Instrument Sans',sans-serif;
--font-mono:'JetBrains Mono',monospace;
}
html{scroll-behavior:smooth;background:var(--bg)}
body{font-family:var(--font-body);color:var(--text);background:var(--bg);overflow-x:hidden;-webkit-font-smoothing:antialiased}
::selection{background:var(--green);color:var(--bg)}

/* ===== NOISE OVERLAY ===== */
body::before{content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.035;
background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

/* ===== UTILITIES ===== */
.lp-container{max-width:1200px;margin:0 auto;padding:0 24px}
.lp-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:100px;font-size:13px;font-weight:500;font-family:var(--font-mono);letter-spacing:-.02em}
.lp-badge-green{background:var(--green-glow);color:var(--green);border:1px solid #22c55e30}
.lp-section-label{font-family:var(--font-mono);font-size:12px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:var(--green);margin-bottom:16px}

/* ===== ANIMATIONS ===== */
@keyframes lp-fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes lp-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes lp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes lp-countUp{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes lp-slideInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
@keyframes lp-glow{0%,100%{box-shadow:0 0 20px var(--green-glow)}50%{box-shadow:0 0 40px var(--green-glow),0 0 80px #22c55e20}}

.lp-reveal{opacity:0;transform:translateY(30px);transition:all .8s cubic-bezier(.16,1,.3,1)}
.lp-reveal.lp-visible{opacity:1;transform:translateY(0)}

/* ===== NAV ===== */
.lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 0;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);background:rgba(6,8,13,.8);border-bottom:1px solid #ffffff08;transition:all .3s}
.lp-nav.lp-scrolled{padding:12px 0;background:rgba(6,8,13,.95)}
.lp-nav-inner{display:flex;align-items:center;justify-content:space-between}
.lp-nav-logo{font-family:var(--font-display);font-weight:800;font-size:22px;letter-spacing:-.03em;color:var(--text)}
.lp-nav-logo span{color:var(--green)}
.lp-nav-links{display:flex;align-items:center;gap:32px}
.lp-nav-links a{color:var(--text2);font-size:14px;text-decoration:none;transition:color .2s;background:none;border:none;cursor:pointer;font-family:var(--font-body)}
.lp-nav-links a:hover{color:var(--text)}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 28px;border-radius:12px;font-family:var(--font-body);font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;border:none;transition:all .25s cubic-bezier(.16,1,.3,1)}
.lp-btn-primary{background:var(--green);color:var(--bg);box-shadow:0 0 20px var(--green-glow)}
.lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 0 30px var(--green-glow),0 4px 20px rgba(0,0,0,.4)}
.lp-btn-outline{background:transparent;color:var(--text);border:1px solid var(--border)}
.lp-btn-outline:hover{border-color:var(--green);color:var(--green)}
.lp-btn-large{padding:18px 40px;font-size:16px;border-radius:14px}

/* ===== HERO ===== */
.lp-hero{min-height:100vh;display:flex;align-items:center;position:relative;padding:120px 0 80px;overflow:hidden}
.lp-hero::before{content:'';position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle,#22c55e08 0%,transparent 70%);pointer-events:none}
.lp-hero::after{content:'';position:absolute;bottom:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,#3b82f608 0%,transparent 70%);pointer-events:none}
.lp-hero-content{max-width:720px;animation:lp-fadeUp .8s cubic-bezier(.16,1,.3,1) both}
.lp-hero-badge{animation:lp-fadeUp .6s cubic-bezier(.16,1,.3,1) both;margin-bottom:28px}
.lp-hero-badge .lp-dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:lp-pulse 2s infinite}
.lp-hero h1{font-family:var(--font-display);font-size:clamp(42px,6vw,72px);font-weight:900;line-height:1.05;letter-spacing:-.04em;margin-bottom:24px;animation:lp-fadeUp .8s .1s cubic-bezier(.16,1,.3,1) both}
.lp-hero h1 .lp-highlight{background:linear-gradient(135deg,var(--green),#4ade80);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.lp-hero p{font-size:clamp(17px,2vw,20px);line-height:1.7;color:var(--text2);max-width:560px;margin-bottom:40px;animation:lp-fadeUp .8s .2s cubic-bezier(.16,1,.3,1) both}
.lp-hero-cta{display:flex;gap:16px;flex-wrap:wrap;animation:lp-fadeUp .8s .3s cubic-bezier(.16,1,.3,1) both}
.lp-hero-stats{display:flex;gap:48px;margin-top:64px;padding-top:32px;border-top:1px solid var(--border);animation:lp-fadeUp .8s .5s cubic-bezier(.16,1,.3,1) both}
.lp-hero-stat{text-align:left}
.lp-hero-stat .lp-number{font-family:var(--font-display);font-size:36px;font-weight:800;color:var(--green);letter-spacing:-.03em}
.lp-hero-stat .lp-label{font-size:13px;color:var(--text3);margin-top:4px}

/* ===== PROBLEM SECTION ===== */
.lp-problem{padding:120px 0;position:relative}
.lp-problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.lp-problem-visual{position:relative}
.lp-problem-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px;margin-bottom:16px}
.lp-problem-card.lp-bad{border-left:3px solid var(--red)}
.lp-problem-card.lp-good{border-left:3px solid var(--green)}
.lp-problem-card .lp-tag{font-family:var(--font-mono);font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px}
.lp-problem-card .lp-tag.lp-red{color:var(--red)}
.lp-problem-card .lp-tag.lp-green{color:var(--green)}
.lp-problem-card .lp-price{font-family:var(--font-display);font-size:28px;font-weight:800;letter-spacing:-.02em}
.lp-problem-card .lp-desc{font-size:14px;color:var(--text2);margin-top:8px;line-height:1.6}
.lp-vs-badge{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--text2);margin:0 auto -8px;position:relative;z-index:2}
.lp-problem h2{font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:24px}
.lp-problem h2 .lp-red{color:var(--red)}

/* ===== FEATURES ===== */
.lp-features{padding:120px 0;background:var(--bg2);position:relative}
.lp-features::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--border),transparent)}
.lp-features-header{text-align:center;max-width:600px;margin:0 auto 80px}
.lp-features-header h2{font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:16px}
.lp-features-header p{font-size:17px;color:var(--text2);line-height:1.7}
.lp-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.lp-feature-card{background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:36px;transition:all .4s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}
.lp-feature-card:hover{transform:translateY(-4px);border-color:#ffffff15;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.lp-feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--green),var(--blue));opacity:0;transition:opacity .3s}
.lp-feature-card:hover::before{opacity:1}
.lp-feature-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:20px}
.lp-feature-icon.lp-green{background:#22c55e15;color:var(--green)}
.lp-feature-icon.lp-blue{background:#3b82f615;color:var(--blue)}
.lp-feature-icon.lp-amber{background:#f59e0b15;color:var(--amber)}
.lp-feature-icon.lp-red{background:#ef444415;color:var(--red)}
.lp-feature-icon.lp-purple{background:#a855f715;color:#a855f7}
.lp-feature-icon.lp-teal{background:#14b8a615;color:#14b8a6}
.lp-feature-card h3{font-family:var(--font-display);font-size:20px;font-weight:700;letter-spacing:-.02em;margin-bottom:10px}
.lp-feature-card p{font-size:14px;color:var(--text2);line-height:1.7}

/* ===== HOW IT WORKS ===== */
.lp-how{padding:120px 0}
.lp-how-header{text-align:center;max-width:600px;margin:0 auto 80px}
.lp-how-header h2{font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:16px}
.lp-how-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}
.lp-how-step{text-align:center;padding:40px 28px}
.lp-step-number{font-family:var(--font-display);font-size:64px;font-weight:900;color:var(--green);opacity:.2;line-height:1;margin-bottom:20px}
.lp-how-step h3{font-family:var(--font-display);font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:12px}
.lp-how-step p{font-size:15px;color:var(--text2);line-height:1.7}

/* ===== COMPARATOR DEMO ===== */
.lp-comparator{padding:120px 0;background:var(--bg2)}
.lp-comparator-header{text-align:center;max-width:700px;margin:0 auto 60px}
.lp-comparator-header h2{font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:16px}
.lp-demo-card{max-width:680px;margin:0 auto;background:var(--bg);border:1px solid var(--border);border-radius:20px;overflow:hidden}
.lp-demo-header{padding:24px 32px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.lp-demo-header h3{font-family:var(--font-display);font-size:18px;font-weight:700}
.lp-demo-body{padding:32px}
.lp-demo-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid #ffffff06}
.lp-demo-row:last-child{border:none}
.lp-demo-label{font-size:14px;color:var(--text2)}
.lp-demo-value{font-family:var(--font-mono);font-size:16px;font-weight:500}
.lp-demo-value.lp-green{color:var(--green)}
.lp-demo-value.lp-red{color:var(--red)}
.lp-demo-value.lp-amber{color:var(--amber)}
.lp-demo-verdict{margin-top:24px;padding:20px;border-radius:12px;text-align:center}
.lp-demo-verdict.lp-bad{background:#ef444410;border:1px solid #ef444425}
.lp-demo-verdict.lp-bad .lp-verdict-text{color:var(--red);font-family:var(--font-display);font-weight:700;font-size:18px}
.lp-demo-verdict .lp-verdict-desc{font-size:13px;color:var(--text2);margin-top:6px}

/* ===== PRICING ===== */
.lp-pricing{padding:120px 0}
.lp-pricing-header{text-align:center;max-width:600px;margin:0 auto 60px}
.lp-pricing-header h2{font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:16px}
.lp-pricing-cards{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:800px;margin:0 auto}
.lp-pricing-card{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:40px;position:relative}
.lp-pricing-card.lp-featured{border-color:var(--green);box-shadow:0 0 40px var(--green-glow)}
.lp-pricing-card.lp-featured::before{content:'BETA GRATUITO';position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--green);color:var(--bg);font-family:var(--font-mono);font-size:11px;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.05em}
.lp-pricing-card .lp-plan-name{font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--text2);margin-bottom:8px}
.lp-pricing-card .lp-plan-price{font-family:var(--font-display);font-size:48px;font-weight:900;letter-spacing:-.04em}
.lp-pricing-card .lp-plan-price span{font-size:16px;font-weight:400;color:var(--text3)}
.lp-pricing-card .lp-plan-price .lp-old{text-decoration:line-through;color:var(--text3);font-size:24px;font-weight:400;margin-right:8px}
.lp-pricing-card .lp-plan-desc{font-size:14px;color:var(--text2);margin:16px 0 28px;line-height:1.6}
.lp-pricing-card ul{list-style:none;margin-bottom:32px}
.lp-pricing-card li{font-size:14px;color:var(--text2);padding:8px 0;display:flex;align-items:center;gap:10px}
.lp-pricing-card li::before{content:'✓';color:var(--green);font-weight:700;font-size:14px}

/* ===== URGENCY ===== */
.lp-urgency{padding:80px 0;text-align:center}
.lp-urgency-box{background:linear-gradient(135deg,#22c55e08,#3b82f608);border:1px solid #22c55e20;border-radius:24px;padding:60px 40px;max-width:800px;margin:0 auto}
.lp-urgency-box h2{font-family:var(--font-display);font-size:clamp(28px,4vw,40px);font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:16px}
.lp-urgency-box p{font-size:17px;color:var(--text2);margin-bottom:32px;line-height:1.7}
.lp-spots-counter{font-family:var(--font-mono);font-size:14px;color:var(--amber);margin-bottom:24px}
.lp-spots-bar{width:240px;height:6px;background:var(--bg3);border-radius:3px;margin:12px auto 0;overflow:hidden}
.lp-spots-bar .lp-fill{height:100%;width:40%;background:linear-gradient(90deg,var(--green),var(--amber));border-radius:3px;animation:lp-shimmer 2s infinite;background-size:200% 100%}

/* ===== FAQ ===== */
.lp-faq{padding:80px 0 120px}
.lp-faq-header{text-align:center;margin-bottom:48px}
.lp-faq-header h2{font-family:var(--font-display);font-size:32px;font-weight:800;letter-spacing:-.03em}
.lp-faq-list{max-width:700px;margin:0 auto}
.lp-faq-item{border-bottom:1px solid var(--border);padding:24px 0;cursor:pointer}
.lp-faq-question{display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display);font-size:17px;font-weight:600}
.lp-faq-question::after{content:'+';font-size:24px;color:var(--text3);transition:transform .3s}
.lp-faq-item.lp-open .lp-faq-question::after{transform:rotate(45deg);color:var(--green)}
.lp-faq-answer{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.16,1,.3,1);font-size:15px;color:var(--text2);line-height:1.7}
.lp-faq-item.lp-open .lp-faq-answer{max-height:200px;padding-top:16px}

/* ===== FOOTER ===== */
.lp-footer{padding:48px 0;border-top:1px solid var(--border);text-align:center}
.lp-footer p{font-size:13px;color:var(--text3)}
.lp-footer a{color:var(--green);text-decoration:none}

/* ===== FORM MODAL ===== */
.lp-modal-overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(6,8,13,.85);backdrop-filter:blur(10px);align-items:center;justify-content:center}
.lp-modal-overlay.lp-active{display:flex}
.lp-modal{background:var(--bg2);border:1px solid var(--border);border-radius:24px;padding:48px;max-width:480px;width:90%;position:relative;animation:lp-fadeUp .4s cubic-bezier(.16,1,.3,1)}
.lp-modal-close{position:absolute;top:20px;right:20px;background:none;border:none;color:var(--text3);font-size:24px;cursor:pointer}
.lp-modal h2{font-family:var(--font-display);font-size:28px;font-weight:800;letter-spacing:-.03em;margin-bottom:8px}
.lp-modal p{font-size:14px;color:var(--text2);margin-bottom:28px}
.lp-form-group{margin-bottom:16px}
.lp-form-group label{display:block;font-size:13px;color:var(--text2);margin-bottom:6px;font-weight:500}
.lp-form-group input,.lp-form-group select{width:100%;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:var(--font-body);font-size:15px;transition:border-color .2s;outline:none}
.lp-form-group input:focus,.lp-form-group select:focus{border-color:var(--green)}
.lp-form-group input::placeholder{color:var(--text3)}
.lp-form-submit{width:100%;margin-top:8px}
.lp-form-note{font-size:12px;color:var(--text3);text-align:center;margin-top:16px}

/* ===== RESPONSIVE ===== */
@media(max-width:768px){
.lp-nav-links a:not(.lp-btn){display:none}
.lp-hero-stats{flex-direction:column;gap:24px}
.lp-problem-grid{grid-template-columns:1fr;gap:40px}
.lp-features-grid{grid-template-columns:1fr}
.lp-how-steps{grid-template-columns:1fr}
.lp-pricing-cards{grid-template-columns:1fr}
.lp-hero h1{font-size:36px}
}
`;

export default function Landing() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Inject CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'landing-page-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('landing-page-styles');
      if (el) document.head.removeChild(el);
    };
  }, []);

  // Inject fonts
  useEffect(() => {
    const existing = document.getElementById('landing-fonts');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'landing-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
      return () => {
        const el = document.getElementById('landing-fonts');
        if (el) document.head.removeChild(el);
      };
    }
  }, []);

  // Nav scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Modal body scroll lock
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalOpen]);

  // Reveal on scroll (IntersectionObserver)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('lp-visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const elements = document.querySelectorAll('.lp-reveal');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const faqItems = [
    {
      q: 'Preciso pagar algo durante o beta?',
      a: 'Não. O acesso ao plano Pro é 100% gratuito por 30 dias. Sem cartão de crédito, sem compromisso. Após o período, você pode continuar no plano gratuito ou assinar o Pro.',
    },
    {
      q: 'Como a extensão captura os dados?',
      a: 'A extensão Chrome lê os dados que já estão visíveis na página do Facebook Marketplace enquanto você navega. Ela não acessa seus dados pessoais e não faz requisições automáticas ao Facebook.',
    },
    {
      q: 'Funciona para quais marcas?',
      a: 'iPhone (7 ao 16), Samsung Galaxy (S21 ao S25, linha A), Xiaomi (Redmi, Poco, Mi) e Motorola. Estamos expandindo para outras categorias como consoles e notebooks.',
    },
    {
      q: 'Funciona em qualquer cidade?',
      a: 'Sim! O sistema funciona em qualquer região do Brasil. Os preços são calculados com base nos anúncios da sua região específica no Facebook Marketplace.',
    },
    {
      q: 'Como funciona o comparador com varejo?',
      a: 'O sistema busca automaticamente o preço do mesmo modelo novo lacrado no Mercado Livre e compara com o preço do seminovo. Se a diferença for menor que 15%, te avisa que não é oportunidade.',
    },
  ];

  return (
    <>
      {/* NAV */}
      <nav className={`lp-nav${scrolled ? ' lp-scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <div className="lp-nav-logo">Market<span>Price</span></div>
          <div className="lp-nav-links">
            <a onClick={() => scrollTo('#funcionalidades')}>Funcionalidades</a>
            <a onClick={() => scrollTo('#como-funciona')}>Como funciona</a>
            <a onClick={() => scrollTo('#preco')}>Preço</a>
            <a onClick={() => navigate('/login')}>Entrar</a>
            <a className="lp-btn lp-btn-primary" onClick={() => navigate('/register')}>Testar grátis</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-content">
            <div className="lp-hero-badge">
              <span className="lp-badge lp-badge-green"><span className="lp-dot"></span> 30 dias grátis — vagas limitadas</span>
            </div>
            <h1>Pare de <span className="lp-highlight">perder dinheiro</span> comprando celular pelo preço errado</h1>
            <p>O MarketPrice monitora o Facebook Marketplace em tempo real, mostra o preço médio de cada modelo na sua região e te avisa quando aparece uma oportunidade real de lucro. Compara até com o preço do novo no Mercado Livre.</p>
            <div className="lp-hero-cta">
              <a className="lp-btn lp-btn-primary lp-btn-large" onClick={() => navigate('/register')} style={{cursor:'pointer'}}>Começar teste grátis →</a>
              <a className="lp-btn lp-btn-outline lp-btn-large" onClick={() => scrollTo('#como-funciona')} style={{cursor:'pointer'}}>Como funciona</a>
            </div>
            <div className="lp-hero-stats">
              <div className="lp-hero-stat">
                <div className="lp-number">2.400+</div>
                <div className="lp-label">Anúncios analisados</div>
              </div>
              <div className="lp-hero-stat">
                <div className="lp-number">R$ 847</div>
                <div className="lp-label">Lucro médio por deal</div>
              </div>
              <div className="lp-hero-stat">
                <div className="lp-number">50+</div>
                <div className="lp-label">Modelos monitorados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="lp-problem lp-reveal">
        <div className="lp-container">
          <div className="lp-problem-grid">
            <div className="lp-problem-visual">
              <div className="lp-problem-card lp-bad">
                <div className="lp-tag lp-red">Sem MarketPrice</div>
                <div className="lp-price">iPhone 15 PM 256GB — R$ 3.500</div>
                <div className="lp-desc">"Parece um bom preço, vou comprar pra revender!"</div>
              </div>
              <div className="lp-vs-badge">VS</div>
              <div className="lp-problem-card lp-good">
                <div className="lp-tag lp-green">Com MarketPrice</div>
                <div className="lp-price">Novo lacrado no ML — R$ 3.900</div>
                <div className="lp-desc">Diferença de apenas R$ 400. Ninguém vai comprar um usado quando o novo está logo ali. <strong style={{color:'var(--red)'}}>NÃO é oportunidade.</strong></div>
              </div>
            </div>
            <div>
              <div className="lp-section-label">O problema</div>
              <h2>Você está comprando celular <span className="lp-red">no escuro</span></h2>
              <p style={{fontSize:'17px',color:'var(--text2)',lineHeight:'1.8',marginBottom:'24px'}}>Abrir dezenas de anúncios, anotar preços na planilha, tentar adivinhar se o valor do fornecedor deixa margem... Esse processo manual te custa tempo e te faz perder oportunidades reais.</p>
              <p style={{fontSize:'17px',color:'var(--text2)',lineHeight:'1.8'}}>O pior: sem dados, você pode achar que está fazendo um bom negócio quando na verdade o celular novo está quase no mesmo preço. O MarketPrice resolve isso automaticamente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-features lp-reveal" id="funcionalidades">
        <div className="lp-container">
          <div className="lp-features-header">
            <div className="lp-section-label">Funcionalidades</div>
            <h2>Tudo que um revendedor precisa</h2>
            <p>De coleta automática a análise com inteligência artificial, o MarketPrice cobre toda a jornada do revendedor.</p>
          </div>
          <div className="lp-features-grid">
            <div className="lp-feature-card lp-reveal">
              <div className="lp-feature-icon lp-green">📊</div>
              <h3>Preço médio em tempo real</h3>
              <p>Extensão Chrome captura automaticamente os preços enquanto você navega no Facebook Marketplace. Sem trabalho manual.</p>
            </div>
            <div className="lp-feature-card lp-reveal">
              <div className="lp-feature-icon lp-amber">🔥</div>
              <h3>Detector de oportunidades</h3>
              <p>Score inteligente de 0-100 identifica anúncios abaixo da média com lucro estimado, margem e tempo de venda.</p>
            </div>
            <div className="lp-feature-card lp-reveal">
              <div className="lp-feature-icon lp-blue">🏷️</div>
              <h3>Comparador com varejo</h3>
              <p>Compara o preço do seminovo com o novo lacrado no Mercado Livre. Nunca mais compre achando que é barato quando o novo está perto.</p>
            </div>
            <div className="lp-feature-card lp-reveal">
              <div className="lp-feature-icon lp-purple">🧠</div>
              <h3>IA consultor de negócios</h3>
              <p>"Devo comprar esse iPhone por R$ 3.800?" — Pergunte à IA e receba uma análise com dados reais do mercado.</p>
            </div>
            <div className="lp-feature-card lp-reveal">
              <div className="lp-feature-icon lp-red">🚩</div>
              <h3>Detector de red flags</h3>
              <p>Identifica anúncios suspeitos: preço muito baixo, descrição vaga, possíveis defeitos ocultos. Proteja seu dinheiro.</p>
            </div>
            <div className="lp-feature-card lp-reveal">
              <div className="lp-feature-icon lp-teal">💰</div>
              <h3>Calculadora de lucro</h3>
              <p>Inclui frete, embalagem, taxa e custos extras. Veja o lucro real antes de comprar, não depois.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-how lp-reveal" id="como-funciona">
        <div className="lp-container">
          <div className="lp-how-header">
            <div className="lp-section-label">Como funciona</div>
            <h2>3 passos simples</h2>
          </div>
          <div className="lp-how-steps">
            <div className="lp-how-step lp-reveal">
              <div className="lp-step-number">01</div>
              <h3>Instale a extensão</h3>
              <p>Adicione a extensão no Chrome. Ela roda em segundo plano enquanto você navega normalmente pelo Facebook Marketplace.</p>
            </div>
            <div className="lp-how-step lp-reveal">
              <div className="lp-step-number">02</div>
              <h3>Navegue e capture</h3>
              <p>Pesquise os modelos que te interessam. A extensão captura título, preço, região e condição automaticamente.</p>
            </div>
            <div className="lp-how-step lp-reveal">
              <div className="lp-step-number">03</div>
              <h3>Analise e lucre</h3>
              <p>Abra o dashboard e veja preços médios, oportunidades quentes, comparação com varejo e lucro estimado para cada deal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATOR DEMO */}
      <section className="lp-comparator lp-reveal">
        <div className="lp-container">
          <div className="lp-comparator-header">
            <div className="lp-section-label">Novo</div>
            <h2>Comparador seminovo vs novo</h2>
            <p style={{fontSize:'17px',color:'var(--text2)',lineHeight:'1.7'}}>Veja em tempo real se o seminovo que você quer comprar realmente vale a pena comparado com um novo lacrado.</p>
          </div>
          <div className="lp-demo-card lp-reveal">
            <div className="lp-demo-header">
              <h3>iPhone 15 Pro Max 256GB</h3>
              <span className="lp-badge lp-badge-green">Análise ao vivo</span>
            </div>
            <div className="lp-demo-body">
              <div className="lp-demo-row">
                <span className="lp-demo-label">Preço do seminovo (Facebook)</span>
                <span className="lp-demo-value">R$ 3.500</span>
              </div>
              <div className="lp-demo-row">
                <span className="lp-demo-label">Preço do novo (Mercado Livre)</span>
                <span className="lp-demo-value">R$ 3.900</span>
              </div>
              <div className="lp-demo-row">
                <span className="lp-demo-label">Diferença</span>
                <span className="lp-demo-value lp-red">Apenas R$ 400 (10,3%)</span>
              </div>
              <div className="lp-demo-row">
                <span className="lp-demo-label">Margem para revenda</span>
                <span className="lp-demo-value lp-red">Inviável</span>
              </div>
              <div className="lp-demo-verdict lp-bad">
                <div className="lp-verdict-text">🔴 Não compensa</div>
                <div className="lp-verdict-desc">O comprador prefere pagar R$ 400 a mais por um novo com garantia e nota fiscal.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-pricing lp-reveal" id="preco">
        <div className="lp-container">
          <div className="lp-pricing-header">
            <div className="lp-section-label">Preço</div>
            <h2>Simples e transparente</h2>
            <p style={{fontSize:'17px',color:'var(--text2)'}}>Comece grátis. Sem cartão de crédito.</p>
          </div>
          <div className="lp-pricing-cards">
            <div className="lp-pricing-card">
              <div className="lp-plan-name">Gratuito</div>
              <div className="lp-plan-price">R$ 0 <span>/mês</span></div>
              <div className="lp-plan-desc">Para quem quer experimentar o básico.</div>
              <ul>
                <li>Preço médio por modelo</li>
                <li>Calculadora de lucro</li>
                <li>Extensão Chrome</li>
                <li>1 região</li>
              </ul>
              <button className="lp-btn lp-btn-outline" style={{width:'100%'}} onClick={() => navigate('/register')}>Criar conta grátis</button>
            </div>
            <div className="lp-pricing-card lp-featured">
              <div className="lp-plan-name">Pro</div>
              <div className="lp-plan-price"><span className="lp-old">R$ 49</span>R$ 0 <span>/30 dias</span></div>
              <div className="lp-plan-desc">Acesso completo por 30 dias. Sem compromisso.</div>
              <ul>
                <li>Tudo do plano Gratuito</li>
                <li>Detector de oportunidades (Deal Finder)</li>
                <li>Comparador com varejo (ML)</li>
                <li>IA consultor de negócios</li>
                <li>Red Flag Detector</li>
                <li>Regiões ilimitadas</li>
                <li>Alertas de oportunidade</li>
              </ul>
              <button
                className="lp-btn lp-btn-primary"
                style={{width:'100%',animation:'lp-glow 3s infinite'}}
                onClick={() => navigate('/register')}
              >
                Testar Pro grátis por 30 dias →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* URGENCY */}
      <section className="lp-urgency lp-reveal">
        <div className="lp-container">
          <div className="lp-urgency-box">
            <h2>Vagas limitadas para o beta</h2>
            <p>Estamos aceitando apenas 30 revendedores para a fase beta. Acesso total ao plano Pro por 30 dias, sem custo nenhum. Só precisamos do seu feedback.</p>
            <div className="lp-spots-counter">🔥 12 de 30 vagas preenchidas</div>
            <div className="lp-spots-bar"><div className="lp-fill"></div></div>
            <br /><br />
            <button className="lp-btn lp-btn-primary lp-btn-large" onClick={() => navigate('/register')}>Garantir minha vaga →</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq" id="faq">
        <div className="lp-container">
          <div className="lp-faq-header">
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="lp-faq-list">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className={`lp-faq-item${openFaq === i ? ' lp-open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="lp-faq-question">{item.q}</div>
                <div className="lp-faq-answer">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <p style={{marginBottom:'8px'}}><strong style={{fontFamily:'var(--font-display)',fontWeight:800}}>Market<span style={{color:'var(--green)'}}>Price</span></strong></p>
          <p>Feito para revendedores que levam o negócio a sério.</p>
          <p style={{marginTop:'16px'}}>© 2026 MarketPrice. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* MODAL */}
      <div
        className={`lp-modal-overlay${modalOpen ? ' lp-active' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
      >
        <div className="lp-modal">
          <button className="lp-modal-close" onClick={() => setModalOpen(false)}>×</button>
          <h2>Garanta sua vaga no beta</h2>
          <p>Preencha seus dados e receba acesso ao MarketPrice Pro grátis por 30 dias.</p>
          <form onSubmit={(e) => { e.preventDefault(); navigate('/register'); }}>
            <div className="lp-form-group">
              <label>Nome completo</label>
              <input type="text" placeholder="Seu nome" required />
            </div>
            <div className="lp-form-group">
              <label>E-mail</label>
              <input type="email" placeholder="seu@email.com" required />
            </div>
            <div className="lp-form-group">
              <label>WhatsApp</label>
              <input type="tel" placeholder="(00) 00000-0000" required />
            </div>
            <div className="lp-form-group">
              <label>Cidade / Estado</label>
              <input type="text" placeholder="Ex: Curitiba, PR" required />
            </div>
            <div className="lp-form-group">
              <label>Quantos celulares você revende por mês?</label>
              <select required defaultValue="">
                <option value="" disabled>Selecione</option>
                <option>1 a 5</option>
                <option>6 a 15</option>
                <option>16 a 30</option>
                <option>Mais de 30</option>
              </select>
            </div>
            <button type="submit" className="lp-btn lp-btn-primary lp-btn-large lp-form-submit">Quero testar grátis →</button>
          </form>
          <div className="lp-form-note">Sem cartão de crédito. Sem compromisso.</div>
        </div>
      </div>
    </>
  );
}

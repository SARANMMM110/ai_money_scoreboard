import { useEffect } from 'react';

const GAUGE_TARGET = 87;
const GAUGE_CIRC = 578;

export function useLandingEffects() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const nav = document.querySelector('.landing-page .nav');
    const onScroll = () => nav?.classList.toggle('solid', window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    document.querySelectorAll('.landing-page .reveal').forEach((el) => io.observe(el));

    const arc = document.getElementById('lp-arc');
    const gnum = document.getElementById('lp-gnum');
    const scard = document.getElementById('lp-scard');
    let gaugeObserver: IntersectionObserver | null = null;

    const runGauge = () => {
      if (!arc || !gnum) return;
      const off = GAUGE_CIRC * (1 - GAUGE_TARGET / 100);
      if (reduce) {
        arc.style.strokeDashoffset = String(off);
        gnum.textContent = String(GAUGE_TARGET);
        return;
      }
      requestAnimationFrame(() => {
        arc.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)';
        arc.style.strokeDashoffset = String(off);
      });
      let s = 0;
      const step = Math.max(1, Math.round(GAUGE_TARGET / 55));
      const interval = window.setInterval(() => {
        s += step;
        if (s >= GAUGE_TARGET) {
          s = GAUGE_TARGET;
          window.clearInterval(interval);
        }
        gnum.textContent = String(s);
      }, 1400 / (GAUGE_TARGET / step));
    };

    if (scard) {
      gaugeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              runGauge();
              gaugeObserver?.disconnect();
            }
          });
        },
        { threshold: 0.3 },
      );
      gaugeObserver.observe(scard);
    }

    const catObservers: IntersectionObserver[] = [];
    document.querySelectorAll('.landing-page .cat').forEach((cat) => {
      const bar = cat.querySelector('.bar i') as HTMLElement | null;
      const w = cat.getAttribute('data-w');
      if (!bar || !w) return;
      const o = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              bar.style.width = `${w}%`;
              o.disconnect();
            }
          });
        },
        { threshold: 0.5 },
      );
      o.observe(cat);
      catObservers.push(o);
    });

    const hero = document.querySelector('.landing-page .hero');
    const onMove = (e: Event) => {
      if (!scard) return;
      const me = e as MouseEvent;
      const r = scard.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const rx = ((me.clientY - cy) / r.height) * -5;
      const ry = ((me.clientX - cx) / r.width) * 5;
      scard.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const onLeave = () => {
      if (scard) scard.style.transform = '';
    };

    if (!reduce && window.matchMedia('(pointer: fine)').matches && hero) {
      hero.addEventListener('mousemove', onMove);
      hero.addEventListener('mouseleave', onLeave);
    }

    const pc = document.getElementById('lp-particles');
    const animations: Animation[] = [];
    if (!reduce && pc) {
      for (let i = 0; i < 7; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.opacity = String(0.3 + Math.random() * 0.5);
        const d = 4 + Math.random() * 4;
        const anim = p.animate(
          [
            { transform: 'translateY(0)' },
            { transform: `translateY(-${20 + Math.random() * 30}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: d * 1000, iterations: Infinity, easing: 'ease-in-out', delay: Math.random() * 2000 },
        );
        animations.push(anim);
        pc.appendChild(p);
      }
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      gaugeObserver?.disconnect();
      catObservers.forEach((o) => o.disconnect());
      hero?.removeEventListener('mousemove', onMove);
      hero?.removeEventListener('mouseleave', onLeave);
      animations.forEach((a) => a.cancel());
      if (pc) pc.innerHTML = '';
    };
  }, []);
}

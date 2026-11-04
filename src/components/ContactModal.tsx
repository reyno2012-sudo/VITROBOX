import { useEffect } from 'react';
import { Mail, X } from 'lucide-react';
import './ContactModal.css';

export function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="contact-overlay" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="contact-panel" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button type="button" className="contact-close" onClick={onClose} aria-label="关闭联系方式"><X size={19} /></button>
        <div className="contact-panel-topline"><span>VITROBOX / REYNO LAB</span><span>CONTACT · 001</span></div>
        <h2 id="contact-title">保持联系<span className="contact-title-dot">.</span></h2>
        <p className="contact-intro">感谢支持 VITROBOX，让这件作品继续生长。</p>

        <a className="contact-email" href="mailto:reyno@live.cn">
          <span className="contact-email-icon"><Mail size={21} /></span>
          <span><small>EMAIL / 联系邮箱</small><strong>reyno@live.cn</strong></span>
          <span className="contact-email-arrow" aria-hidden="true">↗</span>
        </a>

        <div className="contact-support-heading">
          <div><small>SUPPORT THE PROJECT</small><h3>感谢支持，为 Token 续命。</h3></div>
          <span className="contact-support-line" aria-hidden="true" />
        </div>
        <div className="contact-payments">
          <div className="contact-payment-card">
            <span className="contact-payment-name"><i className="contact-payment-dot wechat" />微信支付</span>
            <div className="contact-qr-frame">
              <img className="contact-qr-image" src="/contact-wechat.png" alt="微信支付二维码" />
            </div>
            <small>使用微信扫一扫</small>
          </div>
          <div className="contact-payment-card">
            <span className="contact-payment-name"><i className="contact-payment-dot alipay" />支付宝</span>
            <div className="contact-qr-frame">
              <img className="contact-qr-image" src="/contact-alipay.png" alt="支付宝二维码" />
            </div>
            <small>使用支付宝扫一扫</small>
          </div>
        </div>
        <div className="contact-footer"><span>INDEPENDENT EXPERIMENTAL AUDIO INTERFACE</span><span>REYNO LAB © 2026</span></div>
      </section>
    </div>
  );
}

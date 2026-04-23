import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { layout } from '../../styles/index';

const Footer = () => {
    return (
        <footer className="border-t theme-border theme-surface pt-16 pb-8 mt-auto">
            <div className={layout.page}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
                    <div className="md:col-span-1 space-y-4">
                        <BrandLogo />
                        <p className="text-sm theme-text-muted mt-4 font-medium leading-relaxed">
                            The real-time quiz platform for modern teams and creators. Engage your audience like never before.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--qb-text-1)]">Product</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/studio" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Studio</Link></li>
                            <li><Link to="/join" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Join Session</Link></li>
                            <li><Link to="/login" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Sign In</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--qb-text-1)]">Legal</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/legal/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Terms & Conditions</Link></li>
                            <li><Link to="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Refund & Cancellation</Link></li>
                            <li><Link to="/legal/cookie-policy" target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Cookie Policy</Link></li>
                            <li><Link to="/legal/disclaimer" target="_blank" rel="noopener noreferrer" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">Disclaimer</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--qb-text-1)]">Connect</h4>
                        <ul className="space-y-3 text-sm">
                            <li><a href="mailto:support@quvolt.com" className="theme-text-muted hover:text-[var(--qb-primary)] font-semibold transition-colors">support@quvolt.com</a></li>
                        </ul>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t theme-border text-xs font-semibold theme-text-muted">
                    <p>© {new Date().getFullYear()} Quvolt. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

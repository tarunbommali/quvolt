import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';

const AuthLoginPage = () => {
    const [email, setEmail] = useState('test@gmail.com');
    const [password, setPassword] = useState('abcd@1234');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, password);
            if (user.role === 'organizer') navigate('/studio');
            else navigate('/join');
        } catch {
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="space-y-3">
                    <h2>Sign In</h2>
                    <p className="text-slate-500 font-medium">
                        Welcome back! Please sign in to your account
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="field-label">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <InputField
                                id="login-email"
                                type="email"
                                placeholder="name@company.com"
                                className="pl-12 bg-gray-50 border-gray-300"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="field-label">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <InputField
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="pl-12 pr-12 bg-gray-50 border-gray-300"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        disabled={loading}
                        className="w-full uppercase tracking-widest"
                    >
                        {loading ? 'SIGNING IN...' : 'SIGN IN'}
                    </Button>
                </form>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-gray-50 text-gray-500 font-medium">Or continue with</span>
                    </div>
                </div>

                {/* SSO buttons — coming soon */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        {
                            label: 'Google',
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            ),
                        },
                        {
                            label: 'GitHub',
                            icon: (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.03-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            ),
                        },
                    ].map(({ label, icon }) => (
                        <div key={label} className="relative group">
                            <button
                                type="button"
                                aria-label={`${label} sign-in (coming soon)`}
                                disabled
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-medium cursor-not-allowed select-none"
                            >
                                {icon}
                                {label}
                            </button>
                            {/* Tooltip shown on hover */}
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                                Coming soon
                            </span>
                        </div>
                    ))}
                </div>

                <p className="text-center text-gray-600 font-medium text-sm">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-indigo-600 font-bold hover:text-indigo-700">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default AuthLoginPage;


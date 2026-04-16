import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import InputField from '../../../components/ui/InputField';
import Button from '../../../components/ui/Button';
import { useAuthStore } from '../../../stores/useAuthStore';
import { ROLE_ROUTES } from '../../../routes/roleConfig';
import { register as registerService } from '../../../services/authService';


const AuthRegisterPage = () => {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const setAuthData = useAuthStore((s) => s.setAuthData);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'participant',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ SAFE REDIRECT (NO LOOP)
  useEffect(() => {
    if (!isAuthenticated) return;

    const route = ROLE_ROUTES[user?.role];
    if (route) {
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, user?.role]); // ⚠️ minimal deps

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      return setError('Accept terms first');
    }

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      setLoading(true);
      setError('');

      const data = await registerService(
        form.name,
        form.email,
        form.password,
        form.role
      );

      setAuthData(data); // 🔥 ONLY STATE UPDATE
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card space-y-6">

        <div>
          <h2 className="text-xl font-bold">Create Account</h2>
          <p className="text-gray-500">Start your journey</p>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <InputField
            label="Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />

          <InputField
            label="Email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />

          <InputField
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
          />

          <InputField
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
          />

          {/* Role Selection */}
          <div className="flex gap-2">
            {['participant', 'organizer'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleChange('role', r)}
                className={`flex-1 py-2 rounded border ${
                  form.role === r
                    ? 'bg-indigo-100 border-indigo-500'
                    : 'border-gray-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Terms */}
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            Accept Terms
          </label>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Creating...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <p className="text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthRegisterPage;
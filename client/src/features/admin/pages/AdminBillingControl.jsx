import { useEffect, useState } from 'react';
import { adminApi } from '../../../services/admin.api';
import { Plus, Tag, RefreshCcw, Save, Trash2, Percent, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminBillingControl = () => {
    const [plans, setPlans] = useState({});
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('plans');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansData, offersData] = await Promise.all([
                adminApi.getPlans(),
                adminApi.getOffers()
            ]);
            setPlans(plansData);
            setOffers(offersData);
        } catch (err) {
            toast.error('Failed to load billing configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePlan = async (planId, data) => {
        try {
            await adminApi.updatePlan(planId, data);
            toast.success(`${planId} plan updated`);
            fetchData();
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleCreateOffer = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await adminApi.createOffer({
                ...data,
                value: Number(data.value),
                applicablePlans: data.applicablePlans ? data.applicablePlans.split(',') : []
            });
            toast.success('Offer created');
            e.target.reset();
            fetchData();
        } catch (err) {
            toast.error('Failed to create offer');
        }
    };

    if (loading) return <div className="p-8 theme-text-muted">Loading billing control...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold theme-text-primary">Billing & Monetization</h1>
                    <p className="theme-text-muted text-sm mt-1">Manage subscription plans, commissions, and promo codes</p>
                </div>
                <button onClick={fetchData} className="p-2 theme-surface-soft rounded-lg theme-text-secondary hover:theme-text-primary transition-colors">
                    <RefreshCcw size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 theme-surface-soft rounded-xl mb-8 w-fit">
                <button 
                    onClick={() => setActiveTab('plans')}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'plans' ? 'bg-white dark:bg-gray-800 theme-text-primary shadow-sm' : 'theme-text-muted hover:theme-text-secondary'}`}
                >
                    Plans & Commissions
                </button>
                <button 
                    onClick={() => setActiveTab('offers')}
                    className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'offers' ? 'bg-white dark:bg-gray-800 theme-text-primary shadow-sm' : 'theme-text-muted hover:theme-text-secondary'}`}
                >
                    Offers & Discounts
                </button>
            </div>

            {activeTab === 'plans' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(plans).map(([id, plan]) => (
                        <div key={id} className="theme-surface border theme-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold theme-text-primary">{id}</h3>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${id === 'FREE' ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold theme-text-muted uppercase tracking-wider block mb-1.5">Price (INR)</label>
                                    <input 
                                        type="number" 
                                        defaultValue={plan.price}
                                        onBlur={(e) => handleUpdatePlan(id, { price: Number(e.target.value) })}
                                        className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold theme-text-muted uppercase tracking-wider block mb-1.5">Commission (%)</label>
                                    <input 
                                        type="number" 
                                        defaultValue={plan.commission * 100}
                                        onBlur={(e) => handleUpdatePlan(id, { commission: Number(e.target.value) / 100 })}
                                        className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold theme-text-muted uppercase tracking-wider block mb-1.5">Max Quizzes</label>
                                    <input 
                                        type="number" 
                                        defaultValue={plan.maxQuizzes}
                                        onBlur={(e) => handleUpdatePlan(id, { maxQuizzes: Number(e.target.value) })}
                                        className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold theme-text-muted uppercase tracking-wider block mb-1.5">Max Participants/Session</label>
                                    <input 
                                        type="number" 
                                        defaultValue={plan.maxParticipantsPerSession}
                                        onBlur={(e) => handleUpdatePlan(id, { maxParticipantsPerSession: Number(e.target.value) })}
                                        className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Create Offer Form */}
                    <div className="theme-surface border theme-border rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold theme-text-primary mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-indigo-500" /> Create Promo Code
                        </h3>
                        <form onSubmit={handleCreateOffer} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase">Code</label>
                                <input name="code" required placeholder="WELCOME50" className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase">Type</label>
                                <select name="type" className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm">
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (₹)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold theme-text-muted uppercase">Value</label>
                                <input name="value" type="number" required placeholder="10" className="w-full theme-surface-soft border theme-border rounded-xl px-4 py-2 theme-text-primary text-sm" />
                            </div>
                            <div className="flex items-end">
                                <button type="submit" className="w-full btn-primary h-[42px] flex items-center justify-center gap-2">
                                    <Save size={18} /> Save Offer
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Offers List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {offers.map(offer => (
                            <div key={offer._id} className="theme-surface border theme-border rounded-2xl p-5 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        {offer.type === 'percentage' ? <Percent size={24} /> : <IndianRupee size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold theme-text-primary flex items-center gap-2 tracking-wider">
                                            {offer.code}
                                            {offer.isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                                        </h4>
                                        <p className="text-xs theme-text-muted">
                                            {offer.type === 'percentage' ? `${offer.value}% OFF` : `₹${offer.value} OFF`} 
                                            {offer.applicablePlans.length > 0 && ` • ${offer.applicablePlans.join(', ')}`}
                                        </p>
                                    </div>
                                </div>
                                <button className="p-2 opacity-0 group-hover:opacity-100 theme-text-muted hover:text-red-500 transition-all">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {offers.length === 0 && <div className="md:col-span-2 py-12 text-center theme-text-muted border-2 border-dashed theme-border rounded-3xl">No active promo codes</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBillingControl;

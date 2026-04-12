import { CreditCard, Smartphone, Landmark, Lock } from 'lucide-react';
import Card from '../ui/Card';

const PaymentMethodSelector = ({ selectedMethod, onSelectMethod }) => {
    const paymentMethods = [
        {
            id: 'card',
            name: 'Credit/Debit Card',
            icon: CreditCard,
            description: 'Visa, Mastercard, American Express',
            supported: true,
        },
        {
            id: 'upi',
            name: 'UPI',
            icon: Smartphone,
            description: 'Google Pay, PhonePe, BHIM, Paytm',
            supported: true,
        },
        {
            id: 'netbanking',
            name: 'Net Banking',
            icon: Landmark,
            description: 'Direct bank transfer',
            supported: true,
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-indigo-600" />
                <p className="text-sm font-bold text-slate-600">
                    All payments are encrypted and secure
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;

                    return (
                        <Card
                            key={method.id}
                            onClick={() => method.supported && onSelectMethod(method.id)}
                            className={`
                                p-4 rounded-xl cursor-pointer transition-all border-2
                                ${isSelected
                                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                                }
                                ${!method.supported ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <Icon
                                    size={24}
                                    className={isSelected ? 'text-indigo-600' : 'text-slate-400'}
                                />
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 text-sm">{method.name}</h4>
                                    <p className="text-xs text-slate-600 mt-1">{method.description}</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default PaymentMethodSelector;

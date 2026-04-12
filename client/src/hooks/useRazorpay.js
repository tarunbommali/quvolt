import { useState, useCallback } from 'react';

const useRazorpay = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    const loadRazorpayScript = useCallback(() => {
        return new Promise((resolve) => {
            if (window.Razorpay || isLoaded) {
                setIsLoaded(true);
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => {
                setIsLoaded(true);
                resolve(true);
            };
            script.onerror = () => {
                resolve(false);
            };
            document.body.appendChild(script);
        });
    }, [isLoaded]);

    return { loadRazorpayScript };
};

export default useRazorpay;

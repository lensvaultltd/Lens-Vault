import React from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { Button } from './ui/button';
import { generateFlutterwaveConfig } from '../services/flutterwaveService';

interface FlutterwaveButtonProps {
    email: string;
    amount: number;
    currency: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    disabled?: boolean;
    onSuccess: (response: any) => void;
    onClose: () => void;
    isLoading?: boolean;
    buttonText: string;
}

const FlutterwaveButton: React.FC<FlutterwaveButtonProps> = ({
    email,
    amount,
    currency,
    planId,
    billingCycle,
    disabled,
    onSuccess,
    onClose,
    isLoading,
    buttonText
}) => {
    const config = generateFlutterwaveConfig(email, amount, currency, planId, billingCycle);

    const handleFlutterPayment = useFlutterwave(config);

    const handleClick = () => {
        if (planId === 'free') {
            onSuccess({ transaction_id: 'free-switch' });
        } else {
            handleFlutterPayment({
                callback: (response) => {
                    closePaymentModal();
                    if (response.status === 'successful') {
                        onSuccess(response);
                    } else {
                        onClose();
                    }
                },
                onClose: () => {
                    onClose();
                },
            });
        }
    };

    return (
        <Button
            className="w-full bg-gradient-accent"
            onClick={handleClick}
            disabled={disabled || isLoading}
        >
            {isLoading ? 'Processing...' : buttonText}
        </Button>
    );
};

export default FlutterwaveButton;

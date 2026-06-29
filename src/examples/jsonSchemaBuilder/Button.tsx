import React, { type ReactNode } from "react";

interface ButtonProps {
    title?: string;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onClick?: any;
    children: ReactNode
    type?: "button" | "submit" | "reset" | undefined;
}

const Button: React.FC<ButtonProps> = ({ title, disabled = false, className, style, onClick, children, type = 'button' }) => {

    const handleClick = () => {
        if (onClick)
            onClick();
    }

    return (
        <button
            onClick={handleClick}
            type={type}
            style={style}
            className={`
                disabled:opacity-50 
                disabled:cursor-not-allowed 
                cursor-pointer 
                flex items-center 
                gap-2 px-3 py-2 
                text-sm font-medium 
                text-gray-700 
                bg-gray-100 
                rounded-lg 
                hover:bg-gray-200 
                transition-colors 
                ${className}
                `}
            title={title || ''}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default Button;


import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'bn';

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    language: Language;
    setLanguage: (language: Language) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem('voicebook-theme') as Theme) || 'light';
    });
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('voicebook-language') as Language) || 'en';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        
        localStorage.setItem('voicebook-theme', theme);
    }, [theme]);
    
    useEffect(() => {
        localStorage.setItem('voicebook-language', language);
    }, [language]);

    const setTheme = (newTheme: Theme) => setThemeState(newTheme);
    const setLanguage = (newLanguage: Language) => setLanguageState(newLanguage);

    const value = {
        theme,
        setTheme,
        language,
        setLanguage,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

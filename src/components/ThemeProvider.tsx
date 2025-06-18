import React, { createContext, useContext, useEffect, useState } from 'react';
import '../styles/theme-provider.css';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: Theme;
	actualTheme: 'light' | 'dark';
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>('system');
	const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

	useEffect(() => {
		const savedTheme = localStorage.getItem('simple-request-theme') as Theme;
		if (savedTheme) {
			setTheme(savedTheme);
		}
	}, []);

	useEffect(() => {
		const updateActualTheme = () => {
			if (theme === 'system') {
				const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				setActualTheme(systemPrefersDark ? 'dark' : 'light');
			} else {
				setActualTheme(theme);
			}
		};

		updateActualTheme();

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', updateActualTheme);

		return () => mediaQuery.removeEventListener('change', updateActualTheme);
	}, [theme]);

	const handleSetTheme = (newTheme: Theme) => {
		setTheme(newTheme);
		localStorage.setItem('simple-request-theme', newTheme);
	};

	const toggleTheme = () => {
		if (theme === 'light') {
			handleSetTheme('dark');
		} else if (theme === 'dark') {
			handleSetTheme('system');
		} else {
			handleSetTheme('light');
		}
	};

	return (
		<ThemeContext.Provider value={{
			theme,
			actualTheme,
			setTheme: handleSetTheme,
			toggleTheme
		}}>
			<div className={`theme-transition ${theme === 'system' ? 'system-theme' : ''}`}>
				{children}
			</div>
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
import { create } from 'zustand';

const stored = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initDark = stored ? stored === 'dark' : prefersDark;

document.documentElement.setAttribute('data-theme', initDark ? 'dark' : 'light');

const useThemeStore = create((set) => ({
    isDark: initDark,
    toggleTheme: () => set((state) => {
        const newIsDark = !state.isDark;
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', newIsDark ? 'dark' : 'light');
        return { isDark: newIsDark };
    }),
}));

export default useThemeStore;
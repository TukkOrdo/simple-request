module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				background: "var(--color-background)",
				foreground: "var(--color-foreground)",
				muted: "var(--color-muted)",
				"muted-foreground": "var(--color-muted-foreground)",
				border: "var(--color-border)",
				input: "var(--color-input)",
				primary: "var(--color-primary)",
				"primary-foreground": "var(--color-primary-foreground)",
				secondary: "var(--color-secondary)",
				"secondary-foreground": "var(--color-secondary-foreground)",
				accent: "var(--color-accent)",
				"accent-foreground": "var(--color-accent-foreground)",
				destructive: "var(--color-destructive)",
				"destructive-foreground": "var(--color-destructive-foreground)",
				ring: "var(--color-ring)",
				success: "var(--color-success)",
				warning: "var(--color-warning)",
				error: "var(--color-error)"
			}
		}
	},
	plugins: [],
};
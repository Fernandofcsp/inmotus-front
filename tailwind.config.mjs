/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
	theme: {
		extend: {
			keyframes: {
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-18px)' },
				},
				floatSlow: {
					'0%, 100%': { transform: 'translateY(0px) scale(1)' },
					'50%': { transform: 'translateY(-24px) scale(1.05)' },
				},
				slideDown: {
					'0%': { opacity: '0', transform: 'translateY(-16px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				pulseSoft: {
					'0%, 100%': { opacity: '0.15' },
					'50%': { opacity: '0.30' },
				},
			},
			animation: {
				'float': 'float 6s ease-in-out infinite',
				'float-slow': 'floatSlow 9s ease-in-out infinite',
				'slide-down': 'slideDown 0.5s ease-out both',
				'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
			},
		},
	},
	plugins: [],
}

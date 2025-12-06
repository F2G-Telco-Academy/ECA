import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        dark: '#1e293b',
        darker: '#0f172a',
      },
    },
  },
  plugins: [],
}
export default config

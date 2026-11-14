/** @type {import('tailwindcss').Config} */
// Bảng màu dịu nhẹ, hiện đại & quen thuộc với khách hàng cho SmartCV:
// Kết hợp hài hòa giữa Tím Lam dịu (Soft Indigo-Periwinkle) + Xanh Lam Ngọc trầm mát (Soft Classic Cool Teal/Slate) trên nền Trắng ngọc trai sáng sạch (#f8f9fc)
const softPeriwinkleIndigo = {
  50: '#f4f6ff',
  100: '#e9edfe',
  200: '#d5ddfd',
  300: '#b3c2fa',
  400: '#889df4',
  500: '#6378eb',
  600: '#4f61dc',
  700: '#414fc2',
  800: '#36429e',
  900: '#303a7e',
  950: '#1e234d',
};

const softClassicBlue = {
  50: '#f3f7fe',
  100: '#e6effd',
  200: '#cde0fb',
  300: '#a7c7f7',
  400: '#78a6f0',
  500: '#4f85e8',
  600: '#3b6cd6',
  700: '#2f57b8',
  800: '#2a4896',
  900: '#273e78',
  950: '#1b284b',
};

const softIrisLavender = {
  50: '#f5f4ff',
  100: '#eceafe',
  200: '#dad6fd',
  300: '#beb6fb',
  400: '#9c8df6',
  500: '#7a67ee',
  600: '#634fe0',
  700: '#523fc4',
  800: '#4435a0',
  900: '#392e80',
  950: '#221a50',
};

const softCalmTeal = {
  50: '#f2f9fa',
  100: '#e2f2f5',
  200: '#c7e5ec',
  300: '#9cd0dc',
  400: '#69b3c5',
  500: '#4396ab',
  600: '#327b8e',
  700: '#2b6474',
  800: '#275360',
  900: '#244651',
  950: '#142d36',
};

const softSageMint = {
  50: '#f3faf7',
  100: '#e3f4ed',
  200: '#c7e8db',
  300: '#9dd5c0',
  400: '#6cb99e',
  500: '#469d80',
  600: '#348167',
  700: '#2b6854',
  800: '#255345',
  900: '#20453a',
  950: '#112721',
};

const coolPearlSlate = {
  50: '#f8f9fc',
  100: '#f1f4f9',
  200: '#e2e7f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#080d1a',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: softPeriwinkleIndigo,
        sky: softPeriwinkleIndigo,
        blue: softClassicBlue,
        indigo: softIrisLavender,
        cyan: softCalmTeal,
        teal: softCalmTeal,
        emerald: softSageMint,
        green: softSageMint,
        lime: softSageMint,
        slate: coolPearlSlate,
      },
    },
  },
  plugins: [],
};

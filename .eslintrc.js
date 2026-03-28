module.exports = {
  overrides: [
    {
      files: ['src/**/*.{js,jsx,ts,tsx}'],
      rules: {
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: 'Use apiRequest() instead of fetch()',
          },
        ],
      },
    },
  ],
}

export default {
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tools/', 'node_modules/']
    }
  }
};
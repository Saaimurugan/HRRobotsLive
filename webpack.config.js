const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // Face-api.js and ML models
        faceapi: {
          test: /[\\/]node_modules[\\/](face-api\.js|@tensorflow)[\\/]/,
          name: 'faceapi',
          priority: 20,
          reuseExistingChunk: true,
        },
        // PDF processing
        pdf: {
          test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
          name: 'pdf',
          priority: 15,
          reuseExistingChunk: true,
        },
        // Common chunks
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    // Enable tree shaking
    usedExports: true,
    sideEffects: false,
  },

  performance: {
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
  },

  plugins: [
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
};

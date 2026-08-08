const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    publicPath: '/',
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
      },
    ]
  },
  
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
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
    // Generate HTML file
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
    }),
  ],
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,
  },
};

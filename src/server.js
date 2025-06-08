const App = require('./app');

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

try {
    const app = new App();
    app.start();
} catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
}
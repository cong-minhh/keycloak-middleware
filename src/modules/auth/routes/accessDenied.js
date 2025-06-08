/**
 * Access Denied route handler
 */

const express = require('express');

/**
 * Creates and returns the access denied route
 * 
 * @returns {express.Router} Express router with access denied route
 */
module.exports = () => {
    const router = express.Router();

    /**
     * Access Denied route
     * Renders a custom access denied page with appropriate HTTP status
     */
    router.get('/', (req, res) => {
        // Set status code to 403 Forbidden
        res.status(403);
        console.log('Access Denied');
        // Check if the request accepts HTML
        if (req.accepts('html')) {
            // Send HTML response
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Access Denied</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                            color: #333;
                            text-align: center;
                            padding: 50px 20px;
                            margin: 0;
                        }
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            background-color: #fff;
                            border-radius: 8px;
                            padding: 30px;
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                            color: #e74c3c;
                            margin-bottom: 20px;
                        }
                        p {
                            margin-bottom: 20px;
                            line-height: 1.6;
                        }
                        .btn {
                            display: inline-block;
                            background-color: #3498db;
                            color: #fff;
                            padding: 10px 20px;
                            border-radius: 4px;
                            text-decoration: none;
                            margin: 10px 5px;
                            transition: background-color 0.3s;
                        }
                        .btn:hover {
                            background-color: #2980b9;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Access Denied</h1>
                        <p>You do not have permission to access this resource.</p>
                        <p>If you believe this is an error, please contact your administrator.</p>
                        <div>
                            <a href="/" class="btn">Return to Home</a>
                            <a href="/logout" class="btn">Logout</a>
                        </div>
                    </div>
                </body>
                </html>
            `);
        } else {
            // Send JSON response for API requests
            res.json({
                status: 'error',
                errorCode: 'AUTHORIZATION_ERROR',
                message: 'You do not have permission to access this resource'
            });
        }
    });

    return router;
};
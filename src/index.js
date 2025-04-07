const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const collection = require('./config');
const { connection } = require('mongoose');
const { ObjectId } = require('mongodb');
const Order = require('../models/Order');

const app = express();

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use(express.static("public"));
app.use(express.static("views"));

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Serve HTML files
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../views/home.html'));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, '../views/signup.html'));
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, '../views/home.html'));
});

app.get("/login", (req, res) => {
    // If user is already logged in, redirect to main page
    if (req.session.userId) {
        return res.redirect('/main');
    }
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get("/recipes", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/recipes.html'));
});

app.get("/recipe1", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/recipe1.html'));
});

app.get("/recipe2", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/recipe2.html'));
});

app.get("/recipe3", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/recipe3.html'));
});

app.get("/recipe4", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/recipe4.html'));
});

app.get("/main", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/main.html'));
});

app.get("/pizza", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/pizza.html'));
});

app.get("/cart", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/cart.html'));
});

// Order API Endpoints
app.post("/api/orders", requireLogin, async (req, res) => {
    try {
        const { items, total, subtotal, tax } = req.body;
        
        // Validate order data
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Invalid order data" });
        }

        // Create new order using the Order model
        const order = new Order({
            userId: req.session.userId,
            items: items,
            subtotal: subtotal,
            tax: tax,
            total: total,
            date: new Date()
        });

        // Save order to database
        await order.save();
        console.log('Order saved successfully:', order);
        
        res.status(201).json({
            message: "Order placed successfully",
            orderId: order._id
        });
    } catch (error) {
        console.error("Order creation error:", error);
        res.status(500).json({ message: "Error creating order" });
    }
});

app.get("/api/orders", requireLogin, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.session.userId }).sort({ date: -1 });
        console.log('Fetched orders:', orders);
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Error fetching orders" });
    }
});

app.get("/api/orders/:orderId", requireLogin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.json(order);
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ message: "Error fetching order" });
    }
});

app.post("/signup", async(req, res) => {
    try {
        const data = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            password: req.body.password,
        }

        const existingUser = await collection.findOne({ email: data.email });
        if (existingUser) {
            return res.send("User already exists. Please try logging in.");
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashedPassword;
        
        const userdata = await collection.insertMany(data);
        console.log("New user created:", userdata);
        res.redirect("/login"); // Redirect to login page after successful signup
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).send("An error occurred during signup. Please try again.");
    }
});

app.get("/profile", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/profile.html'));
});

app.post("/profile", requireLogin, async(req, res) => {
    var user = await collection.findOne({email: req.session.email});
    console.log(user.firstname, user.lastname);
    res.send({userId: req.session.userId, 
    email: req.session.email, 
    firstName: user.firstname, 
    lastName: user.lastname});
});

app.post("/login", async(req, res) => {
    try {
        const check = await collection.findOne({ email: req.body.email });
        if (!check) {
            return res.send("User not found. Please check your email or sign up.");
        }
        
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            return res.send("Wrong password. Please try again.");
        }
        
        // Set session
        req.session.userId = check._id;
        req.session.email = check.email;
        console.log("User logged in:", check.email);
        
        res.redirect("/main");
    } catch (error) {
        console.error("Login error:", error);
        res.send("An error occurred during login. Please try again.");
    }
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Error logging out");
        }
        res.redirect("/login");
    });
});

// Check session status
app.get("/api/check-session", (req, res) => {
    res.json({
        isLoggedIn: !!req.session.userId,
        userId: req.session.userId,
        email: req.session.email
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

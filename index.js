const express = require('express');
const app = express();
const cors = require('cors');
const userModel = require('./model/userModel');
const blogModel = require('./model/blogModel');
require('dotenv').config();
const Port = process.env.PORT;
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = require('./multerStorage');
const nodemailer = require('nodemailer');





app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads' ,express.static(path.join(__dirname, 'uploads')));


app.use(cors({origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


//
// Middleware to verify JWT token
// const verifyToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//         return res.status(401).json({ message: "Access denied. No token provided." });
//     }
//     try {
//         const token = authHeader.split(' ')[1];
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.userId = decoded.userId;
//         next();
//     } catch (error) {
//         // This will catch expired tokens, malformed tokens, etc.
//         return res.status(401).json({ message: "Access denied. Invalid token." });
//     }
// };


//nodeMailer

app.post('/verify-email', async (req, res) => {
    const {email} = req.body;
    console.log('data:', email)
    
    const otp = Math.floor(100000 + Math.random() * 900000);

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification',
        text: `Your one time password is: ${otp}`
      }
      console.log(mailOptions);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            
          console.log("Error sending email: ",error)
          return res.status(500).json({ message: "Error sending email", error: error.messages});
        }
        console.log("Email sent: ", info.response);
        res.status(200).json({
          message: "Email sent successfully",
          otp: otp
        })
    })
    }catch (error) {
        console.error("Error sending email:", error);
    }
})




app.get('/users', async (req, res) => {
    try {
        const user = await userModel.find().select('-password').populate('blog');
        res.json({
            message: "Welcome to the User API",
            users: user
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
});


app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        });
        await newUser.save();
        const userresponse = {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            blog: newUser.blog
        };
        res.status(201).json({
            message: "User registered successfully",
            user: userresponse
        });
        console.log("User created successfully:", userresponse);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
});



app.post('/login',async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Login attempt with email:", email, " and password:", password);
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token =jwt.sign({
            userId: user._id,
            email: user.email
        },process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            blog: user.blog
        };

        res.json({
            message: "Login successful",
            user: userResponse,
            token: token
        });
        console.log("User logged in successfully:", userResponse);
        console.log("Token generated:", token);
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Error during login", error: error.message });
    }
});



// create blog
app.post('/blogs/:id',upload.single('image') ,async (req, res) => {
    try{
        const { title, content } = req.body;
        const image =`/uploads/${req.file.filename}`;
        console.log("Image path:", image);
        const userId = req.params.id;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const newBlog = new blogModel({
            title: title,
            content: content,
            user: userId,
            image: image
        });
        user.blog.push(newBlog._id);
        await newBlog.save();
        await user.save();
        res.status(201).json({
            message: "Blog created successfully",
            blog: newBlog
        });
        console.log("Blog created successfully:", newBlog);
    }catch (error) {
        console.error("Error creating blog:", error);
        res.status(500).json({ message: "Server error during blog creation", error: error.message });
    }
});




// get blog by user id
app.get("/blogs/:userId", async (req, res) => {
  // More RESTful route
  try {
    const { userId } = req.params;
    const user = await userModel.findById(userId).populate("blog");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      name: user.name,
      message: "User blogs fetched successfully",
      blogs: user.blog,
    });
    console.log("User blogs fetched successfully", user.blog);
  } catch (error) {
    res.status(500).json({
      message: "Server error during fetching user blogs",
      error: error.message,
    });
  }
});


// get all blogs
app.get("/blogs", async (req, res) => {
    try {
        const blogs = await blogModel.find().populate("user", "name email");
        res.json({
            message: "All blogs fetched successfully",
            blogs: blogs,
        });
        console.log("All blogs fetched successfully", blogs);
    } catch (error) {
        res.status(500).json({
            message: "Server error during fetching all blogs",
            error: error.message,
        });
    }
});

// Update blog
app.put('/blogs/:blogId',upload.single('image') ,async (req, res) => {
    try{
        const blogId = req.params.blogId;
        const { title, content , image} = req.body;
        const blog = await blogModel.findById(blogId);

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        const updatedBlog = await blogModel.findByIdAndUpdate(
          blogId,
          { title, content , image},
          { new: true }
        );

        res.status(200).json({
            message: "Blog updated successfully",
            blog: updatedBlog
        });
    }catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ message: "Server error during blog update", error: error.message });
    }
});
    
    
// Delete blog
app.delete('/blogs/:blogId', async (req, res) => {
    try {
        const blogId = req.params.blogId;
        const blog = await blogModel.findById(blogId);
        await blogModel.findOneAndDelete({_id: blogId});

        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        const userId = blog.user.toString();
        
        console.log("Blog deleted successfully:", blog);
        res.status(200).json({
            message: "Blog deleted successfully",
            blog: blog
        });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ message: "Server error during blog deletion", error: error.message });
    }
});


// Middleware to check authentication   



app.listen(Port, () => {
    console.log(`Server is running on port ${Port}`);
});